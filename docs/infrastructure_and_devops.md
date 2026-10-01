# Infrastructure and DevOps - Classroom Chat

This document describes the production infrastructure for Classroom Chat: a Flask JSON API +
Socket.IO backend on EC2 and a React SPA. The SPA is built in GitHub Actions and published to
S3 + CloudFront (`blossom.benmega.com`). Some assets, such as user certificates and uploads, are
still served by the EC2 Flask backend (`api-blossom.benmega.com`, the `VITE_API_URL` used by the S3 build).

---

## 1. Directory Layout (EC2 Server - Backend Only)

```
~/classroom-chat/
├── venv/                        # Python virtualenv (at project root)
├── backend/
│   ├── main.py                  # Entrypoint (gunicorn main:app)
│   ├── application/             # Flask app factory + routes
│   ├── requirements.txt
│   ├── migrations/              # Alembic migrations (run by deploy.sh)
│   ├── tools/                   # tools/migrate_classroom.py (run by deploy.sh)
│   ├── .env                     # NOT committed — injected by deploy.yml
│   └── instance/
│       ├── prod_users.db        # Production SQLite database
│       └── backups/             # Pre-deploy DB snapshots
└── deploy.sh                    # Deployment script
```

---

## 2. Environment Variables

The file `backend/.env` must exist on the server. It is **never committed** and is
**injected fresh on every deploy** by `deploy.yml` from GitHub Secrets.

See `backend/.env.example` for the full list of required variables. The code reads these variables (the Cognito and SES settings are listed in `config.py`):

| Variable | Used by | Notes |
| :--- | :--- | :--- |
| `FLASK_ENV` | `config.py`, `__init__.py`, routes | `production` on EC2; anything else enables dev-only behaviour (`/dev-login`, `create_all`) |
| `SECRET_KEY` | `config.py` | Required in production |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | `config.py` | `ADMIN_PASSWORD` required in production |
| `DATABASE_URL` | `config.py` (production) | SQLite file `prod_users.db` |
| `DEV_DATABASE_URI` | `config.py` (development) | Optional dev override |
| `WEBHOOK_SECRET` | webhook routes | Injected by `deploy.yml` |
| `WEBHOOK_URL` | `infrastructure/lambda_transcriber/lambda_function.py` (Lambda environment, not the Flask app) | Optional |
| `CORS_ORIGINS` | `config.py` | Comma-separated. Not written by `deploy.yml`, so the default origin list in `config.py` is used |
| `SOCKETIO_ASYNC_MODE` | `main.py` | Default `gevent` |
| `PORT`, `FLASK_DEBUG` | `main.py` (`python main.py` only) | Defaults 8000 / on |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | notes upload, helper functions, `user_routes.py` (S3); default region `ap-southeast-1` | Optional |

---

## 3. One-Time Server Setup

These steps must be performed manually once after provisioning a new EC2 instance:

```bash
# 1. Clone the repo
git clone <repo-url> ~/classroom-chat
cd ~/classroom-chat
git checkout deploy

# 2. Create Python virtualenv and install deps
python3 -m venv venv
venv/bin/pip install -r backend/requirements.txt

# 3. Create swap file (prevents OOM-kill on low-RAM instances)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 4. Create backend/.env (use .env.example as a template)
cp backend/.env.example backend/.env
nano backend/.env  # fill in real values

# 5. Nothing to do for the database: the first deploy.sh run creates the schema from the
#    models and stamps it to head (see section 8). `flask db upgrade` alone cannot build a
#    schema from an empty database.
```

---

## 4. Systemd — Gunicorn Service

File: `/etc/systemd/system/gunicorn-benmega.service`

```ini
[Unit]
Description=Gunicorn service for benmega.com
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/classroom-chat/backend
ExecStart=/home/ubuntu/classroom-chat/venv/bin/gunicorn -w 1 -b 0.0.0.0:8000 main:app --timeout 300
Restart=always

[Install]
WantedBy=multi-user.target
```

