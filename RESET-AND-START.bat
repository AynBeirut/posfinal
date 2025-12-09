@echo off
echo ===============================================
echo   ODOO POS - RESET AND START
echo ===============================================
echo.
echo This will delete the database and start fresh.
echo.
pause

echo.
echo Stopping any running processes...
taskkill /F /IM postgres.exe 2>nul
taskkill /F /IM python.exe 2>nul
taskkill /F /IM electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Deleting old data...
if exist data (
    rmdir /S /Q data
    echo Data folder deleted.
) else (
    echo No data folder found.
)

echo.
echo Starting POS system...
echo.
echo Please wait for the application window to open...
echo.

cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
npm start

pause
