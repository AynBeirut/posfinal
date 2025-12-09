@echo off
cls
echo ===============================================
echo   ODOO POS - START SYSTEM
echo ===============================================
echo.

REM Stop any running processes
taskkill /F /IM postgres.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Change to the POS directory
cd /d "%~dp0"

REM Set Node.js path
set "PATH=C:\Program Files\nodejs;%PATH%"

echo Starting Odoo POS System...
echo Please wait for the window to open...
echo.

REM Start the application
npm start
