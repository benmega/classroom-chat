$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "                PREFLIGHT CHECK WORKFLOW                " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

function Assert-Success {
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Command failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}

# ---------------------------------------------------------

# BACKEND CHECKS
# ---------------------------------------------------------
Write-Host "`n[1/5] Running Backend Checks..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\..\backend"

# Linting
Write-Host " -> Running Ruff (Linter)..." -ForegroundColor DarkGray
ruff check . ; Assert-Success

# Testing
Write-Host " -> Running Pytest with Coverage..." -ForegroundColor DarkGray
python -m pytest --cov=. --cov-report=term ; Assert-Success

# Migration linter
Write-Host " -> Linting migrations for idempotency..." -ForegroundColor DarkGray
$env:FLASK_APP = "main.py"
python scripts/lint_migrations.py ; Assert-Success

# Prod migration simulation — run flask db upgrade against a copy of prod_users.db
Write-Host " -> Simulating prod migration against prod_users.db copy..." -ForegroundColor DarkGray
python scratch/sim_prod_migration.py ; Assert-Success

# Migrations Check
Write-Host " -> Checking Database Migrations (Dev)..." -ForegroundColor DarkGray
# flask db check will fail if the codebase models are out of sync with migrations
flask db check ; Assert-Success

# ---------------------------------------------------------
# FRONTEND CHECKS
# ---------------------------------------------------------
Write-Host "`n[2/5] Running Frontend Checks..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\..\frontend"

# Linting
Write-Host " -> Running ESLint..." -ForegroundColor DarkGray
npm run lint ; Assert-Success

# Testing
Write-Host " -> Running Vitest with Coverage..." -ForegroundColor DarkGray
npm run test -- --run --coverage ; Assert-Success

# Building
Write-Host " -> Verifying Vite Build..." -ForegroundColor DarkGray
npm run build ; Assert-Success

# ---------------------------------------------------------
# END-TO-END TESTS
# ---------------------------------------------------------
Write-Host "`n[3/5] Running End-to-End Tests..." -ForegroundColor Yellow
Write-Host " -> Starting temporary backend instance..." -ForegroundColor DarkGray

# Start backend in background
Set-Location "$PSScriptRoot\..\backend"
$backendProcess = Start-Process python -ArgumentList "main.py" -PassThru -NoNewWindow
Start-Sleep -Seconds 3 # Wait for backend to be ready

try {
    Set-Location "$PSScriptRoot\..\frontend"
    Write-Host " -> Running Playwright E2E Tests..." -ForegroundColor DarkGray
    npm run test:e2e
    if ($LASTEXITCODE -ne 0) { throw "E2E Tests failed with exit code $LASTEXITCODE" }
} finally {
    # Ensure backend is torn down even if tests fail
    Write-Host " -> Tearing down temporary backend instance..." -ForegroundColor DarkGray
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "           ALL CHECKS PASSED! SAFE TO MERGE.            " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
