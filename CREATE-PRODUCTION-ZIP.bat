@echo off
REM ===================================
REM CREATE PRODUCTION ZIP FOR TESTERS
REM ===================================

echo.
echo ========================================
echo  Creating Production Package
echo ========================================
echo.

set SOURCE_DIR=%~dp0pos-v1
set OUTPUT_FILE=%~dp0AynBeirutPOS-Production.zip

REM Check if PowerShell is available
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PowerShell not found!
    echo Please install PowerShell to create ZIP file.
    pause
    exit /b 1
)

echo Collecting files...
echo.

REM Create ZIP using PowerShell
powershell -Command "Compress-Archive -Path '%SOURCE_DIR%\*' -DestinationPath '%OUTPUT_FILE%' -Force"

if exist "%OUTPUT_FILE%" (
    echo.
    echo ========================================
    echo ✅ SUCCESS!
    echo ========================================
    echo.
    echo Production package created:
    echo %OUTPUT_FILE%
    echo.
    echo File is ready to upload to Google Drive!
    echo.
    echo What's included:
    echo  - All POS application files
    echo  - START-POS.bat (quick launcher)
    echo  - README-TESTERS.md (testing guide)
    echo  - Full offline functionality
    echo.
) else (
    echo.
    echo ❌ ERROR: Failed to create ZIP file!
    echo.
)

echo Press any key to exit...
pause >nul
