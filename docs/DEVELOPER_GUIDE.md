# Developer Guide

## Project Structure

```text
classroom-chat/
├── backend/                  # Flask + Flask-SocketIO API
│   ├── main.py               # Entry point (python main.py in dev; gunicorn main:app in prod)
│   ├── application/
│   │   ├── __init__.py       # App factory (create_app)
│   │   ├── config.py         # Development / Testing / Production config
│   │   ├── socket_events.py  # Socket.IO handlers (send_message, connect, ...)
│   │   ├── tasks.py          # Scheduled jobs
│   │   ├── constants.py
│   │   ├── ai/               # AI teacher services (currently disabled)
│   │   ├── decorators/       # require_login, admin_only, api_response, ...
│   │   ├── models/           # SQLAlchemy models
│   │   ├── routes/           # Flask blueprints (admin/ is a package)
│   │   ├── services/         # Business logic (e.g. message_service)
│   │   └── utilities/        # Helpers (e.g. spa.py serves the React index.html)
│   ├── migrations/           # Alembic migrations (flask db upgrade)
│   ├── tools/                # One-off scripts (e.g. migrate_classroom.py)
│   ├── tests/                # pytest suite (pytest.ini lives in backend/)
│   └── requirements.txt
├── frontend/                 # React + Vite SPA
│   ├── src/                  # Components, pages, hooks, stores
│   ├── tests-e2e/            # Playwright specs
│   └── templates/dev_login.html  # Only remaining Jinja template (dev login page)
├── docs/                     # Documentation
├── infrastructure/, reports/, templates/   # Ops notes, reports and templates used by the app
├── userData/                 # Uploaded user assets
├── .agents/                  # Agent workflows and skills (see agentic_workflows.md)
├── .github/workflows/        # CI and deployment
├── deploy.sh                 # EC2 deployment script (run by deploy.yml)
└── run_dev.ps1               # Starts backend and frontend on Windows
```

The legacy Jinja templates, JS and CSS were removed. In production Flask serves the built React
`index.html` (from `frontend/dist`) through `application/utilities/spa.py`; in development use the
Vite server on port 5173. See [INSTALLATION.md](INSTALLATION.md) for setup.

Issues are tracked in GitHub Issues (see [issue_resolver_guide.md](issue_resolver_guide.md)).

---

## Coding Standards

- Follow **PEP 8** for Python (CI runs `ruff check .`) and the ESLint config in `frontend/eslint.config.js`.
- Use meaningful, descriptive names and keep code modular.
- Chat messages are sent only through the Socket.IO `send_message` event; put validation rules in
  `services/message_service.validate_and_save_message`, not in a route.

---

## Branching Strategy

- The default branch is `master`. Create feature branches from it (e.g. `feature/ducks`).
- Pushing to `deploy-gunicorn` triggers production deployment (`deploy.yml` and `deploy-frontend.yml`).
- Test changes before merging; resolve conflicts and rebase when necessary.

---

## Testing

- Backend (from `backend/`):
  ```bash
  pytest
  ```
- Frontend unit tests (from `frontend/`):
  ```bash
  npm run test -- --run
  ```
- Frontend E2E (from `frontend/`; first time run `npx playwright install`):
  ```bash
  npm run test:e2e
  ```
- Lint: `npm run lint` (frontend) and `ruff check .` (backend).

See [testing_and_qa.md](testing_and_qa.md) for details.

---

## Contributing

1. Fork or branch from `master`.
2. Develop the feature or fix on a branch, with tests.
3. Open a pull request with a clear description; reference the issue with `Fixes #<number>`.
4. Use meaningful commit messages and keep documentation in step with the code.

For questions or feedback, open a GitHub issue at https://github.com/benmega/classroom-chat/issues.

---

## Front-end notes

- Toast notifications use `react-hot-toast` (mounted in `App.jsx`).
- API documentation: [api_reference.md](api_reference.md).
