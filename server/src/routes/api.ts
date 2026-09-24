import { Router, type Request, type Response, type NextFunction } from "express";
import type BetterSqlite3 from "better-sqlite3";
import { countUsers } from "../db/connection.js";
import { queryFacets, queryUsers } from "../services/userQuery.js";
import { parseFilters, parseListQuery } from "../validation.js";

/** Express 5 forwards rejected promises, but these handlers are synchronous anyway. */
function handle(fn: (req: Request, res: Response) => void) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      fn(req, res);
    } catch (error) {
      next(error);
    }
  };
}

/** The database is passed in rather than imported, so tests can run against their own copy. */
export function createApiRouter(db: BetterSqlite3.Database): Router {
  const router = Router();

  router.get(
    "/health",
    handle((_req, res) => {
      res.json({ ok: true, users: countUsers(db) });
    }),
  );

  /** Paginated, filtered, sorted users. */
  router.get(
    "/users",
    handle((req, res) => {
      res.json(queryUsers(db, parseListQuery(req.query)));
    }),
  );

  /** Top 20 hobbies and nationalities for the same filter state as /users. */
  router.get(
    "/facets",
    handle((req, res) => {
      res.json(queryFacets(db, parseFilters(req.query)));
    }),
  );

  return router;
}
