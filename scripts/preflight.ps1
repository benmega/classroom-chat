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
# Mirrors the Linting and Tests workflows (.github/workflows/). Needs the backend test/lint
# tooling (ruff, mypy, pytest, ...) in the active venv:
#   pip install -r backend/requirements-dev.txt
# ---------------------------------------------------------
Write-Host "`n[1/4] Running Backend Checks..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\..\backend"

# Linting (CI lints backend/ only)
Write-Host " -> Running Ruff (Linter)..." -ForegroundColor DarkGray
ruff check . ; Assert-Success

Write-Host " -> Running Mypy (Type Check)..." -ForegroundColor DarkGray
python -m mypy . ; Assert-Success

# Security and Performance Analysis
Write-Host " -> Running Admin Authorization Check..." -ForegroundColor DarkGray
python scripts/check_admin_auth.py ; Assert-Success
Write-Host " -> Running N+1 Query Heuristic Check..." -ForegroundColor DarkGray
python scripts/check_n_plus_one.py ; Assert-Success

# Testing. The coverage floor is the one tests.yml enforces (keep the two numbers in step).
Write-Host " -> Running Pytest with Coverage..." -ForegroundColor DarkGray
python -m pytest --cov=application --cov-fail-under=92 ; Assert-Success

# Migration checks (the same scripts the Tests workflow runs)
Write-Host " -> Linting migrations for idempotency..." -ForegroundColor DarkGray
$env:FLASK_APP = "main.py"
python scripts/lint_migrations.py ; Assert-Success
Write-Host " -> Validating migrations for duplicate operations..." -ForegroundColor DarkGray
python scripts/validate_migrations.py ; Assert-Success

# Prod migration simulation: run flask db upgrade against a copy of prod_users.db.
# The helper is a local-only script (scratch/ is not tracked), so a fresh clone skips it.
if (Test-Path "scratch/sim_prod_migration.py") {
    Write-Host " -> Simulating prod migration against prod_users.db copy..." -ForegroundColor DarkGray
    python scratch/sim_prod_migration.py ; Assert-Success
} else {
    Write-Host " -> Skipped: prod migration simulation (backend/scratch/sim_prod_migration.py is not in this checkout)" -ForegroundColor DarkGray
}

# Migrations Check
Write-Host " -> Checking Database Migrations (Dev)..." -ForegroundColor DarkGray
# flask db check will fail if the codebase models are out of sync with migrations
flask db check ; Assert-Success

# ---------------------------------------------------------
# FRONTEND CHECKS
# ---------------------------------------------------------
Write-Host "`n[2/4] Running Frontend Checks..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\..\frontend"

# Linting
Write-Host " -> Running ESLint..." -ForegroundColor DarkGray
npm run lint ; Assert-Success

# Testing
Write-Host " -> Running Vitest with Coverage..." -ForegroundColor DarkGray
npm run test -- --run --coverage ; Assert-Success

# Building
Write-Host " -> Verifying Vite Build (Simulating Prod Constraints)..." -ForegroundColor DarkGray
npm run build:strict ; Assert-Success

# Only dist/assets is the JS/CSS bundle. The rest of dist is a copy of public/ (images, fonts),
# which would swamp the figure and make the warning fire on every run.
$distSize = (Get-ChildItem -Path dist/assets -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host (" -> Frontend Bundle Size (dist/assets): {0:N2} MB" -f $distSize) -ForegroundColor DarkGray
# 5.15 MB on 2026-10-28 (three.js, MUI and react-admin are the big chunks); warn about 15% above that.
$bundleWarnMB = 6.0
if ($distSize -gt $bundleWarnMB) {
    Write-Warning "Frontend bundle size ($("{0:N2}" -f $distSize) MB) is over $bundleWarnMB MB. Consider debloating."
}

# ---------------------------------------------------------
# PUBLIC IMAGE SIZES
# ---------------------------------------------------------
Write-Host "`n[3/4] Checking public image sizes..." -ForegroundColor Yellow

# Everything in public/ is copied into dist/ and uploaded to S3 on every deploy.
# TODO(#112): this only warns while the oversized originals are still in the tree. Once they
# are compressed, set $imageSizeIsFatal to $true so a new 1 MB+ image fails the preflight.
$imageSizeIsFatal = $false
$imageLimitBytes = 1MB
$bigImages = @(Get-ChildItem -Path public/images -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt $imageLimitBytes })
foreach ($img in $bigImages) {
    $relative = $img.FullName.Substring((Get-Location).Path.Length + 1)
    Write-Host ("    {0:N2} MB  {1}" -f ($img.Length / 1MB), $relative) -ForegroundColor DarkGray
}
if ($bigImages.Count -gt 0) {
    $message = "$($bigImages.Count) file(s) under frontend/public/images are over 1 MB. Compress or resize them before they reach the deploy."
    if ($imageSizeIsFatal) {
        Write-Error $message
        exit 1
    }
    Write-Warning $message
} else {
    Write-Host " -> No image over 1 MB." -ForegroundColor DarkGray
}

# ---------------------------------------------------------
# END-TO-END TESTS
# ---------------------------------------------------------
Write-Host "`n[4/4] Running End-to-End Tests..." -ForegroundColor Yellow

# The E2E users must exist in the dev database (the Tests workflow seeds them the same way).
Write-Host " -> Seeding E2E test users..." -ForegroundColor DarkGray
Set-Location "$PSScriptRoot\..\backend"
$env:FLASK_ENV = "development"
python scripts/seed_e2e_users.py ; Assert-Success

# playwright.config.js starts the backend (python main.py, waiting on /server/health) and the
# Vite dev server itself and stops them afterwards, so nothing is started by hand here. A dev
# backend or dev server that is already running on port 8000 / 5173 is reused instead.
Set-Location "$PSScriptRoot\..\frontend"
Write-Host " -> Running Playwright E2E Tests..." -ForegroundColor DarkGray
npm run test:e2e
if ($LASTEXITCODE -ne 0) { throw "E2E Tests failed with exit code $LASTEXITCODE" }

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "           ALL CHECKS PASSED! SAFE TO MERGE.            " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
