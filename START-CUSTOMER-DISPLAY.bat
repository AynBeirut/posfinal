@echo off
title Customer Display - Ayn Beirut POS
echo.
echo ================================================
echo    CUSTOMER DISPLAY - AYN BEIRUT POS
echo ================================================
echo.
echo Opening customer display window...
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"

REM Find Chrome
set "CHROME_PATH="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

REM Find Edge
set "EDGE_PATH="
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE_PATH=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

REM Launch in app mode with Chrome or Edge
if defined CHROME_PATH (
    echo Starting with Google Chrome...
    start "" "%CHROME_PATH%" --app="file:///%SCRIPT_DIR%pos-v1\customer-display.html" --window-size=800,600
) else if defined EDGE_PATH (
    echo Starting with Microsoft Edge...
    start "" "%EDGE_PATH%" --app="file:///%SCRIPT_DIR%pos-v1\customer-display.html" --window-size=800,600
) else (
    echo Starting with default browser...
    start "" "%SCRIPT_DIR%pos-v1\customer-display.html"
)

echo.
echo Customer Display window opened!
echo You can close this console window now.
echo.
pause
