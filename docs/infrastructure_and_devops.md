# Infrastructure and DevOps - Classroom Chat

This document describes the production infrastructure for Classroom Chat after the
Flask/Jinja2 → Flask JSON API + React SPA refactor.

---

## 1. Directory Layout (EC2 Server)

```
~/classroom-chat/
├── venv/                        # Python virtualenv (at project root, not backend/)
├── frontend/
│   └── dist/                    # Built React SPA — served by nginx directly
├── backend/
│   ├── main.py                  # Gunicorn entrypoint
│   ├── application/             # Flask app factory + routes
│   ├── requirements.txt
│   ├── .env                     # NOT committed — injected by deploy.yml
│   └── instance/
│       ├── prod_users.db        # Production SQLite database
│       ├── backups/             # Pre-deploy DB snapshots
│       └── migration/
│           └── migration_script.py
└── deploy.sh                    # Deployment script
```

---

## 2. Environment Variables

The file `backend/.env` must exist on the server. It is **never committed** and is
**injected fresh on every deploy** by `deploy.yml` from GitHub Secrets.

See `backend/.env.example` for the full list of required variables.

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

# 4. Create swap file (prevents npm OOM-kill on low-RAM instances)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 5. Create backend/.env (use .env.example as a template)
cp backend/.env.example backend/.env
nano backend/.env  # fill in real values

# 6. Run migrations to initialise the database schema
cd backend/instance/migration
../../../venv/bin/python3 migration_script.py

# 7. Build the frontend
cd ~/classroom-chat/frontend
npm install && npm run build
chmod o+x ~ && chmod -R o+r dist/ && find dist/ -type d -exec chmod o+x {} \;
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
    server_name api-blossom.benmega.com;
    client_max_body_size 500M;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api-blossom.benmega.com;
    client_max_body_size 500M;

    ssl_certificate     /etc/letsencrypt/live/api-blossom.benmega.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api-blossom.benmega.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # API / backend routes → proxy to Gunicorn
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
}
```

---

## 6. CI/CD Pipeline (GitHub Actions)

- **`deploy.yml`**: Triggers on push to `deploy-gunicorn`. SSHes into EC2, writes
  `backend/.env` from GitHub Secrets, then runs `deploy.sh`.
- **`lint.yml`**: ESLint (React) + Ruff (Python) on every PR.
- **`tests.yml`**: Vitest + Pytest on every PR.

Required GitHub Secrets: `EC2_HOST`, `EC2_USERNAME`, `EC2_SSH_KEY`, `SECRET_KEY`,
`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `OPENAI_API_KEY`, `LAMBDA_SECRET`.
See ISS-158 for the full secrets setup checklist.

---

## 7. Route 53 Health Check

The Route 53 health check hits `/server/health` via the bare IP (`54.x.x.x:443`).
Since the EC2 uses a dynamic IP (no Elastic IP), this check will fail on instance restart.
The health check endpoint is proxied through nginx to gunicorn.

> Note: A static Elastic IP would make this reliable but adds cost.

---

## 8. Database Migrations

Migrations are run by `deploy.sh` via `backend/instance/migration/migration_script.py`.
The script is idempotent — safe to run multiple times.

To add a new column to the database, add it to `NEW_COLUMNS` in `migration_script.py`.
**Do not** rely solely on SQLAlchemy's `create_all()` for schema changes on existing
databases — it does not ALTER existing tables.
