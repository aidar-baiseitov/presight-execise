import { createApp } from "./app.js";
import { config } from "./config.js";
import { getDb, isSeeded } from "./db/connection.js";
import { seedDatabase } from "./db/seed.js";

const db = getDb();

// Convenience for `docker compose up` and first local runs: an empty database, or one created
// by an older schema version, seeds itself.
// Set AUTO_SEED=0 to disable.
if (!isSeeded(db)) {
  if (process.env.AUTO_SEED === "0") {
    console.warn(
      `Database at ${config.databasePath} is empty or outdated. Run "yarn seed" to populate it.`,
    );
  } else {
    console.log(
      `Database at ${config.databasePath} is empty or outdated, seeding ${config.seedUsers} users...`,
    );
    seedDatabase(db, config.seedUsers);
  }
}

const server = createApp(db).listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
