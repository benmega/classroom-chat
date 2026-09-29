# Installation and Local Development

Classroom Chat is a Flask + Flask-SocketIO backend (`backend/`) and a React/Vite frontend (`frontend/`).
In development you run both servers.

## Prerequisites
- Python 3.11 (the version used in CI)
- Node.js 20 and npm (the version used in CI)
- Git

## 1. Clone

```bash
git clone https://github.com/benmega/classroom-chat.git
cd classroom-chat
```

## 2. Backend (Flask, port 8000)

```bash
python -m venv venv

# Activate the virtual environment
# Unix/macOS:
source venv/bin/activate
# Windows PowerShell:
.\venv\Scripts\Activate.ps1

pip install -r backend/requirements.txt

cd backend
python main.py
```

Notes:
- Run backend commands from `backend/` (that is where `main.py`, `pytest.ini` and `migrations/` live).
- In development (`FLASK_ENV` not `production`) the app creates the SQLite database
  (`backend/instance/dev_users.db`) on startup with `db.create_all()`, so no migration step is needed.
  If you want to exercise Alembic, run `flask db upgrade` from `backend/` with `FLASK_APP=main.py`.
  Do not run `flask db init`; `backend/migrations/` already exists.
- Development falls back to a dev `SECRET_KEY` and admin password. To override settings, copy
  `backend/.env.example` to `backend/.env` (never commit it). See the environment variable table
  in [infrastructure_and_devops.md](infrastructure_and_devops.md).
- `PORT` (default 8000) and `FLASK_DEBUG` (default on) are read by `main.py`.

## 3. Frontend (Vite, port 5173)

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies the API paths (`/api`, `/user`, `/message`,
`/socket.io`, ...) to the Flask server on http://localhost:8000 (see `frontend/vite.config.js`).
Port 8000 is the API, not the UI: in development Flask does not serve the React app.

To point the frontend at a different API host, set `VITE_API_URL` before `npm run dev` or `npm run build`.

`run_dev.ps1` (repo root) starts both servers in separate PowerShell windows on Windows.

## 4. Logging in during development

`/dev-login` (backend, non-production only) creates a session without a password. See
`.agents/skills/login_automation/SKILL.md` and [api_reference.md](api_reference.md).

## 5. Tests

```bash
# Backend (from backend/)
pytest

# Frontend unit tests (from frontend/)
npm run test -- --run

# Frontend end-to-end tests (from frontend/; first time: npx playwright install)
npm run test:e2e
```

## 6. Production build

Production deployment is done by GitHub Actions, not by hand; see
[infrastructure_and_devops.md](infrastructure_and_devops.md). To build the SPA locally: `cd frontend && npm run build` (output in `frontend/dist/`).
