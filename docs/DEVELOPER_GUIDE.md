# Developer Guide

## Project Structure

```text
classroom-chat/
├── backend/
│   ├── application/
│   │   ├── ai/               # AI teacher integration (OpenAI)
│   │   ├── commands/          # Flask CLI commands (e.g. `flask seed`)
│   │   ├── decorators/        # login_required, admin_required, api_response
│   │   ├── models/            # SQLAlchemy models (users, classrooms, projects, ducks, ...)
│   │   ├── routes/            # Flask blueprints (see below)
│   │   │   └── admin/         # Admin blueprint split into focused modules
│   │   ├── services/          # Business logic (messages, achievements, moderation, ...)
│   │   ├── utilities/         # Shared helpers (db helpers, schema-drift checks, ...)
│   │   ├── extensions.py      # Shared Flask extension instances (db, socketio, limiter, ...)
│   │   ├── socket_events.py   # Socket.IO event handlers
│   │   ├── constants.py       # Cross-cutting constants (e.g. GLOBAL_CLASSROOM_ID)
│   │   └── config.py          # Dev/Testing/Production config classes
│   ├── instance/               # SQLite DB files, logs (gitignored)
│   ├── migrations/             # Alembic migrations (Flask-Migrate)
│   ├── tests/                  # Pytest suite (unit, route, service, socket tests)
│   ├── tools/                  # One-off/maintenance scripts (e.g. migrate_classroom)
│   ├── main.py                  # WSGI entrypoint (`gunicorn -w 1 main:app`)
│   └── requirements.txt
├── frontend/
│   ├── src/                    # React 19 + Vite SPA (current UI)
│   │   ├── admin/               # react-admin CRUD panel (advanced/debug tooling)
│   │   ├── components/          # Shared + feature components (Layout, chat, admin, profile, ...)
│   │   ├── context/, hooks/, store/  # SidebarContext, custom hooks, zustand auth store
│   │   ├── pages/                # Route-level pages (Auth, Chat, Profile, Admin/*, Parent/*, ...)
│   │   ├── api/                  # Axios client
│   │   └── test/                 # Vitest setup + MSW mocks
│   ├── tests-e2e/               # Playwright end-to-end tests
│   ├── templates/, static/      # Legacy Jinja2 templates/CSS — retained only as a fallback
│   │                             # for Flask-Admin's advanced panel; not used by the SPA
│   └── package.json
├── infrastructure/              # nginx config, Cognito CFN template, Lambda transcriber, DNS/db-sync scripts
├── docs/                        # This documentation
├── issues/completed/            # Archive of resolved bug/feature tickets (Jira-style markdown)
├── .agents/workflows/           # AI-agent workflow definitions (see docs/agentic_workflows.md)
├── .github/workflows/           # CI: tests.yml, lint.yml, deploy.yml, deploy-frontend.yml, ai-*.yml
├── userData/                    # Uploaded user assets (profile pictures, project images, certificates)
└── deploy.sh                    # Production deploy script (migrations, health check, rollback)
```

### Backend architecture
- **App factory**: `backend/application/__init__.py` (`create_app`). Config is selected via `FLASK_ENV` (`development` / `testing` / `production`).
- **Blueprints**: registered in `backend/application/routes/__init__.py`. Notable prefixes:
  - `/user` — auth, profile, projects (`user_routes.py`)
  - `/api/admin` — admin blueprint, split across `routes/admin/*.py` (dashboard, user_mgmt, project_routes, crud_routes, doc_routes, trade_routes, challenge_mgmt, config_routes, standard_project_routes, advanced_ops)
  - `/message` — chat feed and message CRUD
  - `/duck_trade` — peer-to-peer currency trading and Bit Shift
  - `/achievements` (session) + `/api/achievements` (JSON API)
  - `/api/auth/cognito` — parent authentication via AWS Cognito
  - `/api/shop`, `/api/classroom`, `/api/project-templates`, `/api/session`
  - `/notes`, `/ai`, `/upload` — notes uploads, AI teacher, generic file uploads
  - `/dev-login` — localhost-only dev shortcut, never registered when `FLASK_ENV=production`
  - `/api/docs` — Swagger UI (spec at `/static/swagger.json`)
