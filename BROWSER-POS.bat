@echo off
title Odoo POS - Browser Mode
color 0A

echo.
echo ========================================
echo    ODOO POS - BROWSER MODE
echo ========================================
echo.

REM Check if already running
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [✓] Server already running!
    echo [→] Opening browser...
    timeout /t 2 /nobreak > nul
    start chrome --app=http://localhost:8070/web/login?db=posdb
    exit
)

echo [→] Starting POS server...
start /min cmd /c "cd /d %~dp0 && npm start"

echo [→] Waiting for server startup...
echo     (This takes about 20-30 seconds)
echo.

REM Wait with progress indicator
for /L %%i in (1,1,20) do (
    echo     %%i seconds...
    timeout /t 1 /nobreak > nul
)

echo.
echo [→] Opening POS in browser...
start chrome --app=http://localhost:8070/web/login?db=posdb

echo.
echo ========================================
echo   POS RUNNING IN BROWSER!
echo ========================================
echo.
echo Login: admin
echo Password: admin
echo.
echo To close POS: Close the browser window
echo To stop server: Close this window
echo.
pause
