@echo off
REM ===================================
REM AYN BEIRUT POS v1.0 - LAUNCHER
REM Starts the POS system in browser
REM ===================================

echo.
echo ========================================
echo    AYN BEIRUT POS v1.0
echo    Tech made in Beirut
echo ========================================
echo.
echo Starting POS system...
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
set POS_DIR=%SCRIPT_DIR%pos-v1

REM Check if Chrome is available for app mode
where chrome >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Opening in Chrome app mode...
    start chrome --app="file:///%POS_DIR:\=/%/index.html" --window-size=1400,900
) else (
    REM Try Edge
    where msedge >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo Opening in Edge app mode...
        start msedge --app="file:///%POS_DIR:\=/%/index.html" --window-size=1400,900
    ) else (
        REM Fall back to default browser
        echo Opening in default browser...
        start "" "%POS_DIR%\index.html"
    )
)

echo.
echo POS system started!
echo Press any key to exit this window...
pause >nul
