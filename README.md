# Classroom Chat

A gamified learning platform for a coding classroom. Students earn Ducks, a virtual currency, for completing CodeCombat and Ozaria levels, chat with their class in real time, build a profile and project portfolio, and spend what they earn in a shop. Teachers run it from an admin area; parents sign in to follow their child's progress.

The idea behind the Ducks is in [docs/EDUCATIONAL_DESIGN.md](docs/EDUCATIONAL_DESIGN.md). The app is playful on purpose: read [PERSONALITY_GUIDE.md](PERSONALITY_GUIDE.md) before removing anything that looks like an Easter egg.

## What it does

- **Chat**: one feed over Socket.IO, screened against an admin-managed banned-word list. Students post to their own classrooms or to whoever is online; admins can also target individual students.
- **Ducks**: a student claims a level by sending its CodeCombat or Ozaria URL to `POST /challenge/submit` (bookmarklet on those sites, or the app). The level is logged and Ducks are awarded, scaled by an admin-set multiplier; one more Duck arrives with the first login of the day. The "Permanent Double Duck" perk doubles daily, challenge and approved-project Ducks, not achievement Ducks.
- **Bit Shift**: a student turns some Ducks into binary "bit" and "byte" ducks and submits it as a trade; an admin approves (which deducts the Ducks) or rejects it.
- **Shop**: Packets, earned from reviewed projects or granted by an admin, buy perks (chat colour, profile border, wallpaper, auto bitshift, auto challenge claimer, double Ducks).
- **Progress**: achievement badges, course certificates submitted by URL and reviewed by an admin, a skill tree per course track, and multiple-choice [student tests](docs/student_tests.md) at `/tests`.
- **Profiles and projects**: public profiles, skills, and projects with code or 3D files and an optional video (stored in S3, transcribed by [a Lambda](infrastructure/lambda_transcriber/)). Admins assign standard project templates to students.
- **Classrooms**: students join with a code (attempts are rate-limited and logged), ask an admin to approve a course instance the system does not recognise, and send homework files to an inbox (`/api/submissions`). An admin can switch a class into "sandbox" mode, a list of games, or set a classroom device up as a kiosk (`/admin/classes/:classId/kiosk`) where students photograph handwritten notes.
- **Parents**: sign in through AWS Cognito, link to a child with a connection code, see progress reports.
- **Admin**: dashboard, users, classes, review queues, the Duck transaction log, and a generic CRUD panel (react-admin) at `/admin/advanced-crud`.

## Stack

- Backend: Flask 3.1 with SQLAlchemy 2 on SQLite, Flask-SocketIO on gevent, Flask-Migrate (Alembic), Flask-Limiter, Flask-WTF (CSRF), APScheduler.
- Frontend: React 19, Vite, React Router 7, Zustand, Axios, socket.io-client, react-admin.
- Hosting: S3 and CloudFront for the built frontend, EC2 with nginx and gunicorn for the API, Cognito for parent accounts, SES for email. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Setup

You need Python 3.11 (what CI uses) and Node.js 20.19+ or 22.12+. There is no database server to install.

```bash
cd backend
python -m venv venv
source venv/bin/activate                  # Windows PowerShell: .\venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt       # runtime + test and lint tools
cp .env.example .env                      # the defaults are fine for development

cd ../frontend
npm install
```

The manual scripts in `backend/tools`, `backend/reports` and `scripts/` need `pip install -r requirements-tools.txt` and `playwright install chromium`. With `FLASK_ENV=production` the backend refuses to start without a real `SECRET_KEY` and `ADMIN_PASSWORD`; every variable is explained in [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example).

## Run

```bash
# Terminal 1, from backend/ with the venv active (port 8000, or PORT)
python main.py

# Terminal 2, from frontend/
npm run dev
```

Open http://localhost:5173. Vite proxies the API and Socket.IO paths to port 8000 (`VITE_DEV_API` changes the target). Use `python main.py`, not `flask run`: Socket.IO needs `socketio.run`. On Windows, `.\run_dev.ps1` in the repository root opens both servers.

The first start creates `backend/instance/dev_users.db` and the reserved classrooms, shop items and project templates. To get something to sign in with and to play with, run these from `backend/`:

```bash
python scripts/seed_e2e_users.py     # admin ben, student blossomstudent01, parent test_parent
FLASK_APP=main.py flask seed         # PowerShell: $env:FLASK_APP = "main.py"; flask seed
```

`flask seed` loads the courses, achievements, challenges and course instances from `backend/instance/migration/*.csv` (CodeCombat and Ozaria levels are only recognised once they are in the database), plus the standard project templates, the 3D track and the shipped student tests. In development, `http://localhost:8000/dev-login?role=admin` (or `student`, `parent`) logs in as one of the seeded accounts without a password; it answers only to localhost and is not registered when `FLASK_ENV=production`.

## Tests

```bash
# backend/
python -m pytest
python -m mypy .

# frontend/
npm run test                 # Vitest; add `-- --coverage` to enforce the thresholds in vite.config.js
npm run lint
npx playwright install       # first time only
npm run test:e2e             # Playwright; the specs that sign in need the backend running and seeded
```

Lint the backend with `ruff check .` from the repository root. [docs/testing_and_qa.md](docs/testing_and_qa.md) has the layout and what CI runs; [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) has the pre-push hook.

## Layout

| Path | Contents |
| --- | --- |
| `backend/application/` | The Flask app: `models/`, `routes/` (admin routes in `routes/admin/`), `services/`, `utilities/`, `decorators/`, `commands/` (`flask seed`), `socket_events.py`, `tasks.py`, `config.py` |
| `backend/` (rest) | `main.py` entry point, `migrations/` (Alembic), `tests/`, `tools/` and `scripts/` (maintenance and check scripts), `instance/` (SQLite databases, `app.log` and seed CSVs) |
| `frontend/src/` | The React app: `pages/`, `components/`, `hooks/`, `store/`, `api/`, `admin/` (react-admin panel), `utils/` |
| `frontend/` (rest) | `public/` (shipped in the build), `static/` (what Flask serves in development), `tests-e2e/` (Playwright) |
| `infrastructure/` | nginx config, the gunicorn systemd unit, the transcriber Lambda, CloudFormation/SAM templates, DNS and database-sync scripts |
| `deploy.sh`, `.github/workflows/`, `scripts/` | Server deploy script, CI/CD, git hooks and the preflight script |
| `docs/`, `.agents/`, `assets-src/` | Documentation, instructions and skills for AI coding agents, full-size badge artwork that is not served |

Uploaded files go to `userData/` at the repository root (git-ignored).

## Deployment

Branches flow `working`, then `main`, then `deploy`. A push to `deploy` runs `tests.yml` and `lint.yml`, then two workflows. `deploy.yml` writes `backend/.env` from GitHub secrets on the EC2 host over SSH and runs `deploy.sh`: pull, install, nginx config, database backup, migrations, seeds, restart, and a health check on `/server/health` with automatic rollback. `deploy-frontend.yml` builds the frontend and syncs it to S3, then invalidates CloudFront. The details and the one-time server setup are in [docs/infrastructure_and_devops.md](docs/infrastructure_and_devops.md).

## Documentation

[docs/README.md](docs/README.md) indexes everything else.
