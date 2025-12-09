@echo off
REM 4-BUILD-INSTALLER.bat
REM Double-click this to build the Windows installer

echo.
echo ================================================================
echo          Building Windows Installer
echo ================================================================
echo.
echo This will create a .exe installer in the dist/ folder
echo This may take 5-10 minutes...
echo.
echo Please wait...
echo.

npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================================
    echo          SUCCESS! Installer Created
    echo ================================================================
    echo.
    echo Find your installer in:
    echo   dist\My POS Setup 1.0.0.exe
    echo.
    echo You can now install this on any Windows machine!
    echo.
) else (
    echo.
    echo ================================================================
    echo                    ERROR
    echo ================================================================
    echo.
    echo Make sure dependencies are installed first!
    echo   Double-click: 2-INSTALL-DEPENDENCIES.bat
    echo.
)

pause
