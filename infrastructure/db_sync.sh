#!/bin/bash
# Database sync utilities for classroom-chat
# Manages production database backups and development environment sync

set -e

PROD_HOST="api-blossom.benmega.com"
PROD_USER="ubuntu"
SSH_KEY="~/.ssh/test-key.pem"
PROD_DB_PATH="classroom-chat/backend/instance/prod_users.db"
LOCAL_BACKUP_DIR="./backend/instance/backups"
LOCAL_DEV_DB="./backend/instance/dev_users.db"
LOCAL_PROD_BACKUP="./backend/instance/backups/prod_users.db"

# Ensure backup directory exists
mkdir -p "$LOCAL_BACKUP_DIR"

# Function to pull prod database and sync dev
sync_from_prod() {
    echo "🔄 Syncing development environment with production database..."
    echo "   • Pulling prod database from $PROD_HOST"

    # Backup the current prod backup with timestamp
    if [ -f "$LOCAL_PROD_BACKUP" ]; then
        TIMESTAMP=$(date +%s)
        cp "$LOCAL_PROD_BACKUP" "$LOCAL_BACKUP_DIR/prod_users_backup_$TIMESTAMP.db"
        echo "   • Archived previous prod backup"
    fi

    # Pull latest prod database
    scp -i "$SSH_KEY" "$PROD_USER@$PROD_HOST:$PROD_DB_PATH" "$LOCAL_PROD_BACKUP"
    echo "   • Downloaded latest prod database"

    # Replace dev database with prod for testing
    cp "$LOCAL_PROD_BACKUP" "$LOCAL_DEV_DB"
    echo "   ✓ Dev environment now synced with production"
    echo "   • dev_users.db updated to match production"
}

# Function to restore dev database from prod backup
restore_dev_from_backup() {
    if [ ! -f "$LOCAL_PROD_BACKUP" ]; then
        echo "❌ Error: No prod backup found at $LOCAL_PROD_BACKUP"
        echo "   Run 'db_sync.sh sync' first to create a backup"
        exit 1
    fi

    echo "🔄 Restoring dev database from prod backup..."
    cp "$LOCAL_PROD_BACKUP" "$LOCAL_DEV_DB"
    echo "✓ Dev database restored to last synced production state"
}

# Display help
show_help() {
    echo "Database Sync Utility"
    echo ""
    echo "Usage: ./infrastructure/db_sync.sh [command]"
    echo ""
    echo "Commands:"
    echo "  sync      Pull production database from EC2 and sync dev environment"
    echo "  restore   Restore dev_users.db from last prod backup (quick rollback)"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./infrastructure/db_sync.sh sync      # Update both prod backup and dev from production"
    echo "  ./infrastructure/db_sync.sh restore   # Rollback dev to last synced state"
}

# Main logic
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
        show_help
        exit 1
        ;;
esac
