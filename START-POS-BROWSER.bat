@echo off
title Odoo POS - Starting Server
color 0A

echo.
echo ========================================
echo    STARTING ODOO POS SERVER
echo ========================================
echo.

cd /d "%~dp0"

REM Start server in background
echo [+] Starting Odoo server...
start /min cmd /c "npm start"

REM Wait a moment for server to initialize
timeout /t 3 /nobreak > nul

REM Open loading page in browser
echo [+] Opening browser with loading screen...
start chrome --new-window "%~dp0loading-page.html"

echo.
echo ========================================
echo   BROWSER OPENED!
echo ========================================
echo.
echo The loading page will automatically redirect
echo when the server is ready (2-3 minutes).
echo.
echo Login: admin
echo Password: admin
echo.
echo To stop server: Close this window
echo.
pause
