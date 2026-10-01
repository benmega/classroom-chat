# Installation - Classroom Chat and Duck System

## Prerequisites
- Python 3.11 (matches CI; 3.8+ generally works)
- Node.js 20+ and npm (for the Vite/React frontend)
- SQLite (bundled with Python — no separate database server needed for local dev)

## Installation Steps

1. Clone the repository and enter it:
   ```bash
   git clone https://github.com/benmega/classroom-chat.git
   cd classroom-chat
   ```

2. Create and activate a virtual environment inside `backend/`:
   ```bash
   cd backend
   python3 -m venv venv
   # Unix/macOS:
   source venv/bin/activate
   # Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create `backend/.env` with at least:
   ```env
   FLASK_ENV=development
   SECRET_KEY=some-dev-secret
   ADMIN_PASSWORD=some-dev-password
   ```
   `backend/.env.example` is a template for this file; it defaults to `FLASK_ENV=development` and lists every optional variable. `SECRET_KEY`/`ADMIN_PASSWORD` fall back to insecure dev defaults if omitted in development, but production needs `FLASK_ENV=production` and will refuse to start without them (`application/config.py`). On the server, `deploy.yml` writes `backend/.env` (including `FLASK_ENV=production`) from GitHub Secrets; if you create it by hand from the example, change `FLASK_ENV` to `production`. Cognito-backed parent auth additionally needs the `COGNITO_*` vars, which are optional for local development of the rest of the app.

5. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

## Getting Started

The database (SQLite, at `backend/instance/dev_users.db`) is created automatically on first run in development — `flask db` migrations are only required in production. Schema changes are still made as Alembic migrations (`flask db migrate`), never as ad hoc scripts; production applies them through `deploy.sh` (see [infrastructure_and_devops.md](infrastructure_and_devops.md#8-database-migrations)). To run locally:

```bash
# Terminal 1 — backend (from backend/, venv activated)
python main.py
# (uses socketio.run so websockets work correctly; `flask run` also
# works for pure HTTP routes but won't serve Socket.IO properly)

# Terminal 2 — frontend (from frontend/)
npm run dev -- --host
```

**Windows one-click start:** `run_dev.ps1` in the repository root opens both servers above in separate PowerShell windows (frontend with `--host`, backend with `python main.py`). It works from any directory, and activates `backend/.venv` or `backend/venv` first when one exists:

```powershell
.\run_dev.ps1
```

- Frontend dev server: http://localhost:5173
- Backend API: http://127.0.0.1:8000 (default port, overridable via the `PORT` env var)

The frontend's `axios` client and CORS config (`application/__init__.py`) already allow `localhost:5173-5175` and `127.0.0.1:5173-5175`/`8000`, so no extra proxy setup is needed for local dev.

## Running Tests
See [`testing_and_qa.md`](testing_and_qa.md) for full details:
```bash
# Backend
cd backend && python -m pytest tests -q

# Frontend
cd frontend && npm run test
npx playwright install   # first time only
npm run test:e2e
```

## API Documentation
See [`api_reference.md`](api_reference.md) for the endpoint catalog (it also has a one-liner that prints every registered route).

## Production Deployment
Production deployment is split between AWS S3/CloudFront for the React frontend and an EC2 instance behind nginx for the Flask backend. Both pipelines are gated by CI (`tests.yml` + `lint.yml`) on pushes to the `deploy` branch — see `.github/workflows/deploy-frontend.yml` and `.github/workflows/deploy.yml` (which triggers `deploy.sh`) for the full pipeline.