> The unit above is the documented one; it has not been verified against the live server. The app
> uses Flask-SocketIO in gevent mode (`gevent`, `gevent-websocket` in `requirements.txt`), which
> normally needs a gevent-capable worker (`-k geventwebsocket.gunicorn.workers.GeventWebSocketWorker`).
> Confirm the real unit on EC2 before changing it. Since nginx proxies to `127.0.0.1:8000`, binding
> to `127.0.0.1` is sufficient.

Key points:
- `WorkingDirectory` must be `backend/` so gunicorn finds `main.py` and `application/`
- `venv` is at the **project root**, not inside `backend/`

---

## 5. Nginx Configuration (Backend API Proxy)

Nginx is used exclusively as a reverse proxy for the API, handling SSL termination for `api-blossom.benmega.com` and forwarding traffic to Gunicorn.

The config is versioned in the repo at
[`infrastructure/nginx/api-blossom.benmega.com.conf`](../infrastructure/nginx/api-blossom.benmega.com.conf).
On every deploy `deploy.sh` copies it to `/etc/nginx/sites-available/benmega`, symlinks it into
`sites-enabled` if needed and reloads nginx. Edit the file in the repo, not on the server (the next
deploy overwrites the server copy); it is intentionally not duplicated here so this page cannot drift.

