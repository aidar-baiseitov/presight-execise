import type BetterSqlite3 from "better-sqlite3";
import { getDb } from "../db/connection.js";
import type {
  FacetValue,
  FacetsResponse,
  PaginationMeta,
  SortField,
  UserDto,
  UserFilters,
  UserListQuery,
  UserListResponse,
} from "../types.js";

export const FACET_LIMIT = 20;

/** better-sqlite3 does not cache prepared statements; SQL text is stable per filter arity. */
const statementCache = new Map<string, BetterSqlite3.Statement>();

function prepare(db: BetterSqlite3.Database, sql: string): BetterSqlite3.Statement {
  let statement = statementCache.get(sql);
  if (!statement) {
    statement = db.prepare(sql);
    statementCache.set(sql, statement);
  }
  return statement;
}

/** Escapes LIKE wildcards so a literal `%` or `_` in user input cannot widen the match. */
function likePattern(value: string): string {
  const escaped = value.replace(/[\\%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}

function placeholders(count: number): string {
  return new Array(count).fill("?").join(", ");
}

interface FilterSql {
  /** `SELECT u.id AS id FROM ... WHERE ...` — the set of users matching every active filter. */
  cte: string;
  params: unknown[];
}

/**
 * Single source of truth for filter semantics, reused by the list, the total count and both
 * facet queries so the sidebar can never disagree with the list.
 *
 * - text: substring match on first_name OR last_name (SQLite LIKE is ASCII case-insensitive)
 * - nationalities: OR (user is from any selected nationality)
 * - hobbies: AND (user has every selected hobby)
 */
function buildFilterSql(filters: UserFilters): FilterSql {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const q = filters.q.trim();
  if (q.length > 0) {
    const pattern = likePattern(q);
    conditions.push(`(u.first_name LIKE ? ESCAPE '\\' OR u.last_name LIKE ? ESCAPE '\\')`);
    params.push(pattern, pattern);
  }

  if (filters.nationalities.length > 0) {
    conditions.push(`n.name IN (${placeholders(filters.nationalities.length)})`);
    params.push(...filters.nationalities);
  }

  if (filters.hobbies.length > 0) {
    conditions.push(
      `(
        SELECT COUNT(DISTINCT uh.hobby_id)
        FROM user_hobbies uh
        JOIN hobbies h ON h.id = uh.hobby_id
        WHERE uh.user_id = u.id AND h.name IN (${placeholders(filters.hobbies.length)})
      ) = ?`,
    );
    params.push(...filters.hobbies, filters.hobbies.length);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join("\n    AND ")}` : "";

  return {
    cte: `SELECT u.id AS id
      FROM users u
      JOIN nationalities n ON n.id = u.nationality_id
      ${where}`,
    params,
  };
}

const SORT_EXPRESSIONS: Record<SortField, string> = {
  first_name: "u.first_name COLLATE NOCASE",
  last_name: "u.last_name COLLATE NOCASE",
  age: "u.age",
  nationality: "n.name COLLATE NOCASE",
};

interface UserRow {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
}

/** Fetches every hobby for the current page in one query, then groups in JS (no N+1). */
function hobbiesByUser(db: BetterSqlite3.Database, userIds: number[]): Map<number, string[]> {
  const grouped = new Map<number, string[]>();
  if (userIds.length === 0) return grouped;

  const rows = prepare(
    db,
    `SELECT uh.user_id AS userId, h.name AS name
     FROM user_hobbies uh
     JOIN hobbies h ON h.id = uh.hobby_id
     WHERE uh.user_id IN (${placeholders(userIds.length)})
     ORDER BY uh.user_id, h.name`,
  ).all(...userIds) as Array<{ userId: number; name: string }>;

  for (const row of rows) {
    const list = grouped.get(row.userId);
    if (list) list.push(row.name);
    else grouped.set(row.userId, [row.name]);
  }
  return grouped;
}

export function countUsersMatching(filters: UserFilters, db: BetterSqlite3.Database = getDb()): number {
  const filter = buildFilterSql(filters);
  const row = prepare(db, `WITH filtered AS (${filter.cte}) SELECT COUNT(*) AS count FROM filtered`).get(
    ...filter.params,
  ) as { count: number };
  return row.count;
}

export function queryUsers(query: UserListQuery, db: BetterSqlite3.Database = getDb()): UserListResponse {
  const filter = buildFilterSql(query);
  const total = countUsersMatching(query, db);
  const offset = (query.page - 1) * query.pageSize;

  const direction = query.order === "desc" ? "DESC" : "ASC";
  const rows = prepare(
    db,
    `WITH filtered AS (${filter.cte})
     SELECT u.id, u.avatar, u.first_name, u.last_name, u.age, n.name AS nationality
     FROM filtered f
     JOIN users u ON u.id = f.id
     JOIN nationalities n ON n.id = u.nationality_id
     ORDER BY ${SORT_EXPRESSIONS[query.sort]} ${direction}, u.id ASC
     LIMIT ? OFFSET ?`,
  ).all(...filter.params, query.pageSize, offset) as UserRow[];

  const hobbies = hobbiesByUser(
    db,
    rows.map((row) => row.id),
  );

  const data: UserDto[] = rows.map((row) => ({
    ...row,
    hobbies: hobbies.get(row.id) ?? [],
  }));

  const meta: PaginationMeta = {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    hasMore: offset + rows.length < total,
  };

  return { data, meta };
}

/**
 * Top 20 hobbies and nationalities for the *current* result set.
 *
 * The hobbies facet is self-inclusive: it applies every active filter, including the
 * selected hobbies (AND), so a candidate's count is "how many results if this hobby is
 * also added" — that stays meaningful because hobbies are multi-valued (0-10 per user),
 * so narrowing by one still leaves others to discover.
 *
 * The nationalities facet excludes the nationality selection from its own filter.
 * Nationality is single-valued per user, so self-inclusive filtering would degenerate
 * every time: the moment one nationality is picked, the filtered set *only* contains that
 * nationality, and no other value could ever appear in the facet again — making it
 * impossible to add a second one from the sidebar, even though the list/count endpoints
 * already support OR-matching several nationalities.
 *
 * Ties break on value ASC so the ordering is stable between requests.
 */
export function queryFacets(filters: UserFilters, db: BetterSqlite3.Database = getDb()): FacetsResponse {
  const filter = buildFilterSql(filters);
  const forNationalities = buildFilterSql({ ...filters, nationalities: [] });

  const hobbies = prepare(
    db,
    `WITH filtered AS (${filter.cte})
     SELECT h.name AS value, COUNT(*) AS count
     FROM filtered f
     JOIN user_hobbies uh ON uh.user_id = f.id
     JOIN hobbies h ON h.id = uh.hobby_id
     GROUP BY h.id
     ORDER BY count DESC, value ASC
     LIMIT ${FACET_LIMIT}`,
  ).all(...filter.params) as FacetValue[];

  const nationalities = prepare(
    db,
    `WITH filtered AS (${forNationalities.cte})
     SELECT n.name AS value, COUNT(*) AS count
     FROM filtered f
     JOIN users u ON u.id = f.id
     JOIN nationalities n ON n.id = u.nationality_id
     GROUP BY n.id
     ORDER BY count DESC, value ASC
     LIMIT ${FACET_LIMIT}`,
  ).all(...forNationalities.params) as FacetValue[];

  return { hobbies, nationalities };
}
