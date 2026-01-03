#!/usr/bin/env bash
#
# File: deploy.sh
# Location: ~/classroom-chat/deploy.sh
# Summary: Production deployment with automated rollback on health-check failure.

set -euo pipefail

# -------------------------
# Configuration
# -------------------------
APP_DIR="$HOME/classroom-chat"
MIGRATIONS_DIR="$APP_DIR/migration"
SERVICE_NAME="gunicorn-benmega"

# Use Virtual Environment path
VENV_PATH="$APP_DIR/venv"
PYTHON_BIN="$VENV_PATH/bin/python3"
PIP_CMD=("$PYTHON_BIN" -m pip)
REQUIREMENTS_FILE="$APP_DIR/requirements.txt"

# Database Configuration
DB_FILE="$APP_DIR/instance/app.db" # Updated to a generic name
BACKUP_DIR="$APP_DIR/instance/backups"
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

echo "Starting deploy..."

# -------------------------
# Code update
# -------------------------
cd "$APP_DIR"
echo "Updating code..."
run git fetch origin
run git reset --hard origin/deploy-gunicorn

# -------------------------
# Dependency verification
# -------------------------
if [[ -f "$REQUIREMENTS_FILE" ]]; then
    echo "Updating dependencies in virtual environment..."
    run "${PIP_CMD[@]}" install -r "$REQUIREMENTS_FILE"
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
# Migrations
# -------------------------
echo "Running migrations..."
# Run within subshell to maintain directory context
(
    cd "$MIGRATIONS_DIR"
    run "$PYTHON_BIN" migration_script.py
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