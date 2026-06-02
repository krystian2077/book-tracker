# Book Tracker — Backend

Django + DRF + PostgreSQL API for a personal reading tracker. Users register,
build a private library, track reading progress, rate books, write notes, look
up metadata by ISBN, and import CSVs. Designed with up to ~10M records in mind
(keyset pagination + indexed trigram search).

Frontend repo: `../book-tracker-frontend` (React + Vite + TypeScript).

## Stack

- Python 3.12, Django 5.2 (LTS)
- Django REST Framework
- PostgreSQL 16 (+ `pg_trgm` extension)
- SimpleJWT (httpOnly cookie auth) + Django CSRF (double-submit token)
- drf-spectacular (OpenAPI schema + Swagger UI)
- pytest + pytest-django, ruff
- Docker Compose for local Postgres + backend

## Project layout

```
config/                 Django project (settings, urls, wsgi/asgi)
apps/
  accounts/             cookie-JWT auth, CSRF, register/login/logout/me/refresh
  catalog/              Book model, ISBN normalization/validation, ISBN lookup
  library/              UserBook, ReadingNote, library API, search, dashboard,
                        CSV import, seed_demo_data command
tests/                  pytest suite grouped by feature
```

## Local setup (Docker — recommended)

The backend and Postgres both run in Docker Compose.

```bash
cp .env.example .env          # optional; compose has sane defaults
docker compose up -d --build  # starts db + backend on http://localhost:8000
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_demo_data   # optional demo data
```

- API root: `http://localhost:8000/api/`
- Swagger UI: `http://localhost:8000/api/docs/`
- Health check: `http://localhost:8000/api/health/`

### Running without Docker (Postgres still required)

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
export DATABASE_URL=postgres://booktracker:booktracker@localhost:5432/booktracker
python manage.py migrate
python manage.py runserver
```

## Environment variables

| Variable | Purpose | Local default |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | Django secret key | dev placeholder |
| `DJANGO_DEBUG` | Debug mode | `True` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hosts | `localhost,127.0.0.1,0.0.0.0` |
| `DATABASE_URL` | Postgres connection (dj-database-url) | local compose DB |
| `CORS_ALLOWED_ORIGINS` | Allowed SPA origins | `http://localhost:5173,...` |
| `CSRF_TRUSTED_ORIGINS` | Trusted origins for CSRF | `http://localhost:5173,...` |
| `AUTH_COOKIE_SECURE` | `Secure` flag on auth cookies | `False` |
| `AUTH_COOKIE_SAMESITE` | `SameSite` for auth cookies | `Lax` |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth web client ID (optional) | empty (disabled) |

## Migrations

