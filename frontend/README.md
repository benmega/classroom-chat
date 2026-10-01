# Classroom Chat Frontend

React 19 + Vite single-page app (react-router-dom, Zustand, TanStack Query, react-admin, socket.io-client).

## Setup and run

```bash
cd frontend
npm install
npm run dev        # Vite dev server on http://localhost:5173
```

The dev server proxies API paths (`/api`, `/user`, `/message`, `/socket.io`, ...) to the Flask backend on
`http://localhost:8000` (see `vite.config.js`), so start the backend first (`cd backend && python main.py`).
`npm run preview` uses the same proxy. To use a backend on another address set `VITE_DEV_API` (see below).
For `/static`, files that exist in `frontend/public` are served from there (as in a production build) and
only the rest is fetched from the backend.

## Build and lint

```bash
npm run build      # outputs frontend/dist
npm run preview    # serve the production build locally
npm run lint       # ESLint
```

Production builds are made by the deploy pipeline on pushes to the `deploy` branch: `.github/workflows/deploy.yml`
runs `deploy.sh`, which builds on the EC2 host, and `deploy-frontend.yml` builds in GitHub Actions and syncs to
S3 + CloudFront.

## Environment variables

Vite reads these from the shell environment or from a git-ignored `frontend/.env` (copy `.env.example`).

- `VITE_API_URL` (optional): base URL of the backend API and Socket.IO server. When unset, requests use the
  same origin (the Vite proxy in development). The S3/CloudFront build sets it to `https://api-blossom.benmega.com`.
- `VITE_WAKEUP_API_URL` (optional): endpoint the "server is sleeping" page calls to start the backend. When unset, the
  built-in production wake-up URL is used. The S3/CloudFront build sets it explicitly.
- `VITE_DEV_API` (optional, development only): backend that the Vite dev server and `npm run preview` proxy to.
  Defaults to `http://localhost:8000`.

`CORS_ORIGINS` is a backend setting, not a Vite variable. It is a comma-separated list of the frontend origins
that the API (CORS) and Socket.IO accept in production; when unset, the defaults in `backend/application/config.py`
apply (see also `backend/.env.example`). A frontend served from a different origin than the API, such as the
S3/CloudFront build calling `VITE_API_URL`, must be listed there. In development the CORS and Socket.IO origins
are a fixed list instead: `http://localhost` and `http://127.0.0.1` on ports 5173-5175 (Vite dev server),
4173 (`npm run preview`) and 8000.

## Testing

This project uses Vitest for unit/integration testing and Playwright for end-to-end (E2E) testing.

### Unit & Integration Tests (Vitest)
Unit tests are located alongside components and stores (e.g., `ComponentName.test.jsx`). We use [MSW (Mock Service Worker)](https://mswjs.io/) to mock backend API calls.

- **Run tests:** `npm run test` (single run, exits when done)
- **Watch mode:** `npm run test:watch`

### End-to-End Tests (Playwright)
E2E tests are located in the `tests-e2e/` directory. They simulate real user interactions in a browser.

- **Run tests:** `npm run test:e2e`
- **UI Mode:** `npm run test:e2e:ui`

To install browsers (first time only):
```bash
npx playwright install
```
