@echo off
title AYN BEIRUT POS
color 0B

echo.
echo  ========================================
echo     AYN BEIRUT POS v1.0
echo     Tech made in Beirut
echo  ========================================
echo.
echo  Starting POS system...
echo.

REM Try Chrome in app mode (boxed window)
where chrome >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start "" chrome --new-window --app="file:///%~dp0index.html" --window-size=1400,900 --disable-features=TranslateUI
    goto :success
)

REM Try Edge in app mode (boxed window)
where msedge >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start "" msedge --new-window --app="file:///%~dp0index.html" --window-size=1400,900
    goto :success
)

REM Fallback - try Chrome without app mode check
start "" chrome --new-window --app="file:///%~dp0index.html" --window-size=1400,900 2>nul
if %ERRORLEVEL% EQU 0 goto :success

REM Last resort - default browser
start "" "%~dp0index.html"

:success
echo  ✅ POS Started Successfully!
echo.
echo  Opening in boxed window mode...
echo  You can close this window.
timeout /t 2 >nul
exit
