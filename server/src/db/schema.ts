/**
 * Normalised schema: hobbies and nationalities live in their own tables so that
 * facet counts and "match all selected hobbies" are exact set operations rather
 * than string matching.
 */

/**
 * Stored in SQLite's `PRAGMA user_version`. Bump it whenever `SCHEMA_SQL` changes: a database
 * created with an older version is treated as unseeded and rebuilt on the next start.
 */
export const SCHEMA_VERSION = 2;

export const SCHEMA_SQL = `
CREATE TABLE nationalities (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE hobbies (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE users (
  id             INTEGER PRIMARY KEY,
  avatar         TEXT    NOT NULL,
  first_name     TEXT    NOT NULL,
  last_name      TEXT    NOT NULL,
  age            INTEGER NOT NULL,
  nationality_id INTEGER NOT NULL REFERENCES nationalities(id)
);

CREATE TABLE user_hobbies (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hobby_id INTEGER NOT NULL REFERENCES hobbies(id),
  PRIMARY KEY (user_id, hobby_id)
) WITHOUT ROWID;

-- Sort indexes. Each carries \`id\` so the deterministic tie-breaker stays in the index, and the
-- name columns use the same NOCASE collation as the ORDER BY, otherwise SQLite ignores them.
CREATE INDEX idx_users_first_name ON users(first_name COLLATE NOCASE, id);
CREATE INDEX idx_users_last_name  ON users(last_name COLLATE NOCASE, id);
CREATE INDEX idx_users_age        ON users(age, id);

-- Finds the users of the selected nationalities. Sorting by nationality orders by the name
-- in another table, which no index on \`users\` can serve.
CREATE INDEX idx_users_nationality ON users(nationality_id);

-- Reverse lookup for hobby filtering and hobby facet counts.
CREATE INDEX idx_user_hobbies_hobby ON user_hobbies(hobby_id, user_id);
`;

export const DROP_SQL = `
DROP TABLE IF EXISTS user_hobbies;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS hobbies;
DROP TABLE IF EXISTS nationalities;
`;
