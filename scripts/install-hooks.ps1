# install-hooks.ps1
# Installs git hooks from scripts/hooks/ into .git/hooks/
# Run once after cloning: powershell scripts/install-hooks.ps1

$RepoRoot  = Resolve-Path "$PSScriptRoot\.."
$HooksSrc  = Join-Path $RepoRoot "scripts\hooks"
$HooksDest = Join-Path $RepoRoot ".git\hooks"

if (-not (Test-Path $HooksDest)) {
    Write-Error ".git/hooks not found -- are you running this from inside the repo?"
    exit 1
}

$installed = 0
foreach ($hook in Get-ChildItem -Path $HooksSrc) {
    $dest = Join-Path $HooksDest $hook.Name
    Copy-Item -Path $hook.FullName -Destination $dest -Force
    Write-Host "  Installed $($hook.Name) -> .git/hooks/$($hook.Name)" -ForegroundColor Green
    $installed++
}

if ($installed -eq 0) {
    Write-Warning "No hook files found in scripts/hooks/"
    exit 1
}

Write-Host "All $installed hook(s) installed." -ForegroundColor Cyan
Write-Host "Use git push --no-verify to bypass in an emergency." -ForegroundColor DarkGray
