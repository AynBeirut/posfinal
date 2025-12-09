@echo off
title Odoo POS - Web Server Only
color 0A

echo.
echo ========================================
echo    ODOO POS - WEB MODE (NO ELECTRON)
echo ========================================
echo.

cd /d "%~dp0"

REM Start PostgreSQL
echo [1/3] Starting PostgreSQL...
start /min "" "resources\postgresql-15\bin\pg_ctl.exe" -D "data\postgresql" -l "data\postgresql.log" -o "-p 54320" start

REM Wait for PostgreSQL
timeout /t 5 /nobreak > nul

REM Start Odoo directly with Python (NO ELECTRON)
echo [2/3] Starting Odoo server...
start "Odoo Server" "resources\python-3.10\python.exe" "resources\odoo\run_odoo.py" --db_host=localhost --db_port=54320 --db_user=odoo --db_password=odoo123 --http-port=8070 --addons-path="resources\odoo\addons" --data-dir="data"

REM Wait for Odoo to start
echo [3/3] Waiting for Odoo to start (30 seconds)...
timeout /t 30 /nobreak

REM Open browser
echo.
echo [OK] Opening browser...
start chrome --new-window "file:///%~dp0redirect.html"

echo.
echo ========================================
echo   SERVER RUNNING!
echo ========================================
echo.
echo URL: http://localhost:8070
echo Login: admin
echo Password: admin
echo.
echo IMPORTANT: First load takes 2-3 minutes
echo while Odoo compiles web assets.
echo Just wait - page will appear!
echo.
echo To stop: Press Ctrl+C, then run STOP-SERVER.bat
echo.
pause