It covers:
- HTTP to HTTPS redirect and TLS (Let's Encrypt certificate for `api-blossom.benmega.com`)
- Security headers (HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
- CORS preflight: `OPTIONS` requests to the API routes are answered by nginx itself, ahead of Flask
- Proxying of the API route prefixes (`api`, `user`, `session`, `message`, `upload`, `challenge`, `ai`,
  `duck_trade`, `notes`, `server`) to Gunicorn on `127.0.0.1:8000`, with 300 s read/send timeouts and a
  500 MB request body limit for uploads
- WebSocket (`/socket.io`) proxying with the `Upgrade` headers

The legacy `/achievements/*` blueprint and `/dev-login` are deliberately not proxied: the React app uses
`/api/achievements/*`, and dev-login is disabled in production.

> **Note on Frontend Routing**: The frontend SPA (`blossom.benmega.com`) is hosted on **AWS S3** and served globally via **AWS CloudFront**. CloudFront handles SSL termination and redirects, and the S3 bucket is configured to serve `index.html` for client-side routing.

---

## 6. CI/CD Pipeline (GitHub Actions)

- **`deploy-frontend.yml`**: Triggers on push to `deploy`. Builds the React SPA and uploads the static assets directly to the AWS S3 bucket. Runs are serialised (`concurrency` group); a newer push queues behind an in-flight run instead of cancelling it.
- **`deploy.yml`**: Triggers on push to `deploy`. SSHes into EC2, writes `backend/.env` from GitHub Secrets, then runs `deploy.sh` (dependency install, online SQLite DB backup, `flask db upgrade`, `python -m tools.migrate_classroom`, `flask seed`, service restart, health check with automatic rollback; see [section 8](#8-database-migrations)). Runs are serialised (`concurrency` group) so two deploys never run `deploy.sh` at the same time.
- **`lint.yml`**: Ruff (Python) + ESLint (React) on every PR and on pushes to `main`/`master`/`working`. Also the lint gate for both deploy workflows.
- **`tests.yml`**: On pushes and PRs to `main`/`master`: a backend job (mypy, Alembic single-head check, Pytest) and a frontend job (Vitest with coverage, Playwright E2E against a locally started backend). Also the test gate for both deploy workflows.
- **`ai-coder.yml`**: the single AI workflow; runs when an issue or pull request receives the `ai-plan` label
  (plan, then code) or the `ai-draft` label (code directly). Runs are serialized per issue/PR.
  Do not add those labels casually; they start automated AI workflows.

Required GitHub Secrets: `EC2_USERNAME`, `EC2_SSH_KEY`, `SECRET_KEY`,
`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `WEBHOOK_SECRET`, as well as AWS credentials for S3 uploads.
The `ai-coder.yml` workflow additionally uses the `OPENAI_API_KEY` secret; the Flask app itself no longer reads it.

---

## 7. Route 53 Health Check

The Route 53 health check hits `/server/health` via the bare IP (`54.x.x.x:443`).
Since the EC2 uses a dynamic IP (no Elastic IP), this check will fail on instance restart.
The health check endpoint is proxied through nginx to gunicorn.

> Note: A static Elastic IP would make this reliable but adds cost.

---

## 8. Database Migrations

Alembic (Flask-Migrate) is the only supported way to change the database schema. The migrations
live in `backend/migrations/versions/` as one linear history with a single head; `tests.yml`
fails the build when there is more than one. The older one-off script system (raw `sqlite3`
scripts, `run_migrations.py`, `backend/instance/utilities/`) has been removed. Do not bring it back.

### Database upgrade path

`deploy.sh` is the only upgrade path for production, and `deploy.yml` runs it on every push to
`deploy`. Its database section runs from `backend/` with `FLASK_ENV=production`, in this order.
`set -e` aborts the deploy if a step fails, so the service is never restarted on a schema that
does not match the code.

1. **Backup**: take an online SQLite backup of `prod_users.db` (plain file copy as a fallback) into
   `backend/instance/backups/pre_deploy_<timestamp>.db`. The automatic rollback restores this copy
   if the health check fails.
2. **Heal `last_daily_duck`**: a small inline `sqlite3` snippet that repairs integer values in
   `users.last_daily_duck`, run before the app is imported.
3. **Bootstrap check**: with no `alembic_version` table this is a fresh install, so
   `db.create_all()` builds the schema from the models and the database is stamped to `head`.
   Otherwise it is an existing install: Alembic owns the schema and `create_all` is not called.
4. **Dangling-stamp purge**: if `flask db current` fails because `alembic_version` points at a
   revision that no longer exists, `flask db stamp base --purge` clears the stamp.
5. **`flask db upgrade`**: applies the pending migrations (a no-op on a fresh install).
6. **`python -m tools.migrate_classroom`**: idempotent *data* steps only (the reserved `global` and
   `archive` classrooms, enrolment backfills, archiving orphaned conversations, admin roles). It
   contains no DDL and is safe to re-run.
7. **`flask seed`**: seed data that is backed by files in the repo: course instances
   (`backend/instance/migration/course_instances_seed.csv`; rows whose classroom or course does
   not exist are skipped with a warning), challenges (`level_seed_data.csv`) and the standard
   project templates (`application/commands/projects_data.py`).
8. **Admin role**: `sqlite3 ... UPDATE users SET role='admin' WHERE LOWER(username)='ben'`.

After that the service restarts and the health check runs; if it fails, the code is reset to the
previous commit and the step 1 backup is restored.

The bootstrap in step 3 exists because the root revision (`3a10e78a7fd0`) is an empty placeholder:
the history upgrades an existing schema and cannot build one from nothing (`flask db upgrade` on a
blank database fails with `NoSuchTableError: users`).

### Rules

- Schema changes are made only with Alembic: change the models, run `flask db migrate -m "..."`,
  review the generated file and commit it with the model change. Run `flask db heads` before
  pushing; there must be exactly one head. `backend/scripts/lint_migrations.py` (run by
  `scripts/preflight.ps1`) lints migrations for idempotency.
- No raw-SQL or one-off database scripts (ad hoc `sqlite3` files, `ALTER TABLE` snippets, helper
  scripts kept under `backend/instance/`). Steps 2 and 8 above are the only raw SQL left in
  `deploy.sh`; do not add more.
- A data fix is either an Alembic data migration (runs once) or an idempotent step in
  `tools/migrate_classroom.py` (runs on every deploy). Never put DDL in `tools/migrate_classroom.py`.
- `db.create_all()` does not ALTER existing tables, so never rely on it for schema changes. The
  app factory only calls it outside production; `deploy.sh` uses it once to bootstrap a brand-new
  database before stamping it to head.

Create a new migration on a development machine (from `backend/`, with `FLASK_APP=main.py`):

```bash
flask db migrate -m "describe the change"
flask db upgrade
```
