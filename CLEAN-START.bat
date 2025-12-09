@echo off
cls
echo ===============================================
echo   ODOO POS - CLEAN START (FIXED VERSION)
echo ===============================================
echo.
echo This will delete the old corrupted database
echo and start fresh with all fixes applied.
echo.
echo Fixes included:
echo  - Database user creation (FIXED)
echo  - Missing rjsmin module (FIXED)
echo  - Missing OpenSSL module (FIXED)  
echo.
pause

echo.
echo [1/5] Stopping all processes...
taskkill /F /IM postgres.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 3 /nobreak >nul
echo Done!

echo.
echo [2/5] Deleting corrupted database...
cd /d "%~dp0"
if exist data (
    rmdir /S /Q data
    echo Database deleted!
) else (
    echo No database found (first run)
)

echo.
echo [3/5] Setting up Node.js path...
set "PATH=C:\Program Files\nodejs;%PATH%"
echo Done!

echo.
echo [4/5] Starting POS system...
echo.
echo PLEASE WAIT 1-2 MINUTES for initial setup...
echo The window will open automatically when ready.
echo.

echo [5/5] Launching...
npm start

echo.
echo.
if errorlevel 1 (
    echo ERROR: Failed to start!
    echo Make sure Node.js is installed.
) else (
    echo System stopped.
)

pause
