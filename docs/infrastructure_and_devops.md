# Infrastructure and DevOps - Classroom Chat

This document describes the production infrastructure for Classroom Chat: a Flask JSON API +
Socket.IO backend on EC2 and a React SPA. The SPA is built in GitHub Actions and is published both
to the EC2 host (`frontend/dist`, served by nginx and by Flask's `spa.py`) and to S3 + CloudFront
(`blossom.benmega.com`). Some assets, such as user certificates and uploads, are still served by the
EC2 Flask backend (`api-blossom.benmega.com`, the `VITE_API_URL` used by the S3 build).

---

## 1. Directory Layout (EC2 Server)

```
~/classroom-chat/
├── venv/                        # Python virtualenv (at project root, not backend/)
├── frontend/
│   └── dist/                    # Built React SPA — served by nginx directly
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

`backend/.env.example` lists the variables written by `deploy.yml`. The code reads these variables:

| Variable | Used by | Notes |
| :--- | :--- | :--- |
| `FLASK_ENV` | `config.py`, `__init__.py`, routes | `production` on EC2; anything else enables dev-only behaviour (`/dev-login`, `create_all`) |
| `SECRET_KEY` | `config.py` | Required in production |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | `config.py` | `ADMIN_PASSWORD` required in production |
| `DATABASE_URL` | `config.py` (production) | SQLite file `prod_users.db` |
| `DEV_DATABASE_URI` | `config.py` (development) | Optional dev override |
| `OPENAI_API_KEY` | `config.py` | AI teacher (currently off) |
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
git checkout deploy-gunicorn

# 2. Create Python virtualenv and install deps
python3 -m venv venv
venv/bin/pip install -r backend/requirements.txt

# 3. Install Node.js LTS (via NodeSource — do NOT use apt install npm)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Create swap file (optional safety net on low-RAM instances; the frontend is NOT built on EC2)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 5. Create backend/.env (use .env.example as a template)
cp backend/.env.example backend/.env
nano backend/.env  # fill in real values

# 6. Initialise / upgrade the database schema (Alembic, from backend/)
cd backend
FLASK_APP=main.py FLASK_ENV=production ../venv/bin/python3 -m flask db upgrade

# 7. The frontend build is produced by GitHub Actions and copied to
#    ~/classroom-chat/frontend/dist by deploy.yml (no npm build on EC2).
#    deploy.sh fixes the file permissions for nginx.
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

## 5. Nginx Configuration

File: `/etc/nginx/sites-available/benmega`

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name blossom.benmega.com;
    client_max_body_size 500M;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name blossom.benmega.com;
    client_max_body_size 500M;

    ssl_certificate     /etc/letsencrypt/live/blossom.benmega.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blossom.benmega.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Serve the React SPA static files
    root /home/ubuntu/classroom-chat/frontend/dist;
    index index.html;

    # API / backend routes → proxy to Gunicorn.
    # The React app uses /api/achievements/*; the legacy /achievements/* blueprint and /dev-login
    # are not proxied (dev-login is disabled in production anyway).
    location ~ ^/(api|user|session|message|upload|challenge|ai|duck_trade|notes|server)(/|$) {
        proxy_pass         http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # WebSocket (socket.io) → proxy to Gunicorn
    location /socket.io/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # React Router SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Important:** Files in `frontend/dist/` must be readable by `www-data`. Run:
```bash
chmod o+x /home/ubuntu
chmod -R o+r /home/ubuntu/classroom-chat/frontend/dist/
find /home/ubuntu/classroom-chat/frontend/dist/ -type d -exec chmod o+x {} \;
```
`deploy.sh` does this automatically after each build.

---

## 6. CI/CD Pipeline (GitHub Actions)

- **`deploy.yml`** (push to `deploy-gunicorn`): builds the frontend on the runner, copies
  `frontend/dist` to EC2 over SCP, SSHes in, resets the checkout to `origin/deploy-gunicorn`, writes
  `backend/.env` from GitHub Secrets and runs `deploy.sh` (dependency install, DB backup,
  `flask db upgrade`, `python -m tools.migrate_classroom`, service restart, health check with
  automatic rollback).
- **`deploy-frontend.yml`** (push to `deploy-gunicorn` or manual dispatch): builds the frontend with
  `VITE_API_URL=https://api-blossom.benmega.com`, syncs it to the S3 bucket for `blossom.benmega.com`
  and invalidates the CloudFront distribution.
- **`lint.yml`** (push and pull request): Ruff for Python. It does not run ESLint.
- **`tests.yml`** (push and pull request to `main`/`master`): `flask db check`, Pytest, and Vitest.
- **`ai-planner.yml`, `ai-coder.yml`**: run when an issue or pull request receives an AI label.
  Do not add those labels casually; they start automated AI workflows.

Required GitHub Secrets: `EC2_HOST`, `EC2_USERNAME`, `EC2_SSH_KEY`, `SECRET_KEY`,
`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `OPENAI_API_KEY`, `WEBHOOK_SECRET` (all used by `deploy.yml`),
plus `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (used by `deploy-frontend.yml`).

---

## 7. Route 53 Health Check

The Route 53 health check hits `/server/health` via the bare IP (`54.x.x.x:443`).
Since the EC2 uses a dynamic IP (no Elastic IP), this check will fail on instance restart.
The health check endpoint is proxied through nginx to gunicorn.

> Note: A static Elastic IP would make this reliable but adds cost.

---

## 8. Database Migrations

Schema changes are Alembic migrations in `backend/migrations/versions/`. `deploy.sh` runs, from
`backend/`, `flask db upgrade` and then the idempotent `python -m tools.migrate_classroom` script,
after taking a copy of `prod_users.db` into `backend/instance/backups/`.

Create a new migration on a development machine (from `backend/`, with `FLASK_APP=main.py`):

```bash
flask db migrate -m "describe the change"
flask db upgrade
```

`db.create_all()` only runs outside production and does not ALTER existing tables, so never rely on
it for schema changes. The legacy `backend/instance/migration/migration_script.py` is not part of
the deployment.