- **Real-time**: Flask-SocketIO (gevent async mode) — event handlers in `socket_events.py`.
- **Auth**: session-cookie based (`Flask-Login`/session), CSRF via `flask-wtf` (double-submit cookie `csrf_token_v2`), rate limiting via `Flask-Limiter` (disabled in `TestingConfig`). Parents authenticate through AWS Cognito.
- **DB**: SQLAlchemy + Flask-Migrate/Alembic. In non-production environments the app calls `db.create_all()` on startup; production is migration-only (`flask db upgrade`) — see the architecture note in `deploy.sh`.

### Frontend architecture
- React 19 SPA built with Vite, routed with `react-router-dom` v7 (`frontend/src/App.jsx`).
- Global auth/session state via `zustand` (`src/store/useAuthStore.js`).
- Data fetching via `axios` (`src/api/client.js`) and `@tanstack/react-query` in places; real-time chat via `socket.io-client` (`src/hooks/useChatSocket.js`).
- Admin has two surfaces: a hand-built admin UI (`src/pages/Admin/*`, `src/admin/AdminPanel.css`) and a generic `react-admin`-powered CRUD/debug panel (`src/admin/AdminPanel.jsx`, mounted at `/admin/advanced-crud`) backed by `routes/admin/crud_routes.py`.
- `frontend/templates/` and `frontend/static/` are **legacy** Jinja2 assets from before the React migration. They are kept only because the Flask app registers them as a Jinja loader fallback (for Flask-Admin's advanced panel templates) — new UI work should always go in `frontend/src/`.

---

## Coding Standards

- Python: PEP 8, enforced by `ruff` (run `ruff check .` from `backend/`) and type-checked with `mypy` (CI runs `python -m mypy .`).
- JavaScript/JSX: enforced by ESLint (`npm run lint` from `frontend/`), including `jsx-a11y` and `react-hooks` rules.
- Keep the app's tone intact — see [`PERSONALITY_GUIDE.md`](../PERSONALITY_GUIDE.md) at the repo root before removing anything that looks like an "easter egg" (e.g. the duck quack sound in `useLayout.js`).
- Prefer small, focused route modules — the `routes/admin/` split (dashboard, user_mgmt, project_routes, etc.) is the pattern to follow for new admin functionality rather than growing a single monolithic file.

---

## Branching Strategy

- Feature branches off `main` (e.g. `feature/ducks`); PRs merge into `main`.
- The `deploy` branch drives production: `.github/workflows/deploy.yml` and `deploy-frontend.yml` trigger on pushes to `deploy` and both gate on `tests.yml` + `lint.yml` passing first.
- Ensure all code changes are tested before merging.

---

## Testing

See [`testing_and_qa.md`](testing_and_qa.md) for the full strategy. Quick reference:

```bash
# Backend (from backend/, using the project's venv)
./venv/Scripts/python.exe -m pytest tests -q   # Windows
pytest tests -q                                 # macOS/Linux venv activated
python -m mypy .

# Frontend (from frontend/)
npx vitest run
npx playwright test
npm run lint
```

---

## Contributing

1. Fork or branch the repository.
2. Work on a feature branch; keep it in sync with `main`.
3. Add or update tests for any behavior change.
4. Run the relevant lint/test commands above before opening a PR.
5. Submit a PR with a clear description of the change.

Bugs and small UI issues are tracked as markdown tickets in `issues/` and archived to `issues/completed/` once resolved — see [`issue_resolver_guide.md`](issue_resolver_guide.md) and [`agentic_workflows.md`](agentic_workflows.md) for the agent-driven workflow around this.

### Front-end notes
- Toast notifications use `react-hot-toast`, anchored bottom-right (see the `<Toaster />` config in `frontend/src/App.jsx`) to avoid overlapping the header/profile icons.
