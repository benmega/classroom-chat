# Launch the Frontend in a new window
Write-Host " Launching Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {Set-Location frontend; npm run dev}"

# Launch the Backend in a new window
Write-Host " Launching Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {Set-Location backend; python main.py}"