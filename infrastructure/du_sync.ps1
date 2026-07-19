# Database sync utilities for classroom-chat
# Manages production database backups and development environment sync.

$ErrorActionPreference = "Stop"

$ScriptPath = $MyInvocation.MyCommand.Path
$ScriptDir = Split-Path -Parent $ScriptPath
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")

$ProdHost = "api-blossom.benmega.com"
$ProdUser = "ubuntu"
$HomeDir = [System.Environment]::GetFolderPath('UserProfile')
$SshKey = Join-Path $HomeDir ".ssh\test-key.pem"
$ProdDbPath = "classroom-chat/backend/instance/prod_users.db"

$LocalBackupDir = Join-Path $ProjectRoot "backend\instance\backups"
$LocalDevDb = Join-Path $ProjectRoot "backend\instance\dev_users.db"
$LocalProdBackup = Join-Path $LocalBackupDir "prod_users.db"

# Ensure backup directory exists
if (-not (Test-Path $LocalBackupDir)) {
    New-Item -ItemType Directory -Path $LocalBackupDir -Force | Out-Null
}

function Sync-FromProd {
    Write-Host "🔄 Syncing development environment with production database..."
    Write-Host "   • Pulling prod database from $ProdHost"

    # Backup the current prod backup with timestamp
    if (Test-Path $LocalProdBackup) {
        $Timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        $BackupFile = Join-Path $LocalBackupDir "prod_users_backup_$Timestamp.db"
        Copy-Item -Path $LocalProdBackup -Destination $BackupFile -Force
        Write-Host "   • Archived previous prod backup"
    }

    # Pull latest prod database using scp
    scp -i "$SshKey" "${ProdUser}@${ProdHost}:${ProdDbPath}" "$LocalProdBackup"

    Write-Host "   • Downloaded latest prod database"

    # Replace dev database with prod for testing
    Copy-Item -Path $LocalProdBackup -Destination $LocalDevDb -Force

    Write-Host "   ✓ Dev environment now synced with production"
    Write-Host "   • dev_users.db updated to match production"
}

function Restore-DevFromBackup {
    if (-not (Test-Path $LocalProdBackup)) {
        Write-Host "❌ Error: No prod backup found at:"
        Write-Host "   $LocalProdBackup"
        Write-Host ""
        Write-Host "Run '.\du_sync.ps1 sync' first to create a backup."
        exit 1
    }

    Write-Host "🔄 Restoring dev database from prod backup..."

    Copy-Item -Path $LocalProdBackup -Destination $LocalDevDb -Force

    Write-Host "✓ Dev database restored to last synced production state"
}

function Show-Help {
    $ScriptName = Split-Path -Leaf $ScriptPath
    if (-not $ScriptName) { $ScriptName = "du_sync.ps1" }

    Write-Host "Database Sync Utility"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\$ScriptName sync"
    Write-Host "  .\$ScriptName restore"
    Write-Host "  .\$ScriptName help"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  sync      Pull production database and update dev_users.db"
    Write-Host "  restore   Restore dev_users.db from the last downloaded backup"
    Write-Host "  help      Show this help message"
}

$Command = if ($args.Count -gt 0) { $args[0] } else { "help" }

switch ($Command) {
    "sync" {
        Sync-FromProd
    }
    "restore" {
        Restore-DevFromBackup
    }
    "help" {
        Show-Help
    }
    "-h" {
        Show-Help
    }
    "--help" {
        Show-Help
    }
    Default {
        Write-Host "❌ Unknown command: $Command"
        Write-Host ""
        Show-Help
        exit 1
    }
}
