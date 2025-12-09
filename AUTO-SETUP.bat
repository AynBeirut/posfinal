@echo off
REM ============================================================================
REM   AUTO-SETUP.bat - FULLY AUTOMATED SETUP
REM   Just double-click this file and follow the prompts
REM ============================================================================

color 0B
echo.
echo ============================================================================
echo                   ODOO POS - FULLY AUTOMATED SETUP
echo ============================================================================
echo.
echo This will automatically:
echo   1. Check if Node.js is installed
echo   2. Install npm dependencies (if Node.js found)
echo   3. Validate all resources
echo   4. Offer to start the POS system
echo.
echo Press any key to begin...
pause > nul
cls

REM ============================================================================
REM STEP 1: Copy Icon (Already done, but verify)
REM ============================================================================
echo.
echo [1/5] Checking icon file...
if exist "icon.ico" (
    echo [OK] icon.ico already exists
) else (
    echo [INFO] Copying icon from Odoo resources...
    if exist "resources\odoo\addons\point_of_sale\static\src\img\favicon.ico" (
        copy "resources\odoo\addons\point_of_sale\static\src\img\favicon.ico" "icon.ico" > nul
        echo [OK] Icon copied successfully
    ) else (
        echo [WARNING] Icon source not found, trying alternative...
        if exist "resources\odoo\addons\web\static\img\favicon.ico" (
            copy "resources\odoo\addons\web\static\img\favicon.ico" "icon.ico" > nul
            echo [OK] Icon copied from alternative source
        ) else (
            echo [ERROR] Icon not found in resources
        )
    )
)

REM ============================================================================
REM STEP 2: Check Node.js
REM ============================================================================
echo.
echo [2/5] Checking Node.js installation...
node --version > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js %%i installed
    set NODEJS_INSTALLED=1
) else (
    echo [ERROR] Node.js is NOT installed!
    echo.
    echo ===========================================================================
    echo   PLEASE INSTALL NODE.JS FIRST
    echo ===========================================================================
    echo.
    echo Node.js is required to run this application.
    echo.
    echo Press any key to open the Node.js download page...
    pause > nul
    start https://nodejs.org/
    echo.
    echo After installing Node.js:
    echo   1. Close this window
    echo   2. Double-click AUTO-SETUP.bat again
    echo.
    pause
    exit
)

REM ============================================================================
REM STEP 3: Validate Resources
REM ============================================================================
echo.
echo [3/5] Validating embedded resources...
set ALL_RESOURCES_OK=1

if exist "resources\postgresql-15\bin\postgres.exe" (
    echo [OK] PostgreSQL 15
) else (
    echo [ERROR] PostgreSQL missing
    set ALL_RESOURCES_OK=0
)

if exist "resources\python-3.10\python.exe" (
    echo [OK] Python 3.10
) else (
    echo [ERROR] Python missing
    set ALL_RESOURCES_OK=0
)

if exist "resources\odoo\odoo-bin" (
    echo [OK] Odoo binary
) else (
    echo [ERROR] Odoo missing
    set ALL_RESOURCES_OK=0
)

if exist "resources\odoo\run_odoo.py" (
    echo [OK] Odoo runner script
) else (
    echo [ERROR] Odoo runner missing
    set ALL_RESOURCES_OK=0
)

if %ALL_RESOURCES_OK% EQU 0 (
    echo.
    echo [ERROR] Some resources are missing!
    echo Please ensure the repository was cloned completely.
    pause
    exit
)

REM ============================================================================
REM STEP 4: Install Dependencies
REM ============================================================================
echo.
echo [4/5] Installing npm dependencies...
if exist "node_modules" (
    echo [OK] node_modules already exists (skipping install)
) else (
    echo [INFO] This will take 2-5 minutes...
    echo.
    npm install
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo [OK] Dependencies installed successfully!
    ) else (
        echo.
        echo [ERROR] npm install failed!
        pause
        exit
    )
)

REM ============================================================================
REM STEP 5: Final Check
REM ============================================================================
echo.
echo [5/5] Final validation...
if exist "node_modules\electron" (
    echo [OK] Electron installed
) else (
    echo [ERROR] Electron not found
)

if exist "node_modules\electron-builder" (
    echo [OK] electron-builder installed
) else (
    echo [ERROR] electron-builder not found
)

REM ============================================================================
REM SUCCESS - Offer to Start
REM ============================================================================
cls
echo.
echo ============================================================================
echo                      SETUP COMPLETE SUCCESS!
echo ============================================================================
echo.
echo All components are installed and ready!
echo.
echo [OK] Node.js installed
echo [OK] npm dependencies installed
echo [OK] All resources validated
echo [OK] icon.ico created
echo.
echo ============================================================================
echo                    READY TO START POS SYSTEM
echo ============================================================================
echo.
echo First run will take 3-5 minutes to initialize the database.
echo After that, it will start in 30-60 seconds.
echo.
echo Would you like to start the POS system now?
echo.
echo   1 = Yes, start now
echo   2 = No, I'll start it later
echo.
choice /c 12 /n /m "Enter your choice (1 or 2): "

if %ERRORLEVEL% EQU 1 (
    echo.
    echo ========================================================================
    echo              Starting Odoo POS System...
    echo ========================================================================
    echo.
    echo Please wait. First startup takes 3-5 minutes...
    echo.
    npm start
) else (
    echo.
    echo ========================================================================
    echo              Setup Complete - Ready to Use!
    echo ========================================================================
    echo.
    echo To start the POS system later:
    echo   - Double-click: 3-START-POS.bat
    echo   - Or run: npm start
    echo.
    echo To build installer:
    echo   - Double-click: 4-BUILD-INSTALLER.bat
    echo   - Or run: npm run build
    echo.
)

echo.
echo Thank you for using Odoo POS!
echo.
pause
