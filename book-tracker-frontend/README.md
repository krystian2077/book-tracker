# Book Tracker — Frontend

A polished SaaS-style dashboard for a personal reading tracker, built with
React + Vite + TypeScript. It talks to the Django REST API in
`../book-tracker-backend`.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (CSS-first, via `@tailwindcss/vite`)
- TanStack Query v5 (server state, caching, `keepPreviousData`)
- React Hook Form + Zod (forms + validation mirroring the backend)
- React Router v7
- Axios (typed client with cookie + CSRF handling)
- Vitest + Testing Library

## Local setup

The backend must be running first (see the backend README — `docker compose up`).

```bash
cp .env.example .env      # optional; defaults to http://localhost:8000
npm install
npm run dev               # http://localhost:5173
```

Log in with the demo account button (after running `seed_demo_data` on the
backend): `demo` / `DemoPassword123!`.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Backend base URL (no trailing slash) | `http://localhost:8000` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth web client ID (optional) | empty (button hidden) |

## Scripts

```bash
npm run dev        # start dev server
npm run build      # type-check (tsc -b) + production build
npm run preview    # preview the production build
npm run test       # run the Vitest suite
npm run test:e2e   # Playwright E2E (backend must be running)
npm run lint       # ESLint
```

## UI features

- **Auth screen** — sign in / sign up tabs, validation, "Continue with Google"
  (shown when `VITE_GOOGLE_CLIENT_ID` is set), and a one-click demo account
  button.
- **Dashboard** — summary stats (total books, reading, finished, average
  rating, pages read), a "Currently reading" shelf with progress bars and quick
  actions (+10 pages, set page, mark finished), and a recently-added list.
- **Library** — live search (300ms debounce; min 2 chars unless the input looks
  like an ISBN) over title/author/ISBN, status/rating filters, sort
  (relevance/newest/rating/progress), cursor pagination, and previous results
  kept on screen while loading.
- **Add book** — three tabs: add manually, find by ISBN (autofills the form from
  Open Library / Google Books, with a manual fallback), and import CSV (**preview
  table + confirmation** before upload, per-row error summary after import).
- **Library export** — download your library as CSV or JSON; filter **without rating**.
- **Book details** — cover, metadata, progress, and a private notes section
  (notes/reflections/summaries/reviews) with add/edit/delete.
- Loading skeletons, empty states, and error states throughout; responsive
  layout with a collapsing sidebar.

## How auth works on the client

The API uses httpOnly JWT cookies, so the client never stores tokens in JS. The
Axios instance sends credentials (`withCredentials`) and, on unsafe requests,
reads the `csrftoken` cookie and echoes it in the `X-CSRFToken` header. On load
the app fetches the CSRF cookie and `GET /auth/me/` to determine auth state.

"Continue with Google" uses Google Identity Services to get an ID token, which
is exchanged at `POST /auth/google/` for the same cookie-JWT session. Set
`VITE_GOOGLE_CLIENT_ID` (and the matching backend `GOOGLE_OAUTH_CLIENT_ID`) to
enable it.

## Backend repo

API, data model, scaling notes and design decisions live in
`../book-tracker-backend/README.md`.

## AI usage and verification

I used AI tools as a pair-programming assistant for planning, boilerplate,
debugging and review. I verified the output by reading the code, running the
Vitest suite and the production build after each phase, checking current
documentation where APIs had changed (Tailwind v4 CSS-first setup, TanStack
Query v5), and manually testing the flows in the browser.
