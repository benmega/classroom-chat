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
# run git reset --hard origin/deploy

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
# ARCHITECTURE NOTE — read before changing this section:
#
# Alembic is the single source of truth for schema management.
# We distinguish two cases:
#
#   FRESH INSTALL (no alembic_version table):
#     db.create_all() builds the schema directly from the current ORM models,
#     then we stamp to head so Alembic knows the DB is already current.
#     flask db upgrade is then a no-op.
#
#   EXISTING INSTALL (alembic_version table present):
#     Alembic owns the schema. flask db upgrade applies any pending migrations.
#     db.create_all() is NOT called — it would silently create tables that
#     migrations expect to be absent, causing every subsequent migration to fail.
#
# DO NOT add db.create_all() back here. If you need a new table, write an
# Alembic migration: cd backend && flask db migrate -m "description"
echo "Initializing/updating database..."
(
    cd "$APP_DIR/backend"

    echo "Bootstrapping database (fresh install check)..."
    run env FLASK_APP=main.py FLASK_ENV=production "$PYTHON_BIN" << 'PYEOF'
import os, sys
from main import app
from application.extensions import db
from sqlalchemy import inspect, text
from alembic.config import Config
from alembic import command

with app.app_context():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()

    if 'alembic_version' not in tables:
        # Fresh install: no Alembic tracking exists yet.
        # Create all tables from the current models and stamp to head.
        # flask db upgrade (below) will then be a no-op.
        print("Fresh install detected: creating schema from models...")
        db.create_all()

        migrations_dir = os.path.join(os.path.dirname(os.path.abspath('main.py')), 'migrations')
        alembic_cfg = Config(os.path.join(migrations_dir, 'alembic.ini'))
        alembic_cfg.set_main_option('script_location', migrations_dir)
        alembic_cfg.set_main_option('sqlalchemy.url', str(app.config['SQLALCHEMY_DATABASE_URI']))
        command.stamp(alembic_cfg, 'head')
        print("Schema created and stamped to head. Alembic is now the owner.")
    else:
        # Existing install: Alembic owns the schema.
        # Let flask db upgrade handle everything below.
        with db.engine.connect() as conn:
            current = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        print(f"Existing database detected (stamp: {current}). Alembic will apply pending migrations.")
PYEOF

    # Heal a dangling alembic stamp. If alembic_version points to a revision that no
    # longer exists in the codebase (a "ghost" left by deleted migrations), purge the
    # stamp so upgrade can run from base. This only fires when genuinely broken.
    echo "Checking alembic revision state..."
    if ! run env FLASK_APP=main.py FLASK_ENV=production "$PYTHON_BIN" -m flask db current > /dev/null 2>&1; then
        echo "WARNING: alembic_version references a missing revision; purging dangling stamp..."
        run env FLASK_APP=main.py FLASK_ENV=production "$PYTHON_BIN" -m flask db stamp base --purge
    fi

    # Apply pending migrations.
    # On a fresh install this is a no-op (already stamped to head above).
    # On an existing install this applies any outstanding revisions.
    # set -e means a failed migration aborts the deploy — we never restart the
    # service on a schema that doesn't match the code.
    echo "Applying migrations..."
    run env FLASK_APP=main.py FLASK_ENV=production "$PYTHON_BIN" -m flask db upgrade

    # Run the data-seeding script (inserts reserved rows, backfills enrolments, etc.).
    # This is intentionally separate from Alembic — it handles data, not schema.
    echo "Running data seeding script..."
    run env FLASK_APP=main.py FLASK_ENV=production "$PYTHON_BIN" -m tools.migrate_classroom
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