# End-to-end tests (Playwright)

## Prerequisites

1. Backend running with demo data:
   ```bash
   cd ../book-tracker-backend
   docker compose up -d
   docker compose exec backend python manage.py migrate
   docker compose exec backend python manage.py seed_demo_data
   ```
2. Frontend env points at the API (`VITE_API_BASE_URL=http://localhost:8000`).

## Run

```bash
cd book-tracker-frontend
npm install
npx playwright install chromium   # first time only
npm run test:e2e
```

Playwright starts the Vite dev server automatically (`reuseExistingServer: true` if one is already running).

## What is covered

- **Auth** — login screen, invalid credentials, logout, register tab
- **Core flow** — demo login → add book → search; theme toggle
- **Validation** — invalid ISBN, empty title, duplicate ISBN in library
- **Library** — status/rating filters, empty search, delete book, CSV/JSON export
- **Book details** — metadata, star rating, back navigation
- **CSV import** — preview + confirmation, missing columns error
- **Dashboard** — stats cards, recently added list, stat drill-down to library
