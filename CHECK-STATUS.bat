@echo off
REM CHECK-STATUS.bat
REM Double-click to check system status

echo.
echo ================================================================
echo              System Status Check
echo ================================================================
echo.

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js %%i
) else (
    echo [!!] Node.js NOT INSTALLED
    echo     Double-click: 1-INSTALL-NODEJS.bat
)

REM Check npm
npm --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('npm --version') do echo [OK] npm %%i
) else (
    echo [!!] npm NOT FOUND
)

echo.
REM Check icon
if exist "icon.ico" (
    echo [OK] icon.ico exists
) else (
    echo [!!] icon.ico missing
)

REM Check node_modules
if exist "node_modules\" (
    echo [OK] node_modules installed
) else (
    echo [!!] node_modules NOT INSTALLED
    echo     Double-click: 2-INSTALL-DEPENDENCIES.bat
)

echo.
REM Check resources
echo Checking embedded resources...
if exist "resources\postgresql-15\bin\postgres.exe" (
    echo [OK] PostgreSQL 15
) else (
    echo [!!] PostgreSQL missing
)

if exist "resources\python-3.10\python.exe" (
    echo [OK] Python 3.10
) else (
    echo [!!] Python missing
)

if exist "resources\odoo\odoo-bin" (
    echo [OK] Odoo binary
) else (
    echo [!!] Odoo missing
)

if exist "resources\odoo\run_odoo.py" (
    echo [OK] Odoo runner
) else (
    echo [!!] Odoo runner missing
)

echo.
REM Check data directory
if exist "data\postgresql\PG_VERSION" (
    for /f "tokens=*" %%i in ('type data\postgresql\PG_VERSION') do echo [OK] PostgreSQL initialized (version %%i)
) else (
    echo [--] PostgreSQL not yet initialized (will happen on first run)
)

echo.
echo ================================================================
echo                    Status Check Complete
echo ================================================================
echo.
echo Next steps:
if not exist "node_modules\" (
    echo   1. Install dependencies: 2-INSTALL-DEPENDENCIES.bat
    echo   2. Start POS: 3-START-POS.bat
) else (
    echo   Start POS: Double-click 3-START-POS.bat
)
echo.
pause
