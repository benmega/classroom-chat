# Installation - Classroom Chat and Duck System

## Prerequisites
- Python 3.11 (matches CI; 3.8+ generally works)
- Node.js 20+ and npm (for the Vite/React frontend)
- SQLite (bundled with Python — no separate database server needed for local dev)

## Installation Steps

1. Clone the repository and enter it:
   ```bash
   git clone <repository_url>
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
   `SECRET_KEY`/`ADMIN_PASSWORD` fall back to insecure dev defaults if omitted in development, but `FLASK_ENV=production` will refuse to start without them (`application/config.py`). AI-teacher features additionally need `OPENAI_API_KEY`; Cognito-backed parent auth needs the `COGNITO_*` vars — both are optional for local development of the rest of the app.

5. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

## Getting Started

The database (SQLite, at `backend/instance/dev_users.db`) is created automatically on first run in development — `flask db` migrations are only required in production. To run locally:

```bash
# Terminal 1 — backend (from backend/, venv activated)
python main.py
# (uses socketio.run so websockets work correctly; `flask run` also
# works for pure HTTP routes but won't serve Socket.IO properly)

# Terminal 2 — frontend (from frontend/)
npm run dev -- --host
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
cd frontend && npx vitest run
npx playwright install   # first time only
npx playwright test
```

## API Documentation
See [`api_reference.md`](api_reference.md) for the endpoint catalog, or run the backend and browse Swagger UI at `/api/docs`.

## Production Deployment
Production runs on EC2 behind nginx, serving the built frontend (`frontend/dist`) via gunicorn/Flask and gated by CI (`tests.yml` + `lint.yml`) on pushes to the `deploy` branch — see [`deploy.sh`](../deploy.sh) and `.github/workflows/deploy.yml` for the full pipeline.
