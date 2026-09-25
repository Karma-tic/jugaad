@echo off
title Bhopali Safar - The Great Desi Jugaad (Dev Server)
echo ========================================================
echo   BHOPALI SAFAR: THE GREAT DESI JUGAAD - DEV LAUNCHER
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/3] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not found in PATH!
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [2/3] Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies, please wait...
    call npm install
)

echo [3/3] Starting Vite dev server...
echo.
echo --------------------------------------------------------
echo   Game URL: http://localhost:5173/
echo   Server ko stop karne ke liye is window me Ctrl + C dabayein.
echo --------------------------------------------------------
echo.

:: Automatically open browser after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:5173/"

:: Start Vite dev server on port 5173 with host enabled
call npx vite --port 5173 --host

pause
