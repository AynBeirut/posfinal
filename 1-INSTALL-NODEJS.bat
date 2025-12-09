@echo off
REM 1-INSTALL-NODEJS.bat
REM This will open the Node.js download page in your browser

echo.
echo ================================================================
echo        Opening Node.js Download Page in Browser
echo ================================================================
echo.
echo Once Node.js is installed:
echo   1. Close this window
echo   2. Double-click: 2-INSTALL-DEPENDENCIES.bat
echo.
echo Press any key to open browser...
pause > nul

start https://nodejs.org/

echo.
echo Browser opened!
echo.
echo Next step after installing Node.js:
echo   Double-click: 2-INSTALL-DEPENDENCIES.bat
echo.
pause
