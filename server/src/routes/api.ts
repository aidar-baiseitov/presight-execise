import { Router, type Request, type Response, type NextFunction } from "express";
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

export const apiRouter: Router = Router();

apiRouter.get(
  "/health",
  handle((_req, res) => {
    res.json({ ok: true, users: countUsers() });
  }),
);

/** Paginated, filtered, sorted users. */
apiRouter.get(
  "/users",
  handle((req, res) => {
    res.json(queryUsers(parseListQuery(req.query)));
  }),
);

/** Top 20 hobbies and nationalities for the same filter state as /users. */
apiRouter.get(
  "/facets",
  handle((req, res) => {
    res.json(queryFacets(parseFilters(req.query)));
  }),
);
