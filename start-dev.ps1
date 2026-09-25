# Bhopali Safar - The Great Desi Jugaad (PowerShell Dev Launcher)
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  BHOPALI SAFAR: THE GREAT DESI JUGAAD - DEV LAUNCHER" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/3] Checking Node.js..." -ForegroundColor Green
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not found! Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Pause
    Exit 1
}

Write-Host "[2/3] Checking node_modules..." -ForegroundColor Green
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
}

Write-Host "[3/3] Starting Vite Dev Server..." -ForegroundColor Green
Write-Host "Opening browser at http://localhost:5173/..." -ForegroundColor Yellow

# Launch browser after 2 seconds in background job
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:5173/"
} | Out-Null

# Start Vite
npx vite --port 5173 --host
