import Database from "better-sqlite3";
import { seedDatabase } from "../src/db/seed.js";
import type { FacetValue, SortField, SortOrder, UserFilters } from "../src/types.js";

/** A fresh in-memory database with the same deterministic data as `yarn seed`. */
export function createTestDb(userCount = 2_000): Database.Database {
  const db = new Database(":memory:");
  seedDatabase(db, userCount, { log: false });
  return db;
}

export interface PlainUser {
  id: number;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  hobbies: string[];
}

/** Loads every user into memory so tests can compute the expected answer in plain JS. */
export function loadAllUsers(db: Database.Database): PlainUser[] {
  const users = db
    .prepare(
      `SELECT u.id, u.first_name, u.last_name, u.age, n.name AS nationality
       FROM users u JOIN nationalities n ON n.id = u.nationality_id`,
    )
    .all() as Omit<PlainUser, "hobbies">[];
  const links = db
    .prepare(
      `SELECT uh.user_id AS userId, h.name AS name
       FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id`,
    )
    .all() as Array<{ userId: number; name: string }>;

  const byId = new Map(users.map((user) => [user.id, { ...user, hobbies: [] as string[] }]));
  for (const link of links) byId.get(link.userId)?.hobbies.push(link.name);
  return [...byId.values()];
}

/** SQLite NOCASE folds only ASCII letters. */
function foldCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

/** Reference implementation of the filter rules from the brief. */
export function matchesFilters(user: PlainUser, filters: UserFilters): boolean {
  const q = foldCase(filters.q.trim());
  if (q && !foldCase(user.first_name).includes(q) && !foldCase(user.last_name).includes(q)) {
    return false;
  }
  if (filters.nationalities.length > 0 && !filters.nationalities.includes(user.nationality)) {
    return false;
  }
  return filters.hobbies.every((hobby) => user.hobbies.includes(hobby));
}

/** Reference implementation of the sort: chosen field, then `id` in the same direction. */
export function compareUsers(sort: SortField, order: SortOrder) {
  const sign = order === "asc" ? 1 : -1;
  return (a: PlainUser, b: PlainUser): number => {
    const left = sort === "age" ? a.age : foldCase(a[sort]);
    const right = sort === "age" ? b.age : foldCase(b[sort]);
    if (left < right) return -sign;
    if (left > right) return sign;
    return (a.id - b.id) * sign;
  };
}

/** Reference implementation of a facet: count per value, top N by count then value. */
export function topValues(values: string[], limit = 20): FacetValue[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || (a.value < b.value ? -1 : a.value > b.value ? 1 : 0))
    .slice(0, limit);
}
