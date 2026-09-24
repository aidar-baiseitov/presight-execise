import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createTestDb } from "./helpers.js";

const db = createTestDb(500);
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createApp(db).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
});

async function get(path: string) {
  const response = await fetch(`${baseUrl}${path}`);
  // Response shapes are asserted field by field below, so `any` is enough here.
  return { status: response.status, body: (await response.json()) as any };
}

describe("HTTP API", () => {
  it("GET /api/health reports the user count", async () => {
    expect(await get("/api/health")).toEqual({ status: 200, body: { ok: true, users: 500 } });
  });

  it("GET /api/users reads repeated query params as lists", async () => {
    const { status, body } = await get("/api/users?hobby=Reading&hobby=Cooking&pageSize=5");
    expect(status).toBe(200);
    expect(body.meta.pageSize).toBe(5);
    for (const user of body.data) {
      expect(user.hobbies).toEqual(expect.arrayContaining(["Reading", "Cooking"]));
    }
  });

  it("GET /api/facets returns top values with counts", async () => {
    const { status, body } = await get("/api/facets?q=a");
    expect(status).toBe(200);
    expect(body.hobbies.length).toBe(20);
    expect(body.hobbies[0]).toEqual({ value: expect.any(String), count: expect.any(Number) });
  });

  it("rejects invalid query params with 400 and field details", async () => {
    const { status, body } = await get("/api/users?sort=password&pageSize=1000");
    expect(status).toBe(400);
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(body.error.details.map((detail: { field: string }) => detail.field)).toEqual(
      expect.arrayContaining(["sort", "pageSize"]),
    );
  });

  it("returns a JSON 404 for unknown API routes", async () => {
    const { status, body } = await get("/api/nope");
    expect(status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
