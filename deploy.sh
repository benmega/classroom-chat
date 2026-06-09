#!/usr/bin/env bash
#
# File: deploy.sh
# Location: ~/classroom-chat/deploy.sh
# Summary: Production deployment with automated rollback on health-check failure.
#
# Prerequisites (one-time server setup):
#   - venv at ~/classroom-chat/venv  (pip install -r backend/requirements.txt)
#   - backend/.env with FLASK_ENV, SECRET_KEY, ADMIN_PASSWORD, DATABASE_URL
#   - Swap file (sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile &&
#                sudo mkswap /swapfile && sudo swapon /swapfile)
#   - nodejs/npm installed via NodeSource LTS
#   - nginx configured (see docs/infrastructure_and_devops.md)
#   - gunicorn service WorkingDirectory set to ~/classroom-chat/backend

set -euo pipefail

# -------------------------
# Configuration
# -------------------------
APP_DIR="$HOME/classroom-chat"
SERVICE_NAME="gunicorn-benmega"

# venv lives at project root (not inside backend/)
VENV_PATH="$APP_DIR/venv"
PYTHON_BIN="$VENV_PATH/bin/python3"
PIP_CMD=("$PYTHON_BIN" -m pip)
REQUIREMENTS_FILE="$APP_DIR/backend/requirements.txt"

# Flask app puts its DB and migrations inside backend/instance/
MIGRATIONS_DIR="$APP_DIR/backend/migrations"
DB_FILE="$APP_DIR/backend/instance/prod_users.db"
BACKUP_DIR="$APP_DIR/backend/instance/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DB_BACKUP_FILE="$BACKUP_DIR/pre_deploy_$TIMESTAMP.db"

# Health check
HEALTHCHECK_URL="http://127.0.0.1:8000/server/health"
HEALTHCHECK_TIMEOUT=5
HEALTHCHECK_RETRIES=5

DRY_RUN="${DRY_RUN:-0}"

# Save current git head for potential rollback
PREVIOUS_COMMIT=$(git -C "$APP_DIR" rev-parse HEAD)

run() {
    if [[ "$DRY_RUN" == "1" ]]; then
        echo "[DRY RUN] $*"
    else
        "$@"
    fi
}

rollback() {
    echo "CRITICAL: Health check failed. Rolling back to $PREVIOUS_COMMIT..."
    run git -C "$APP_DIR" reset --hard "$PREVIOUS_COMMIT"
    run sudo systemctl restart "$SERVICE_NAME"
    echo "Rollback complete. Check logs with: journalctl -u $SERVICE_NAME"
    exit 1
}

# -------------------------
# Preflight checks
# -------------------------
echo "Running preflight checks..."

# Abort if .env is missing — running without it uses insecure dev defaults
if [[ ! -f "$APP_DIR/backend/.env" ]]; then
    echo "ERROR: $APP_DIR/backend/.env not found."
    echo "Create it with FLASK_ENV, SECRET_KEY, ADMIN_PASSWORD, and DATABASE_URL before deploying."
    exit 1
fi

# Warn if swap is not active (npm build will OOM-kill on low-RAM instances)
if ! swapon --show | grep -q .; then
    echo "WARNING: No swap space is active. npm build may be OOM-killed on small instances."
    echo "Fix: sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile"
fi

echo "Starting deploy..."

# -------------------------
# Code update
# -------------------------
# Note: Code is already updated by the GitHub Action SSH step before calling this script.
# We keep this as a fallback but commented out.
# cd "$APP_DIR"
# echo "Updating code..."
# run git fetch origin
# run git reset --hard origin/deploy-gunicorn

# -------------------------
# Dependency verification
# -------------------------
if [[ -f "$REQUIREMENTS_FILE" ]]; then
    echo "Updating Python dependencies..."
    run "${PIP_CMD[@]}" install -r "$REQUIREMENTS_FILE"
fi

# -------------------------
# Nginx configuration
# -------------------------
echo "Updating Nginx configuration..."
if [[ -f "$APP_DIR/infrastructure/nginx/api-blossom.benmega.com.conf" ]]; then
    run sudo cp "$APP_DIR/infrastructure/nginx/api-blossom.benmega.com.conf" "/etc/nginx/sites-available/benmega"
    run sudo systemctl reload nginx
else
    echo "WARNING: Nginx configuration not found in repository at $APP_DIR/infrastructure/nginx/api-blossom.benmega.com.conf"
fi

# -------------------------
# DNS Update Script
# -------------------------
echo "Updating and executing DNS boot script..."
if [[ -f "$APP_DIR/infrastructure/update-dns.sh" ]]; then
    run cp "$APP_DIR/infrastructure/update-dns.sh" "$HOME/update-dns.sh"
    run chmod +x "$HOME/update-dns.sh"
    # Execute immediately to update Route 53 to api-blossom.benmega.com
    run "$HOME/update-dns.sh"
fi

# -------------------------
# Database backup
# -------------------------
if [[ -f "$DB_FILE" ]]; then
    echo "Backing up database..."
    run mkdir -p "$BACKUP_DIR"
    run cp "$DB_FILE" "$DB_BACKUP_FILE"
    echo "Backup stored at $DB_BACKUP_FILE"
fi

# -------------------------
# Migrations & Database Initialization
# -------------------------
echo "Initializing/updating database..."
(
    cd "$APP_DIR/backend"
    # Ensure we run in production mode so it hits prod_users.db

    # Create schema from models if DB doesn't exist or is empty
    echo "Ensuring database schema is up-to-date..."
    run env FLASK_APP=main.py FLASK_ENV=production "$PYTHON_BIN" << 'PYEOF'
from main import app
from application.extensions import db

with app.app_context():
    # Create all tables from models (idempotent - won't fail if tables exist)
    db.create_all()
    print("Database schema initialized/verified")
PYEOF

    # Apply any pending migrations (currently none, but future migrations will run here)
    run env FLASK_APP=main.py FLASK_ENV=production "$PYTHON_BIN" -m flask db upgrade || echo "Note: No migrations to apply"

    # Run the idempotent multi-tenant classroom migration script
    echo "Running custom classroom migration script..."
    run env FLASK_APP=main.py FLASK_ENV=production "$PYTHON_BIN" -m tools.migrate_classroom || true
)

# -------------------------
# Service restart
# -------------------------
echo "Restarting service..."
run sudo systemctl restart "$SERVICE_NAME"

# -------------------------
# Health check & Automated Rollback
# -------------------------
echo "Waiting for health check..."

ATTEMPT=1
until curl -fsS --max-time "$HEALTHCHECK_TIMEOUT" "$HEALTHCHECK_URL" > /dev/null; do
    if [[ "$ATTEMPT" -ge "$HEALTHCHECK_RETRIES" ]]; then
        rollback
    fi

    echo "Attempt $ATTEMPT/$HEALTHCHECK_RETRIES failed. Retrying..."
    ATTEMPT=$((ATTEMPT + 1))
    sleep 2
done

echo "Health check passed. Deploy successful!"