# AYN BEIRUT POS - Automated Test Launcher
# PowerShell Script for automatic testing

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   AYN BEIRUT POS - AUTO TEST MODE" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$testSuite = Join-Path $scriptPath "pos-v1\test-suite.html"
$dbTest = Join-Path $scriptPath "pos-v1\database-test.html"
$posApp = Join-Path $scriptPath "pos-v1\index.html"

Write-Host "[1/3] Launching Test Suite..." -ForegroundColor Green
Start-Process chrome "--new-window `"file:///$($testSuite -replace '\\','/')`" --window-size=1200,900" -ErrorAction SilentlyContinue

Start-Sleep -Milliseconds 1500

Write-Host "[2/3] Launching Database Test..." -ForegroundColor Green
Start-Process chrome "`"file:///$($dbTest -replace '\\','/')`" --window-size=900,800" -ErrorAction SilentlyContinue

Start-Sleep -Milliseconds 1500

Write-Host "[3/3] Launching POS Application..." -ForegroundColor Green
Start-Process chrome "--app=`"file:///$($posApp -replace '\\','/')`" --window-size=1400,900" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ All test windows launched!" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Go to Test Suite window" -ForegroundColor White
Write-Host "2. Click 'Run All Tests' button" -ForegroundColor White
Write-Host "3. Check results" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
