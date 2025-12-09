@echo off
REM Apply all POS fixes automatically

echo.
echo ========================================
echo   Applying POS System Fixes
echo ========================================
echo.

cd /d "%~dp0pos-v1"

echo [1/7] Fixing search and barcode icons position...
powershell -Command "(Get-Content index.html) -replace '<input type=\"text\" id=\"product-search\"([^>]*)>\s*<span class=\"search-icon\">🔍</span>', '<span class=\"search-icon\">🔍</span>`n                    <input type=\"text\" id=\"product-search\"$1>' | Set-Content index.html"

powershell -Command "(Get-Content index.html) -replace '<input type=\"text\" id=\"barcode-input\"([^>]*)>\s*<span class=\"barcode-icon\">📷</span>', '<span class=\"barcode-icon\">📷</span>`n                    <input type=\"text\" id=\"barcode-input\"$1>' | Set-Content index.html"

echo [2/7] Removing export data button...
powershell -Command "(Get-Content index.html) -replace '<button id=\"export-data-btn\"[^>]*>💾</button>\s*', '' | Set-Content index.html"

echo [3/7] Fixing logout redirect...
powershell -Command "(Get-Content js\auth.js) -replace 'window\.location\.href = ''login\.html'';', 'window.location.href = ''index.html'';' | Set-Content js\auth.js"

echo [4/7] Fixing reports sales list ID...
powershell -Command "(Get-Content js\reports.js) -replace 'getElementById\(''sales-list''\)', 'getElementById(''recent-sales-table'')' | Set-Content js\reports.js"

echo [5/7] Updating database version...
powershell -Command "(Get-Content js\db.js) -replace 'const DB_VERSION = 3;', 'const DB_VERSION = 4;' | Set-Content js\db.js"

echo [6/7] Adding customers script to index.html...
powershell -Command "$content = Get-Content index.html -Raw; if($content -notmatch 'customers.js'){$content = $content -replace '(<script src=\"js/payment.js\"></script>)', '$1`n    <script src=\"js/customers.js\"></script>'; Set-Content index.html $content}"

echo [7/7] Copying to production release...
xcopy /E /I /Y . "..\AynBeirutPOS-Release"

echo.
echo ========================================
echo   Fixes Applied Successfully!
echo ========================================
echo.
pause
