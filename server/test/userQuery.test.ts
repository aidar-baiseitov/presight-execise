import { afterAll, describe, expect, it } from "vitest";
import { queryFacets, queryUsers } from "../src/services/userQuery.js";
import { SORT_FIELDS, SORT_ORDERS, type UserFilters, type UserListQuery } from "../src/types.js";
import { compareUsers, createTestDb, loadAllUsers, matchesFilters, topValues } from "./helpers.js";

const db = createTestDb();
const allUsers = loadAllUsers(db);
afterAll(() => db.close());

const NO_FILTERS: UserFilters = { q: "", nationalities: [], hobbies: [] };

/** Walks every page the way the infinite list does and returns the ids in the order received. */
function fetchAllIds(query: Omit<UserListQuery, "page">): number[] {
  const ids: number[] = [];
  for (let page = 1; ; page += 1) {
    const { data, meta } = queryUsers(db, { ...query, page });
    ids.push(...data.map((user) => user.id));
    if (!meta.hasMore) return ids;
  }
}

function expectedIds(filters: UserFilters): Set<number> {
  return new Set(allUsers.filter((user) => matchesFilters(user, filters)).map((user) => user.id));
}

function listQuery(filters: UserFilters): UserListQuery {
  return { ...filters, sort: "first_name", order: "asc", page: 1, pageSize: 100 };
}

describe("filters", () => {
  it("text filter matches first or last name, case-insensitively", () => {
    const filters = { ...NO_FILTERS, q: "an" };
    const { data, meta } = queryUsers(db, listQuery(filters));

    expect(meta.total).toBe(expectedIds(filters).size);
    expect(meta.total).toBeGreaterThan(0);
    for (const user of data) {
      expect(`${user.first_name}|${user.last_name}`.toLowerCase()).toContain("an");
    }
    expect(queryUsers(db, listQuery({ ...NO_FILTERS, q: "AN" })).meta.total).toBe(meta.total);
  });

  it("treats % and _ in the text filter literally", () => {
    expect(queryUsers(db, listQuery({ ...NO_FILTERS, q: "%" })).meta.total).toBe(0);
    expect(queryUsers(db, listQuery({ ...NO_FILTERS, q: "_" })).meta.total).toBe(0);
  });

  it("several nationalities match users from ANY of them", () => {
    const filters = { ...NO_FILTERS, nationalities: ["American", "Indian"] };
    const { data, meta } = queryUsers(db, listQuery(filters));

    expect(meta.total).toBe(expectedIds(filters).size);
    expect(meta.total).toBeGreaterThan(
      queryUsers(db, listQuery({ ...NO_FILTERS, nationalities: ["American"] })).meta.total,
    );
    for (const user of data) expect(["American", "Indian"]).toContain(user.nationality);
  });

  it("several hobbies match users that have ALL of them", () => {
    const filters = { ...NO_FILTERS, hobbies: ["Reading", "Cooking"] };
    const { data, meta } = queryUsers(db, listQuery(filters));

    expect(meta.total).toBe(expectedIds(filters).size);
    expect(meta.total).toBeGreaterThan(0);
    expect(meta.total).toBeLessThan(
      queryUsers(db, listQuery({ ...NO_FILTERS, hobbies: ["Reading"] })).meta.total,
    );
    for (const user of data) expect(user.hobbies).toEqual(expect.arrayContaining(filters.hobbies));
  });

  it("combines text, nationality and hobby filters with AND", () => {
    const filters = { q: "a", nationalities: ["American", "Chinese"], hobbies: ["Reading"] };
    expect(queryUsers(db, listQuery(filters)).meta.total).toBe(expectedIds(filters).size);
  });

  it("returns an empty page for an unknown hobby", () => {
    const { data, meta } = queryUsers(db, listQuery({ ...NO_FILTERS, hobbies: ["Nope"] }));
    expect(data).toEqual([]);
    expect(meta).toMatchObject({ total: 0, hasMore: false });
  });
});

describe("sorting and pagination", () => {
  const filterCases: UserFilters[] = [NO_FILTERS, { q: "e", nationalities: [], hobbies: ["Reading"] }];

  for (const filters of filterCases) {
    for (const sort of SORT_FIELDS) {
      for (const order of SORT_ORDERS) {
        it(`${sort} ${order}${filters === NO_FILTERS ? "" : " (filtered)"}: every user exactly once, in order`, () => {
          // An odd page size makes page boundaries fall between users with equal sort values.
          const ids = fetchAllIds({ ...filters, sort, order, pageSize: 37 });
          const expected = allUsers
            .filter((user) => matchesFilters(user, filters))
            .sort(compareUsers(sort, order))
            .map((user) => user.id);

          expect(ids).toEqual(expected);
        });
      }
    }
  }

  it("reports pagination metadata", () => {
    const { meta } = queryUsers(db, { ...listQuery(NO_FILTERS), pageSize: 30 });
    expect(meta).toEqual({
      page: 1,
      pageSize: 30,
      total: allUsers.length,
      totalPages: Math.ceil(allUsers.length / 30),
      hasMore: true,
    });

    const last = queryUsers(db, { ...listQuery(NO_FILTERS), pageSize: 30, page: meta.totalPages });
    expect(last.meta.hasMore).toBe(false);
    expect(last.data.length).toBe(allUsers.length - 30 * (meta.totalPages - 1));
  });
});

describe("facets", () => {
  const facetCases: UserFilters[] = [
    NO_FILTERS,
    { q: "an", nationalities: [], hobbies: [] },
    { q: "", nationalities: ["American", "Indian"], hobbies: ["Reading"] },
  ];

  for (const filters of facetCases) {
    it(`matches the reference counts for ${JSON.stringify(filters)}`, () => {
      const facets = queryFacets(db, filters);
      const matching = allUsers.filter((user) => matchesFilters(user, filters));
      // The nationality facet ignores its own selection, so other nationalities stay selectable.
      const matchingIgnoringNationality = allUsers.filter((user) =>
        matchesFilters(user, { ...filters, nationalities: [] }),
      );

      expect(facets.hobbies).toEqual(topValues(matching.flatMap((user) => user.hobbies)));
      expect(facets.nationalities).toEqual(
        topValues(matchingIgnoringNationality.map((user) => user.nationality)),
      );
      expect(facets.hobbies.length).toBeLessThanOrEqual(20);
      expect(facets.nationalities.length).toBeLessThanOrEqual(20);
    });
  }

  it("a selected hobby counts every user in the result set", () => {
    const filters = { ...NO_FILTERS, hobbies: ["Reading"] };
    const total = queryUsers(db, listQuery(filters)).meta.total;
    expect(queryFacets(db, filters).hobbies[0]).toEqual({ value: "Reading", count: total });
  });
});
