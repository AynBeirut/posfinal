@echo off
title Odoo POS - Quick Start Menu
color 0B

:MENU
cls
echo.
echo ╔════════════════════════════════════════╗
echo ║     ODOO POS - QUICK START MENU        ║
echo ╚════════════════════════════════════════╝
echo.
echo   [1] Start POS in Browser (Recommended)
echo   [2] Start POS in Electron Desktop App
echo   [3] Switch Mode (Full/Lite)
echo   [4] Open in Browser (Server Already Running)
echo   [5] Stop All POS Services
echo   [6] View Status
echo   [7] Exit
echo.
echo ════════════════════════════════════════
echo.

choice /c 1234567 /n /m "Select option (1-7): "

if errorlevel 7 goto EXIT
if errorlevel 6 goto STATUS
if errorlevel 5 goto STOP
if errorlevel 4 goto OPEN
if errorlevel 3 goto SWITCH
if errorlevel 2 goto ELECTRON
if errorlevel 1 goto BROWSER

:BROWSER
cls
echo.
echo [→] Starting POS in Browser Mode...
echo.
call BROWSER-POS.bat
goto MENU

:ELECTRON
cls
echo.
echo [→] Starting POS in Desktop App Mode...
echo.
call START-POS.bat
goto MENU

:SWITCH
cls
call SWITCH-MODE.bat
goto MENU

:OPEN
cls
echo.
echo [→] Opening browser to existing server...
start chrome --app=http://localhost:8070/web/login?db=posdb
echo.
echo [✓] Browser opened!
timeout /t 2 /nobreak > nul
goto MENU

:STOP
cls
echo.
echo [→] Stopping all POS services...
taskkill /F /IM postgres.exe 2>nul
taskkill /F /IM python.exe 2>nul
taskkill /F /IM electron.exe 2>nul
taskkill /F /IM node.exe 2>nul
echo.
echo [✓] All services stopped!
timeout /t 2 /nobreak > nul
goto MENU

:STATUS
cls
echo.
echo ════════════════════════════════════════
echo    CURRENT STATUS
echo ════════════════════════════════════════
echo.
tasklist /FI "IMAGENAME eq postgres.exe" 2>NUL | find /I /N "postgres.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [✓] PostgreSQL: RUNNING
) else (
    echo [✗] PostgreSQL: STOPPED
)

tasklist /FI "IMAGENAME eq python.exe" 2>NUL | find /I /N "python.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [✓] Odoo Server: RUNNING
) else (
    echo [✗] Odoo Server: STOPPED
)

tasklist /FI "IMAGENAME eq electron.exe" 2>NUL | find /I /N "electron.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [✓] Desktop App: RUNNING
) else (
    echo [✗] Desktop App: STOPPED
)

echo.
echo Access URLs:
echo   Browser: http://localhost:8070
echo   Login: admin / admin
echo.
echo ════════════════════════════════════════
pause
goto MENU

:EXIT
cls
echo.
echo Thank you for using Odoo POS!
echo.
timeout /t 2 /nobreak > nul
exit
