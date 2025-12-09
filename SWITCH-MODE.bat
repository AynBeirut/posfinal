@echo off
title Odoo POS - Mode Switcher
color 0E

echo.
echo ========================================
echo    ODOO POS MODE SWITCHER
echo ========================================
echo.
echo Choose your mode:
echo.
echo   [1] FULL MODE - Online Complete
echo       • All 52 modules enabled
echo       • HR, CRM, Projects, Sales, Purchasing
echo       • Full business management
echo       • Slower startup (2-5 minutes)
echo.
echo   [2] LITE MODE - Offline POS Only
echo       • Only 15 core POS modules
echo       • No HR, CRM, Projects
echo       • Fast startup (30 seconds)
echo       • Perfect for cashier terminals
echo.
echo ========================================
echo.

choice /c 12 /n /m "Select mode (1=FULL, 2=LITE): "

if errorlevel 2 goto LITE
if errorlevel 1 goto FULL

:FULL
echo.
echo [→] Switching to FULL MODE...
echo.
REM Remove any lite mode restrictions
if exist "%~dp0data\odoo.conf" (
    findstr /v "server_wide_modules" "%~dp0data\odoo.conf" > "%~dp0data\odoo.conf.tmp"
    move /y "%~dp0data\odoo.conf.tmp" "%~dp0data\odoo.conf" > nul
)
echo [✓] FULL MODE activated!
echo     All 52 modules will load on next startup
echo.
goto END

:LITE
echo.
echo [→] Switching to LITE MODE (POS Only)...
echo.
REM Create lite mode config
echo [options] > "%~dp0data\odoo-lite.conf"
echo server_wide_modules = base,web >> "%~dp0data\odoo-lite.conf"
echo limit_modules = base,web,uom,auth_totp,barcodes,product,stock,account,point_of_sale,pos_epson_printer,payment >> "%~dp0data\odoo-lite.conf"
move /y "%~dp0data\odoo-lite.conf" "%~dp0data\odoo.conf" > nul

echo [✓] LITE MODE activated!
echo.
echo Enabled modules:
echo   • base, web, uom (core)
echo   • auth_totp, barcodes (security)
echo   • product, stock (inventory)
echo   • account (basic accounting)
echo   • point_of_sale (POS main)
echo   • pos_epson_printer (receipt printer)
echo   • payment (payment processing)
echo.
echo Disabled modules:
echo   • hr_* (Human Resources)
echo   • crm_* (Customer Relations)
echo   • project_* (Project Management)
echo   • sale_* (Sales workflows)
echo   • purchase_* (Purchasing - except basic)
echo   • website_* (Website builder)
echo   • mrp_* (Manufacturing)
echo   • And 35+ other non-essential modules
echo.
goto END

:END
echo ========================================
echo.
echo IMPORTANT: Restart POS for changes to take effect!
echo.
echo To restart:
echo   1. Close any running POS windows
echo   2. Double-click BROWSER-POS.bat
echo.
pause
