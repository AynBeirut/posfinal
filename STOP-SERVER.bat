@echo off
title Stopping Odoo POS Server
color 0C

echo.
echo Stopping all POS services...
echo.

taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM postgres.exe /T 2>nul
taskkill /F /IM electron.exe /T 2>nul

echo.
echo [OK] All services stopped!
echo.
timeout /t 2 /nobreak > nul
