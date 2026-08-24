import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Package root, both when running from `src` (tsx) and from `dist` (compiled). */
const packageRoot = path.resolve(here, "..");

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: intFromEnv("PORT", 4000),
  /** SQLite file. Defaults to `server/data/users.db`, overridden in Docker to `/data/users.db`. */
  databasePath: process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(packageRoot, "data", "users.db"),
  /** Number of users created by the seed script. */
  seedUsers: intFromEnv("SEED_USERS", 1_000),
  /**
   * Built client assets, served by Express in production. The default resolves to
   * `client/dist`, which is where `yarn build` puts them both locally and in the image.
   */
  publicDir: process.env.PUBLIC_DIR
    ? path.resolve(process.env.PUBLIC_DIR)
    : path.join(packageRoot, "..", "client", "dist"),
} as const;
