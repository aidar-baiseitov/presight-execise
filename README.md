# User Directory

A searchable, filterable, infinitely scrolling user directory: React client, Node.js (Express) API, SQLite as the source of truth. The original exercise brief is in [TASK.md](TASK.md).

## Quick start with Docker Compose

```bash
docker compose up --build
```

Open http://localhost:8080. On first start the container seeds 1,000 users into a Docker volume, so the data survives `docker compose down` / `up`.

| Variable     | Default | Purpose                                            |
| ------------ | ------- | -------------------------------------------------- |
| `HOST_PORT`  | `8080`  | Host port, e.g. `HOST_PORT=9000 docker compose up` |
| `SEED_USERS` | `1000`  | Dataset size, applied when the volume is empty     |

To reseed with a different size: `docker compose down -v && SEED_USERS=50000 docker compose up --build`.

## Running locally

Requirements: Node.js 22 and Yarn 1.

```bash
yarn install
yarn seed      # creates server/data/users.db with 1,000 users (SEED_USERS=50000 yarn seed for more)
yarn dev       # API on http://localhost:4000, client on http://localhost:5173
```

Open http://localhost:5173. Vite proxies `/api` to the API server. The server also seeds an empty database on start, so `yarn seed` is optional the first time.

Production-like run, with Express serving the built client on one port:

```bash
yarn build
yarn start     # http://localhost:4000
```

Checks:

```bash
yarn test       # server tests (vitest)
yarn typecheck  # client and server
```

### Server environment variables

| Variable        | Default                | Purpose                                          |
| --------------- | ---------------------- | ------------------------------------------------ |
| `PORT`          | `4000`                 | API port                                         |
| `DATABASE_PATH` | `server/data/users.db` | SQLite file                                      |
| `SEED_USERS`    | `1000`                 | Number of users created by the seed              |
| `AUTO_SEED`     | on                     | `AUTO_SEED=0` disables seeding an empty database |
| `PUBLIC_DIR`    | `client/dist`          | Built client served by Express                   |

## API

All endpoints are `GET` and return JSON. List parameters are repeated: `?hobby=Chess&hobby=Yoga`.

### `GET /api/users`

Example: `/api/users?hobby=Reading&sort=age&order=desc`

| Param         | Default      | Notes                                                      |
| ------------- | ------------ | ---------------------------------------------------------- |
| `q`           |              | Substring of `first_name` or `last_name`, case-insensitive |
| `nationality` |              | Repeatable; matches users of **any** selected value        |
| `hobby`       |              | Repeatable; matches users with **all** selected values     |
| `sort`        | `first_name` | `first_name`, `last_name`, `age`, `nationality`            |
| `order`       | `asc`        | `asc`, `desc`                                              |
| `page`        | `1`          | 1-based                                                    |
| `pageSize`    | `30`         | 1 to 100                                                   |

```json
{
  "data": [
    {
      "id": 338,
      "avatar": "https://api.dicebear.com/9.x/thumbs/svg?seed=Erick-Schoen-337",
      "first_name": "Erick",
      "last_name": "Schoen",
      "age": 75,
      "nationality": "Dutch",
      "hobbies": ["Football", "Reading"]
    }
  ],
  "meta": { "page": 1, "pageSize": 30, "total": 191, "totalPages": 7, "hasMore": true }
}
```

### `GET /api/facets`

Takes the same `q`, `nationality` and `hobby` params. Returns the top 20 hobbies and top 20 nationalities of the current result set. Example: `/api/facets?hobby=Reading`

```json
{
  "hobbies": [
    { "value": "Reading", "count": 191 },
    { "value": "Gaming", "count": 49 }
  ],
  "nationalities": [{ "value": "American", "count": 18 }]
}
```

### `GET /api/health`

`{ "ok": true, "users": 1000 }`, used by the Docker healthcheck.

### Errors

Invalid parameters return `400` with a field-level breakdown. Unknown `/api` routes return `404` in the same shape.

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "sort: Invalid enum value. Expected 'first_name' | 'last_name' | 'age' | 'nationality', received 'password'",
    "details": [
      {
        "field": "sort",
        "message": "Invalid enum value. Expected 'first_name' | 'last_name' | 'age' | 'nationality', received 'password'"
      }
    ]
  }
}
```

## Design notes

### Data model

```
nationalities (id, name)            hobbies (id, name)
        ▲                                   ▲
        │ nationality_id                    │ hobby_id
users (id, avatar, first_name, last_name, age, nationality_id)
        ▲
        │ user_id
user_hobbies (user_id, hobby_id)    -- primary key (user_id, hobby_id)
```

Hobbies are a many-to-many relation rather than a text column, so "has all selected hobbies" and the facet counts are exact joins and groupings instead of string matching.

### Filtering, sorting and pagination

- One function (`buildFilterSql` in [server/src/services/userQuery.ts](server/src/services/userQuery.ts)) builds the `WHERE` clause for the list, the total count and both facets, so the sidebar can never disagree with the list.
- **Hobbies (AND):** keep the user's rows for the selected hobbies, group by user and require `COUNT(*) = number of selected hobbies`.
- **Nationalities (OR):** `nationality IN (...)`.
- **Deterministic order:** every sort ends with `id` as a tie-breaker, so each user has one fixed position and page boundaries never repeat or skip anyone. The tests walk every page for every sort field and direction to check this.
- **Indexes:** `(first_name COLLATE NOCASE, id)`, `(last_name COLLATE NOCASE, id)` and `(age, id)` match the `ORDER BY` exactly, so SQLite reads the first page straight from the index instead of sorting the whole table.
- All user input is bound as SQL parameters, and `%` and `_` in the text filter are escaped.

### Facet semantics

- **Hobbies** apply every active filter, including the selected hobbies. A count reads as "results if you also add this hobby".
- **Nationalities** apply every filter _except_ the selected nationalities. Each user has exactly one nationality, so including the selection would hide every other nationality after the first click and make multi-select (OR) impossible from the sidebar.

### Client

- The URL is the single source of truth for `q`, selected filters, sort and order. Reloading or sharing a link restores the view. Typing replaces the history entry instead of adding one per keystroke.
- TanStack Query fetches the list (`useInfiniteQuery`) and the facets separately. Facets are keyed only on filters, so sorting and scrolling never refetch the sidebar. Previous data stays on screen while a new filter loads, and in-flight requests are aborted when the filters change.
- TanStack Virtual renders only the visible cards, and the next page is requested before the user reaches the end of the loaded rows.

### What I would add for production

- PostgreSQL with versioned migrations (the SQLite schema here is recreated by the seed, versioned with `PRAGMA user_version`).
- Keyset (cursor) pagination instead of `OFFSET`, which gets slower with deep pages and can shift if data changes between requests.
- Full-text search (SQLite FTS5 or Postgres `pg_trgm`), since `LIKE '%q%'` scans every row.
- Shared API types between client and server (a shared package or an OpenAPI schema).
- Structured logging, request ids, rate limiting and security headers.
