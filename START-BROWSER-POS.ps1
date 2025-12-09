# Start POS in Browser Mode
Write-Host ""
Write-Host "========================================"
Write-Host "   ODOO POS - BROWSER MODE"
Write-Host "========================================"
Write-Host ""

$posPath = "C:\Users\Alaa\Documents\githup\pos\posfinal"
$pgPath = "$posPath\resources\postgresql-15\bin"
$pythonPath = "$posPath\resources\python-3.10\python.exe"
$odooPath = "$posPath\resources\odoo"
$dataPath = "$posPath\data"

# Start PostgreSQL
Write-Host "[→] Starting PostgreSQL..."
$pgDataDir = "$dataPath\postgresql"
$pgLogFile = "$dataPath\postgresql.log"
& "$pgPath\pg_ctl.exe" -D "$pgDataDir" -l "$pgLogFile" -o "-p 54320" start

# Wait for PostgreSQL
Write-Host "[→] Waiting for database (5 seconds)..."
Start-Sleep -Seconds 5

# Start Odoo
Write-Host "[→] Starting Odoo server..."
$odooArgs = @(
    "$odooPath\run_odoo.py",
    "--db_host=localhost",
    "--db_port=54320",
    "--db_user=odoo",
    "--db_password=odoo123",
    "--http-port=8070",
    "--addons-path=$odooPath\addons",
    "--data-dir=$dataPath"
)

Start-Process -FilePath $pythonPath -ArgumentList $odooArgs -WindowStyle Normal

# Wait for Odoo startup
Write-Host "[→] Waiting for Odoo (30 seconds)..."
Write-Host "     This is normal on first start"
Write-Host ""

for ($i = 1; $i -le 30; $i++) {
    Write-Host "     $i seconds..." -NoNewline
    Start-Sleep -Seconds 1
    if ($i % 5 -eq 0) { Write-Host "" }
}

Write-Host ""
Write-Host ""
Write-Host "[→] Opening browser..."

# Open in Chrome
Start-Process "chrome.exe" "--app=http://localhost:8070/web/login?db=posdb"

Write-Host ""
Write-Host "========================================"
Write-Host "  POS RUNNING IN BROWSER!"
Write-Host "========================================"
Write-Host ""
Write-Host "Login: admin"
Write-Host "Password: admin"
Write-Host ""
Write-Host "If page is blank, wait 30-60 seconds for"
Write-Host "assets to compile (first time only)"
Write-Host ""
Write-Host "To stop: Close this window"
Write-Host ""

# Keep window open
Read-Host "Press Enter to stop POS server"

# Cleanup
Write-Host "[→] Stopping services..."
Stop-Process -Name "python" -Force -ErrorAction SilentlyContinue
& "$pgPath\pg_ctl.exe" -D "$pgDataDir" stop
Write-Host "[✓] Stopped"
