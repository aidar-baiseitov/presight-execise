import { pathToFileURL } from "node:url";
import { faker } from "@faker-js/faker";
import type BetterSqlite3 from "better-sqlite3";
import { config } from "../config.js";
import { getDb } from "./connection.js";
import { DROP_SQL, SCHEMA_SQL } from "./schema.js";
import { HOBBIES } from "./data/hobbies.js";
import { NATIONALITIES } from "./data/nationalities.js";

/** How many hobbies a user gets: 0 to 10, skewed towards a handful. */
const HOBBY_COUNT_WEIGHTS: ReadonlyArray<{ value: number; weight: number }> = [
  { value: 0, weight: 6 },
  { value: 1, weight: 12 },
  { value: 2, weight: 18 },
  { value: 3, weight: 18 },
  { value: 4, weight: 14 },
  { value: 5, weight: 11 },
  { value: 6, weight: 8 },
  { value: 7, weight: 5 },
  { value: 8, weight: 4 },
  { value: 9, weight: 3 },
  { value: 10, weight: 2 },
];

function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
}

/** Picks `count` distinct hobby ids, honouring the weights (rejection sampling on a small pool). */
function pickHobbyIds(count: number, hobbyIds: number[]): number[] {
  if (count <= 0) return [];
  const picked = new Set<number>();
  const max = Math.min(count, hobbyIds.length);
  let guard = 0;
  while (picked.size < max && guard < max * 40) {
    guard += 1;
    const index = faker.helpers.weightedArrayElement(
      HOBBIES.map((hobby, i) => ({ value: i, weight: hobby.weight })),
    );
    const id = hobbyIds[index];
    if (id !== undefined) picked.add(id);
  }
  return [...picked];
}

export function seedDatabase(db: BetterSqlite3.Database, userCount: number): void {
  faker.seed(42); // deterministic dataset across machines and rebuilds

  db.exec(DROP_SQL);
  db.exec(SCHEMA_SQL);

  const insertNationality = db.prepare("INSERT INTO nationalities (name) VALUES (?)");
  const insertHobby = db.prepare("INSERT INTO hobbies (name) VALUES (?)");
  const insertUser = db.prepare(
    "INSERT INTO users (avatar, first_name, last_name, age, nationality_id) VALUES (?, ?, ?, ?, ?)",
  );
  const insertUserHobby = db.prepare("INSERT INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)");

  const run = db.transaction(() => {
    const nationalityIds = NATIONALITIES.map(
      (nationality) => insertNationality.run(nationality.name).lastInsertRowid as number,
    );
    const hobbyIds = HOBBIES.map((hobby) => insertHobby.run(hobby.name).lastInsertRowid as number);

    const nationalityChoices = NATIONALITIES.map((nationality, index) => ({
      value: index,
      weight: nationality.weight,
    }));

    let hobbyLinks = 0;
    for (let i = 0; i < userCount; i += 1) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const nationalityId = nationalityIds[faker.helpers.weightedArrayElement(nationalityChoices)]!;
      const userId = insertUser.run(
        avatarUrl(`${firstName}-${lastName}-${i}`),
        firstName,
        lastName,
        faker.number.int({ min: 18, max: 75 }),
        nationalityId,
      ).lastInsertRowid as number;

      const hobbyCount = faker.helpers.weightedArrayElement(HOBBY_COUNT_WEIGHTS);
      for (const hobbyId of pickHobbyIds(hobbyCount, hobbyIds)) {
        insertUserHobby.run(userId, hobbyId);
        hobbyLinks += 1;
      }
    }
    return hobbyLinks;
  });

  const hobbyLinks = run();

  db.exec("ANALYZE");

  const distinctNationalities = db
    .prepare("SELECT COUNT(DISTINCT nationality_id) AS count FROM users")
    .get() as { count: number };

  console.log(
    [
      `Seeded ${userCount.toLocaleString("en-US")} users into ${config.databasePath}`,
      `  nationalities: ${NATIONALITIES.length} (${distinctNationalities.count} in use)`,
      `  hobbies:       ${HOBBIES.length}`,
      `  hobby links:   ${hobbyLinks.toLocaleString("en-US")} (avg ${(hobbyLinks / userCount).toFixed(2)} per user)`,
    ].join("\n"),
  );
}

const entrypoint = process.argv[1];
const invokedDirectly = entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;

if (invokedDirectly) {
  seedDatabase(getDb(), config.seedUsers);
}
