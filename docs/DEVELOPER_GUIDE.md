# Developer Guide

## Project Structure

```text
classroom-chat/
├── backend/
│   ├── application/
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
│   ├── tools/                  # Maintenance helpers: migrate_classroom (data steps, run by deploy.sh) + manual scrape/asset scripts
│   ├── main.py                  # WSGI entrypoint (`gunicorn -w 1 main:app`)
│   ├── requirements.txt        # Runtime dependencies (what deploy.sh installs)
│   ├── requirements-dev.txt    # Runtime + test/lint tooling (pytest, ruff, mypy)
│   └── requirements-tools.txt  # Runtime + extras for the manual scripts (reportlab, qrcode, playwright)
├── frontend/
│   ├── src/                    # React 19 + Vite SPA (current UI)
│   │   ├── admin/               # react-admin CRUD panel (advanced/debug tooling)
│   │   ├── components/          # Shared + feature components (Layout, chat, admin, profile, ...)
│   │   ├── context/, hooks/, store/  # SidebarContext, custom hooks, zustand auth store
│   │   ├── pages/                # Route-level pages (Auth, Chat, Profile, Admin/*, Parent/*, ...)
│   │   ├── api/                  # Axios client
│   │   └── test/                 # Vitest setup + MSW mocks
│   ├── tests-e2e/               # Playwright end-to-end tests
│   ├── templates/dev_login.html # Only remaining Jinja template (dev login page)
│   ├── static/                  # Images (the legacy Jinja-era CSS/JS was removed)
│   ├── public/                  # Copied as-is into dist/ by Vite for the SPA; public/static/images is the SPA's copy of the default avatar/placeholder, static/images the backend's (keep both small)
│   └── package.json
├── infrastructure/              # nginx config, Cognito CFN template, Lambda transcriber, DNS/db-sync scripts
├── docs/                        # This documentation
├── .agents/                     # AI-agent rules and skills (see docs/agentic_workflows.md)
├── .github/workflows/           # CI: tests.yml, lint.yml, deploy.yml, deploy-frontend.yml, ai-*.yml
├── userData/                    # Uploaded user assets (profile pictures, project images, certificates)
└── deploy.sh                    # Production deploy script (migrations, health check, rollback)
```

### Backend architecture
- **App factory**: `backend/application/__init__.py` (`create_app`). Config is selected via `FLASK_ENV` (`development` / `testing` / `production`).
- **Blueprints**: registered in `backend/application/routes/__init__.py`. Notable prefixes:
  - `/user` — auth, profile, projects (`user_routes.py`)
  - `/api/admin` — admin blueprint, split across `routes/admin/*.py` (dashboard, user_mgmt, project_routes, crud_routes, trade_routes, challenge_mgmt, config_routes, standard_project_routes, advanced_ops)
  - `/message` — chat feed and message CRUD
  - `/duck_trade` — peer-to-peer currency trading and Bit Shift
  - `/api/achievements` — achievements and certificates (JSON API)
  - `/api/auth/cognito` — parent authentication via AWS Cognito
  - `/api/shop`, `/api/classroom`, `/api/project-templates`, `/api/session`
  - `/notes` — notes uploads
  - `/dev-login` — localhost-only dev shortcut, never registered when `FLASK_ENV=production`
- **Real-time**: Flask-SocketIO (gevent async mode) — event handlers in `socket_events.py`.
- **One process**: the rate limiter, Socket.IO presence (`_active_sessions`) and the APScheduler session-cleanup job all keep state in the memory of a single process, which is why production runs `gunicorn -w 1`. See [Single-process assumptions](infrastructure_and_devops.md#single-process-assumptions) before adding workers; `SCHEDULER_ENABLED=0` keeps a process from starting the scheduler.
- **Auth**: session-cookie based (`Flask-Login`/session), CSRF via `flask-wtf` (double-submit cookie `csrf_token_v2`), rate limiting via `Flask-Limiter` (disabled in `TestingConfig`). Parents authenticate through AWS Cognito.
- **DB**: SQLAlchemy + Flask-Migrate/Alembic. In non-production environments the app calls `db.create_all()` on startup; production is migration-only (`flask db upgrade`) — see the architecture note in `deploy.sh`.

### Frontend architecture
- React 19 SPA built with Vite, routed with `react-router-dom` v7 (`frontend/src/App.jsx`).
- Global auth/session state via `zustand` (`src/store/useAuthStore.js`).
- Data fetching via `axios` (`src/api/client.js`) and `@tanstack/react-query` in places; real-time chat via `socket.io-client` (`src/hooks/useChatSocket.js`).
- Admin has two surfaces: a hand-built admin UI (`src/pages/Admin/*`, `src/admin/AdminPanel.css`) and a generic `react-admin`-powered CRUD/debug panel (`src/admin/AdminPanel.jsx`, mounted at `/admin/advanced-crud`) backed by `routes/admin/crud_routes.py`.
- The legacy Jinja2 templates, JS and CSS from before the React migration were removed; `frontend/templates/dev_login.html` is the only Jinja template left. Where Flask hands a browser navigation over to the SPA it goes through `application/utilities/spa.py` (`serve_spa_index`): in production that serves the built React `index.html` from `frontend/dist`; in development it returns a JSON 404 pointing at the Vite server on port 5173. New UI work should always go in `frontend/src/`.

---

## Coding Standards

- Python: PEP 8, enforced by `ruff` (run `ruff check .` from `backend/`) and type-checked with `mypy` (CI runs `python -m mypy .`).
- JavaScript/JSX: enforced by ESLint (`npm run lint` from `frontend/`), including `jsx-a11y` and `react-hooks` rules.
- Keep the app's tone intact — see [`PERSONALITY_GUIDE.md`](../PERSONALITY_GUIDE.md) at the repo root before removing anything that looks like an "easter egg" (e.g. the duck quack sound in `useLayout.js`).
- Prefer small, focused route modules — the `routes/admin/` split (dashboard, user_mgmt, project_routes, etc.) is the pattern to follow for new admin functionality rather than growing a single monolithic file.
- Chat messages are sent only through the Socket.IO `send_message` event; put validation rules in its handler (`handle_send_message` in `application/socket_events.py`), not in an HTTP route.

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
npm run test
npm run test:e2e
npm run lint
```

---

## Contributing

1. Fork or branch the repository.
2. Work on a feature branch; keep it in sync with `main`.
3. Add or update tests for any behavior change.
4. Run the relevant lint/test commands above before opening a PR.
5. Submit a PR with a clear description of the change; reference the issue it resolves with `Fixes #<number>`.

Bugs and small UI issues are tracked in GitHub Issues (https://github.com/benmega/classroom-chat/issues) and handled with the `gh` CLI — see [`issue_resolver_guide.md`](issue_resolver_guide.md) and [`agentic_workflows.md`](agentic_workflows.md) for the agent-driven workflow around this.

### Front-end notes
- Toast notifications use `react-hot-toast`, anchored bottom-right (see the `<Toaster />` config in `frontend/src/App.jsx`) to avoid overlapping the header/profile icons.
