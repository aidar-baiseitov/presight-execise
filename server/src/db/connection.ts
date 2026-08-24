import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.js";

let instance: Database.Database | null = null;

/** Opens (and memoises) the SQLite connection, creating the containing directory if needed. */
export function getDb(): Database.Database {
  if (instance) return instance;

  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

  const db = new Database(config.databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  instance = db;
  return db;
}

/** True once the schema exists and holds at least one user. */
export function isSeeded(db: Database.Database = getDb()): boolean {
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get();
  if (!table) return false;
  const row = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  return row.count > 0;
}

export function countUsers(db: Database.Database = getDb()): number {
  const row = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  return row.count;
}
