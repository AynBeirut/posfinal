@echo off
REM ===================================
REM AYN BEIRUT POS - AUTOMATED TEST LAUNCHER
REM Opens test suite and main POS for testing
REM ===================================

echo.
echo ========================================
echo    AYN BEIRUT POS - TEST MODE
echo    Automated Testing Suite
echo ========================================
echo.
echo Starting automated tests...
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
set TEST_SUITE=%SCRIPT_DIR%pos-v1\test-suite.html
set DB_TEST=%SCRIPT_DIR%pos-v1\database-test.html
set POS_APP=%SCRIPT_DIR%pos-v1\index.html

echo [1] Opening Test Suite...
REM Check if Chrome is available
where chrome >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start chrome --new-window "file:///%TEST_SUITE:\=/%" --window-size=1200,900
    timeout /t 2 /nobreak >nul
    echo [2] Opening Database Test...
    start chrome "file:///%DB_TEST:\=/%" --window-size=900,800
    timeout /t 2 /nobreak >nul
    echo [3] Opening POS Application...
    start chrome --app="file:///%POS_APP:\=/%" --window-size=1400,900
) else (
    REM Try Edge
    where msedge >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        start msedge --new-window "file:///%TEST_SUITE:\=/%" --window-size=1200,900
        timeout /t 2 /nobreak >nul
        echo [2] Opening Database Test...
        start msedge "file:///%DB_TEST:\=/%" --window-size=900,800
        timeout /t 2 /nobreak >nul
        echo [3] Opening POS Application...
        start msedge --app="file:///%POS_APP:\=/%" --window-size=1400,900
    ) else (
        REM Fall back to default browser
        echo Opening in default browser...
        start "" "%TEST_SUITE%"
        timeout /t 2 /nobreak >nul
        start "" "%DB_TEST%"
        timeout /t 2 /nobreak >nul
        start "" "%POS_APP%"
    )
)

echo.
echo ========================================
echo Test environment launched!
echo.
echo WINDOWS OPENED:
echo [1] Test Suite    - Run automated tests
echo [2] Database Test - Check DB status
echo [3] POS App       - Main application
echo.
echo INSTRUCTIONS:
echo - Click "Run All Tests" in Test Suite
echo - Check user credentials in Database Test
echo - Test POS features in main app
echo.
echo Press any key to exit this window...
echo ========================================
pause >nul
