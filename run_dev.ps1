# Launch the Frontend in a new window (Exposed to LAN)
Write-Host " Launching Frontend..." -ForegroundColor Cyan
# Note: '-- --host' works for Vite. See the frontend section below for other frameworks.
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {Set-Location frontend; npm run dev -- --host}"

# Launch the Backend in a new window
Write-Host " Launching Backend..." -ForegroundColor Yellow
# Note: You must modify your main.py file to listen on 0.0.0.0. See backend section below.
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {Set-Location backend; python main.py}"