```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

`catalog/migrations/0001_enable_pg_trgm.py` enables the `pg_trgm` extension and
must run before the trigram GIN indexes are created.

## Demo data

```bash
docker compose exec backend python manage.py seed_demo_data
```

Creates/refreshes a demo account and a curated library of 30 popular books
(real, validated ISBNs; Open Library cover URLs) with mixed statuses, ratings,
progress, and a few notes. Idempotent.

- Demo login: `demo` / `DemoPassword123!`

## Running tests

```bash
docker compose exec backend pytest
docker compose exec backend ruff check .
```

## API overview

All endpoints are under `/api/`. Everything except the auth endpoints requires
authentication (httpOnly JWT cookie). Unsafe methods require the CSRF header.

Auth (`apps/accounts`):
- `GET  /auth/csrf/` — set the `csrftoken` cookie
- `POST /auth/register/` — create account, sets auth cookies
- `POST /auth/login/` — sets auth cookies
- `POST /auth/logout/` — clears auth cookies
- `GET  /auth/me/` — current user
- `POST /auth/refresh/` — refresh access cookie from refresh cookie
- `POST /auth/google/` — sign in / sign up with a Google ID token (see below)

Library (`apps/library`):
- `GET  /library/` — list (cursor pagination; `search`, `status`, `rating`, `sort` params;
  `rating=unrated` for books without a rating)
- `POST /library/` — manual add (find/create Book by normalized ISBN + create UserBook)
- `GET  /library/export/?export_as=csv|json` — download the user's library
- `GET/PATCH/DELETE /library/{id}/` — detail / update progress / remove
- `POST /library/import-csv/` — bulk import (multipart `file`)
- `GET  /library/{user_book_id}/notes/` and `POST` — list/create notes
- `GET/PATCH/DELETE /notes/{id}/` — note detail
- `GET  /dashboard/` — aggregate stats + currently-reading shelf

Catalog (`apps/catalog`):
- `GET  /books/lookup-isbn/?isbn=...` — Open Library + Google Books metadata

## Design decisions

**Normalized `Book` vs `UserBook` vs `ReadingNote`.** `Book` is shared catalog
metadata keyed by `isbn_normalized` (one row per edition). `UserBook` holds the
per-user, subjective state — rating, status, current page — so two users can
track the same catalog book independently with their own progress and rating
(`(user, book)` is unique). `ReadingNote` is its own table because a user can
write many notes/reflections/reviews per book (one-to-many), each privately
owned.

**Why rating is on `UserBook`.** Rating is subjective per reader, not a property
of the catalog book, so it belongs to the user–book relationship.

**Why PostgreSQL.** We need a real, persistent (non in-memory) relational store
with strong indexing, the `pg_trgm` extension for fuzzy search, partial
indexes, and aggregate queries — all first-class in Postgres.

## Scaling to ~10M records

- **Keyset (cursor) pagination, never OFFSET.** The library list uses DRF
  `CursorPagination` ordered by `(-created_at, -id)`, backed by the composite
  index `userbook_keyset_idx (user, -created_at, -id)`. Each page is a bounded
  range scan, so page N costs the same as page 1 — unlike `OFFSET`, which scans
  and discards N rows. We never return all rows.
- **Indexes.** `Book.isbn_normalized` (unique B-tree), `UserBook (user, created_at, id)`,
  `(user, status)`, `(user, rating)`, and trigram GIN indexes on `Book.title`
  and `Book.author`.
- **Caveat (documented honestly).** The `rating`/`progress`/`relevance` sorts
  keyset on a low-cardinality or computed field; at extreme scale and deep
  pages these are less ideal than the default `newest` sort. A production
  system would push ranked search into a dedicated search index (see loose
  ends). The headline list (newest) is the properly-indexed scalable path.

## Search strategy

Search is scoped to the authenticated user's library and picks a strategy:
- **ISBN-like input** → exact/prefix match on the indexed `isbn_normalized`.
- **Free text** → partial `ILIKE` on title/author/description, accelerated by
  the `pg_trgm` GIN indexes (no naive unindexed full-table scans), ranked by
  trigram similarity weighting title above author. Ranking priority overall:
  ISBN exact > title > author > description.

## Validation strategy

The backend is the source of truth. Manual add and CSV import share one
serializer (`UserBookCreateSerializer`), so validation rules live in one place:
- title/author required and trimmed; ISBN must be a valid ISBN-10/13 (checksum
  verified) and is normalized to a canonical key; pages a positive integer with
  a sane max; rating an integer 1–5; `current_page` between 0 and the book's
  page count; marking a book *finished* sets `current_page = pages` and stamps
  `finished_at`. The frontend mirrors these rules with Zod for fast feedback but
  the server re-validates everything.

## Auth strategy

SimpleJWT tokens are delivered in **httpOnly cookies** (access + refresh), so
JavaScript can never read them (mitigates token theft via XSS). Because cookie
auth is otherwise CSRF-prone, unsafe methods require a **double-submit CSRF
token**: the non-httpOnly `csrftoken` cookie echoed back in the `X-CSRFToken`
header, enforced in `CookieJWTAuthentication`. Locally cookies are `SameSite=Lax`
(same-site dev). In production (Vercel frontend + Railway backend = cross-site)
set `AUTH_COOKIE_SAMESITE=None` and `AUTH_COOKIE_SECURE=True` (HTTPS).

## Google Sign-In

"Continue with Google" is supported and uses the same cookie-JWT session as the
rest of the app:

1. The browser uses Google Identity Services to obtain an **ID token**.
2. It POSTs the token to `/api/auth/google/`.
3. The backend verifies the token offline with `google-auth` (signature +
   `audience` = our client ID), then finds-or-creates a user by email and issues
   the auth cookies. Google-only accounts get an unusable local password.

Setup (optional — the button is hidden if unset):

1. In Google Cloud Console create an OAuth 2.0 **Web** client ID. Add your
   frontend origin(s) to *Authorized JavaScript origins* (e.g.
   `http://localhost:5173` and your Vercel domain).
2. Set `GOOGLE_OAUTH_CLIENT_ID` on the backend and `VITE_GOOGLE_CLIENT_ID`
   (same value) on the frontend.

## Deployment notes (Railway + Vercel)

- Provision Railway PostgreSQL; Railway injects `DATABASE_URL`.
- Set `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS` (Railway
  domain), `CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` (Vercel domain),
  `AUTH_COOKIE_SECURE=True`, `AUTH_COOKIE_SAMESITE=None`.
- Run `migrate` (and optionally `seed_demo_data`) on deploy. Serve via a
  production WSGI server (e.g. gunicorn) behind Railway; the bundled dev server
  is for local use only.

## Loose ends / future improvements

These are intentionally out of scope for an 8-hour task and called out honestly:
- Further OAuth hardening (account linking UI, more providers, nonce checks).
- Refresh-token rotation with a blacklist app; CSRF on the refresh endpoint.
- Rate limiting / throttling on auth and lookup endpoints.
- Monitoring, structured logging, and error tracking.
- CI/CD pipeline.
- Async processing for very large CSV uploads (preview is client-side today).
- E2E test suite (Playwright/Cypress) in addition to unit/integration tests.
- Advanced full-text search tuning (Postgres `SearchVector`/ranking or a
  dedicated engine such as OpenSearch) and separating the large shared catalog
  search from per-user library search if the catalog grows independently.
- Caching external ISBN lookups (e.g. Redis) to reduce latency and API calls.

## AI usage and verification

I used AI tools as a pair-programming assistant for planning, boilerplate,
debugging and review. I verified the output by reading the code, running the
test suite (`pytest`) and linter (`ruff`) after each phase, checking current
library/API documentation where versions had changed (Django 5.2, SimpleJWT
cookie pattern, pg_trgm), and manually testing the user flows in the browser
(demo login, dashboard, live search, book details).
