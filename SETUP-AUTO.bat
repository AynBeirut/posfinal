@echo off
REM Odoo POS - Automated Setup (Windows Batch)
REM Double-click this file to set up and run the POS system

echo.
echo ================================================================
echo              Odoo POS - Automated Setup
echo ================================================================
echo.

REM Run the PowerShell setup script
powershell -ExecutionPolicy Bypass -File setup.ps1

pause
