#!/bin/bash
# Database sync utilities for classroom-chat
# Manages production database backups and development environment sync

set -euo pipefail

# Get the absolute path to the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PROD_HOST="api-blossom.benmega.com"
PROD_USER="ubuntu"
SSH_KEY="$HOME/.ssh/test-key.pem"
PROD_DB_PATH="classroom-chat/backend/instance/prod_users.db"

LOCAL_BACKUP_DIR="$PROJECT_ROOT/backend/instance/backups"
LOCAL_DEV_DB="$PROJECT_ROOT/backend/instance/dev_users.db"
LOCAL_PROD_BACKUP="$LOCAL_BACKUP_DIR/prod_users.db"

# Ensure backup directory exists
mkdir -p "$LOCAL_BACKUP_DIR"

# Function to pull prod database and sync dev
sync_from_prod() {
    echo "🔄 Syncing development environment with production database..."
    echo "   • Pulling prod database from $PROD_HOST"

    # Backup the current prod backup with timestamp
    if [ -f "$LOCAL_PROD_BACKUP" ]; then
        TIMESTAMP=$(date +%s)
        cp "$LOCAL_PROD_BACKUP" \
            "$LOCAL_BACKUP_DIR/prod_users_backup_$TIMESTAMP.db"
        echo "   • Archived previous prod backup"
    fi

    # Pull latest prod database
    scp -i "$SSH_KEY" \
        "$PROD_USER@$PROD_HOST:$PROD_DB_PATH" \
        "$LOCAL_PROD_BACKUP"

    echo "   • Downloaded latest prod database"

    # Replace dev database with prod for testing
    cp "$LOCAL_PROD_BACKUP" "$LOCAL_DEV_DB"

    echo "   ✓ Dev environment now synced with production"
    echo "   • dev_users.db updated to match production"
}

# Function to restore dev database from prod backup
restore_dev_from_backup() {
    if [ ! -f "$LOCAL_PROD_BACKUP" ]; then
        echo "❌ Error: No prod backup found at:"
        echo "   $LOCAL_PROD_BACKUP"
        echo
        echo "Run '$0 sync' first to create a backup."
        exit 1
    fi

    echo "🔄 Restoring dev database from prod backup..."

    cp "$LOCAL_PROD_BACKUP" "$LOCAL_DEV_DB"

    echo "✓ Dev database restored to last synced production state"
}

show_help() {
    SCRIPT_NAME="$(basename "$0")"

    echo "Database Sync Utility"
    echo
    echo "Usage:"
    echo "  $SCRIPT_NAME sync"
    echo "  $SCRIPT_NAME restore"
    echo "  $SCRIPT_NAME help"
    echo
    echo "Commands:"
    echo "  sync      Pull production database and update dev_users.db"
    echo "  restore   Restore dev_users.db from the last downloaded backup"
    echo "  help      Show this help message"
}

case "${1:-help}" in
    sync)
        sync_from_prod
        ;;
    restore)
        restore_dev_from_backup
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo
        show_help
        exit 1
        ;;
esac