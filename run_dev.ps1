# Windows one-click start: opens the frontend and backend dev servers in separate windows.
# Paths are resolved from this script's location, so it works from any directory.
$root = $PSScriptRoot

# Launch the Frontend in a new window (Exposed to LAN)
Write-Host " Launching Frontend..." -ForegroundColor Cyan
# Note: '-- --host' tells Vite to listen on the LAN.
Start-Process powershell -WorkingDirectory (Join-Path $root 'frontend') -ArgumentList "-NoExit", "-Command", "& {npm run dev -- --host}"

# Launch the Backend in a new window (activating the backend virtualenv if there is one)
Write-Host " Launching Backend..." -ForegroundColor Yellow
$backendDir = Join-Path $root 'backend'
$backendCommand = "python main.py"
foreach ($venv in '.venv', 'venv') {
    $activate = Join-Path $backendDir "$venv\Scripts\Activate.ps1"
    if (Test-Path $activate) {
        $backendCommand = ". '$($activate.Replace("'", "''"))'; python main.py"
        break
    }
}
Start-Process powershell -WorkingDirectory $backendDir -ArgumentList "-NoExit", "-Command", "& {$backendCommand}"