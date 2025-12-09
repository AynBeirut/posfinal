@echo off
REM 2-INSTALL-DEPENDENCIES.bat
REM Run this AFTER installing Node.js

echo.
echo ================================================================
echo          Installing Dependencies (npm install)
echo ================================================================
echo.
echo This will take 2-5 minutes...
echo Please wait...
echo.

npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================================
    echo          SUCCESS! Dependencies Installed
    echo ================================================================
    echo.
    echo Next step:
    echo   Double-click: 3-START-POS.bat
    echo.
) else (
    echo.
    echo ================================================================
    echo          ERROR: Installation Failed
    echo ================================================================
    echo.
    echo Make sure Node.js is installed!
    echo If not, double-click: 1-INSTALL-NODEJS.bat
    echo.
)

pause
