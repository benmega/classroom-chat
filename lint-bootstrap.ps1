# ------------------------------------------------------------
# Name: lint-bootstrap.ps1
# Type: PowerShell script
# Location: repo root
# Summary: Creates lint cleanup branch, runs formatter, commits,
#          runs linter autofix, commits.
# ------------------------------------------------------------

$ErrorActionPreference = "Stop"

# Configuration
$BRANCH_NAME = "chore/lint-cleanup"

# Commands
$PY_FORMAT_CMD = "python -m black ."
$PY_LINT_FIX_CMD = "python -m ruff check . --fix"
$FRONTEND_FORMAT_CMD = "npx prettier --write `"**/*.{js,html,css}`""

# Ensure clean working tree
if (git status --porcelain) {
    Write-Error "Working tree is not clean. Commit or stash changes first."
}

# Create and switch to branch
git checkout -b $BRANCH_NAME

# ----------------------------
# FORMATTERS
# ----------------------------
Write-Host "Running Python formatter (black)..."
Invoke-Expression $PY_FORMAT_CMD

Write-Host "Running frontend formatter (prettier)..."
Invoke-Expression $FRONTEND_FORMAT_CMD

if (git status --porcelain) {
    git add .
    git commit -m "chore: apply formatters (black, prettier)"
} else {
    Write-Host "No formatter changes detected."
}

# ----------------------------
# LINTER AUTOFIX
# ----------------------------
Write-Host "Running Python linter autofix (ruff)..."
Invoke-Expression $PY_LINT_FIX_CMD

if (git status --porcelain) {
    git add .
    git commit -m "chore: apply ruff autofixes"
} else {
    Write-Host "No linter autofix changes detected."
}

Write-Host "Lint cleanup branch ready."
