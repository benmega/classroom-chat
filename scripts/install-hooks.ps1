# install-hooks.ps1
# Points git at the tracked hooks in scripts/hooks/ (core.hooksPath). Run once after cloning:
#   powershell scripts/install-hooks.ps1
#
# Nothing is copied into .git/hooks, so the setting also works from git worktrees (where
# .git is a file, not a directory) and picks up later changes to the hooks automatically.
# core.hooksPath lives in the repository's shared config, so one run covers every worktree
# of this clone.

$ErrorActionPreference = "Stop"

$RepoRoot  = Resolve-Path "$PSScriptRoot\.."
$HooksSrc  = Join-Path $RepoRoot "scripts\hooks"

if (-not (Test-Path $HooksSrc)) {
    Write-Error "scripts/hooks not found -- are you running this from inside the repo?"
    exit 1
}

$hooks = @(Get-ChildItem -Path $HooksSrc -File)
if ($hooks.Count -eq 0) {
    Write-Warning "No hook files found in scripts/hooks/"
    exit 1
}

# A relative path is resolved against the top of the working tree the hook runs in.
git -C $RepoRoot config core.hooksPath scripts/hooks
if ($LASTEXITCODE -ne 0) {
    Write-Error "git config core.hooksPath failed (exit code $LASTEXITCODE)"
    exit $LASTEXITCODE
}

foreach ($hook in $hooks) {
    Write-Host "  Enabled $($hook.Name) (scripts/hooks/$($hook.Name))" -ForegroundColor Green
}

Write-Host "core.hooksPath = scripts/hooks ($($hooks.Count) hook(s) enabled)." -ForegroundColor Cyan
Write-Host "The pre-push hook needs ruff on PATH (pip install -r backend/requirements-dev.txt) and npm ci done in frontend/." -ForegroundColor DarkGray
Write-Host "Use git push --no-verify to bypass in an emergency." -ForegroundColor DarkGray
