import type BetterSqlite3 from "better-sqlite3";
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

/** Every query starts from the same row source: one row per user, with its nationality name. */
const FROM_USERS = `FROM users u JOIN nationalities n ON n.id = u.nationality_id`;

/** Escapes LIKE wildcards so a literal `%` or `_` in user input cannot widen the match. */
function likePattern(value: string): string {
  const escaped = value.replace(/[\\%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}

function placeholders(count: number): string {
  return new Array(count).fill("?").join(", ");
}

interface FilterSql {
  /** `WHERE ...` clause over `FROM_USERS`, or an empty string when no filter is active. */
  where: string;
  params: unknown[];
}

/**
 * Single source of truth for filter semantics, reused by the list, the total count and both
 * facet queries so the sidebar can never disagree with the list.
 *
 * - text: substring match on first_name OR last_name (SQLite LIKE is ASCII case-insensitive)
 * - nationalities: OR (user is from any selected nationality)
 * - hobbies: AND (user has every selected hobby)
 *
 * Values are always bound as `?` parameters, never concatenated into the SQL string.
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

  const nationalities = [...new Set(filters.nationalities)];
  if (nationalities.length > 0) {
    conditions.push(`n.name IN (${placeholders(nationalities.length)})`);
    params.push(...nationalities);
  }

  // "Has all N selected hobbies": keep only the user's rows for the selected hobbies, group them
  // per user and require exactly N rows. The (user_id, hobby_id) primary key rules out duplicates,
  // so COUNT(*) = N can only mean every selected hobby matched.
  const hobbies = [...new Set(filters.hobbies)];
  if (hobbies.length > 0) {
    conditions.push(
      `u.id IN (
        SELECT user_id
        FROM user_hobbies
        WHERE hobby_id IN (SELECT id FROM hobbies WHERE name IN (${placeholders(hobbies.length)}))
        GROUP BY user_id
        HAVING COUNT(*) = ?
      )`,
    );
    params.push(...hobbies, hobbies.length);
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join("\n  AND ")}` : "",
    params,
  };
}

/**
 * `COLLATE NOCASE` makes "adam" and "Adam" sort together. The name indexes in `schema.ts` are
 * declared with the same collation, otherwise SQLite could not use them for ORDER BY.
 */
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

  const rows = db
    .prepare(
      `SELECT uh.user_id AS userId, h.name AS name
       FROM user_hobbies uh
       JOIN hobbies h ON h.id = uh.hobby_id
       WHERE uh.user_id IN (${placeholders(userIds.length)})
       ORDER BY uh.user_id, h.name`,
    )
    .all(...userIds) as Array<{ userId: number; name: string }>;

  for (const row of rows) {
    const list = grouped.get(row.userId);
    if (list) list.push(row.name);
    else grouped.set(row.userId, [row.name]);
  }
  return grouped;
}

export function countUsersMatching(db: BetterSqlite3.Database, filters: UserFilters): number {
  const filter = buildFilterSql(filters);
  const row = db
    .prepare(`SELECT COUNT(*) AS count ${FROM_USERS} ${filter.where}`)
    .get(...filter.params) as { count: number };
  return row.count;
}

export function queryUsers(db: BetterSqlite3.Database, query: UserListQuery): UserListResponse {
  const filter = buildFilterSql(query);
  const total = countUsersMatching(db, query);
  const offset = (query.page - 1) * query.pageSize;

  // `id` breaks ties between equal values so every row has one fixed position and OFFSET
  // pagination never repeats or skips a user. It follows the main direction, so a single
  // index on (column, id) can be read forwards for ASC and backwards for DESC.
  const direction = query.order === "desc" ? "DESC" : "ASC";
  const rows = db
    .prepare(
      `SELECT u.id, u.avatar, u.first_name, u.last_name, u.age, n.name AS nationality
       ${FROM_USERS}
       ${filter.where}
       ORDER BY ${SORT_EXPRESSIONS[query.sort]} ${direction}, u.id ${direction}
       LIMIT ? OFFSET ?`,
    )
    .all(...filter.params, query.pageSize, offset) as UserRow[];

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
export function queryFacets(db: BetterSqlite3.Database, filters: UserFilters): FacetsResponse {
  const filter = buildFilterSql(filters);
  const forNationalities = buildFilterSql({ ...filters, nationalities: [] });

  // One row per (matching user, hobby) pair, grouped by hobby: the count is how many
  // matching users have that hobby.
  const hobbies = db
    .prepare(
      `SELECT h.name AS value, COUNT(*) AS count
       ${FROM_USERS}
       JOIN user_hobbies uh ON uh.user_id = u.id
       JOIN hobbies h ON h.id = uh.hobby_id
       ${filter.where}
       GROUP BY h.id
       ORDER BY count DESC, value ASC
       LIMIT ${FACET_LIMIT}`,
    )
    .all(...filter.params) as FacetValue[];

  const nationalities = db
    .prepare(
      `SELECT n.name AS value, COUNT(*) AS count
       ${FROM_USERS}
       ${forNationalities.where}
       GROUP BY n.id
       ORDER BY count DESC, value ASC
       LIMIT ${FACET_LIMIT}`,
    )
    .all(...forNationalities.params) as FacetValue[];

  return { hobbies, nationalities };
}
