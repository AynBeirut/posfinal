# Odoo POS - Automated Setup Script
# Run this script to automatically set up and test the POS system

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "              Odoo POS - Automated Setup                        " -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Copy Icon
Write-Host "Step 1: Copying icon from Odoo resources..." -ForegroundColor Yellow
$sourcePath = "resources\odoo\addons\point_of_sale\static\src\img\favicon.ico"
$destPath = "icon.ico"

if (Test-Path $sourcePath) {
    Copy-Item $sourcePath $destPath -Force
    Write-Host "✓ Icon copied successfully" -ForegroundColor Green
} else {
    Write-Host "⚠ Trying alternative icon location..." -ForegroundColor Yellow
    $altSource = "resources\odoo\addons\web\static\img\favicon.ico"
    if (Test-Path $altSource) {
        Copy-Item $altSource $destPath -Force
        Write-Host "✓ Icon copied from alternative source" -ForegroundColor Green
    } else {
        Write-Host "✗ Icon not found in resources" -ForegroundColor Red
    }
}
Write-Host ""

# Step 2: Check Node.js and npm
Write-Host "Step 2: Checking Node.js and npm..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green
    Write-Host "✓ npm $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js or npm not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host ""

# Step 3: Install dependencies
Write-Host "Step 3: Installing npm dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "This may take a few minutes..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ npm install failed" -ForegroundColor Red
        pause
        exit 1
    }
} else {
    Write-Host "✓ node_modules already exists (skipping)" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Validate resources
Write-Host "Step 4: Validating embedded resources..." -ForegroundColor Yellow
$resources = @(
    @{Path="resources\postgresql-15\bin\postgres.exe"; Name="PostgreSQL"},
    @{Path="resources\python-3.10\python.exe"; Name="Python 3.10"},
    @{Path="resources\odoo\odoo-bin"; Name="Odoo binary"},
    @{Path="resources\odoo\run_odoo.py"; Name="Odoo runner"}
)

$allGood = $true
foreach ($resource in $resources) {
    if (Test-Path $resource.Path) {
        Write-Host "✓ $($resource.Name)" -ForegroundColor Green
    } else {
        Write-Host "✗ $($resource.Name) - MISSING" -ForegroundColor Red
        $allGood = $false
    }
}
Write-Host ""

if (-not $allGood) {
    Write-Host "⚠ Some resources are missing. The app may not work." -ForegroundColor Red
    Write-Host "Please ensure the repository was cloned completely." -ForegroundColor Yellow
    Write-Host ""
}

# Step 5: Summary
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "                    Setup Complete!                             " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Test in development mode:" -ForegroundColor White
Write-Host "     npm start" -ForegroundColor Cyan
Write-Host "     (First run takes 3-5 minutes for database initialization)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. Build installer when ready:" -ForegroundColor White
Write-Host "     npm run build" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Ask user if they want to start now
$response = Read-Host "Would you like to start the POS system now? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host ""
    Write-Host "Starting Odoo POS..." -ForegroundColor Green
    Write-Host "Please wait, this will take 3-5 minutes on first run..." -ForegroundColor Yellow
    Write-Host ""
    npm start
} else {
    Write-Host ""
    Write-Host "Setup complete! Run 'npm start' when you're ready." -ForegroundColor Cyan
    Write-Host ""
}
