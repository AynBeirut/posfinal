@echo off
REM 3-START-POS.bat
REM Double-click this to start the POS system

echo.
echo ================================================================
echo              Starting Odoo POS System
echo ================================================================
echo.
echo First run takes 3-5 minutes (database initialization)
echo After that: 30-60 seconds to start
echo.
echo Please wait...
echo.

npm start

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ================================================================
    echo                    ERROR
    echo ================================================================
    echo.
    echo If dependencies not installed:
    echo   Double-click: 2-INSTALL-DEPENDENCIES.bat
    echo.
    pause
)
