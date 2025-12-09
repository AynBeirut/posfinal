#!/usr/bin/env node
/**
 * Automated Setup Script
 * Runs all setup steps automatically
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function step(num, message) {
    console.log('\n' + '─'.repeat(60));
    log(`Step ${num}: ${message}`, 'cyan');
    console.log('─'.repeat(60));
}

console.clear();
console.log('\n' + '═'.repeat(60));
log('Odoo POS - Automated Setup', 'bold');
console.log('═'.repeat(60) + '\n');

try {
    // Step 1: Copy Icon
    step(1, 'Copying icon from Odoo resources');
    const sourcePath = path.join(__dirname, 'resources', 'odoo', 'addons', 'point_of_sale', 'static', 'src', 'img', 'favicon.ico');
    const destPath = path.join(__dirname, 'icon.ico');
    
    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        log('✓ Icon copied successfully', 'green');
    } else {
        log('⚠ Warning: Source icon not found, will try alternative', 'yellow');
        const altSource = path.join(__dirname, 'resources', 'odoo', 'addons', 'web', 'static', 'img', 'favicon.ico');
        if (fs.existsSync(altSource)) {
            fs.copyFileSync(altSource, destPath);
            log('✓ Icon copied from alternative source', 'green');
        }
    }

    // Step 2: Check npm
    step(2, 'Checking npm installation');
    try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        log(`✓ npm version ${npmVersion}`, 'green');
    } catch (error) {
        log('✗ npm not found. Please install Node.js first.', 'red');
        process.exit(1);
    }

    // Step 3: Install dependencies
    step(3, 'Installing npm dependencies (this may take a few minutes)');
    if (!fs.existsSync('node_modules')) {
        log('Installing electron and electron-builder...', 'yellow');
        try {
            execSync('npm install', { 
                stdio: 'inherit',
                windowsHide: false 
            });
            log('✓ Dependencies installed', 'green');
        } catch (error) {
            log('✗ npm install failed', 'red');
            process.exit(1);
        }
    } else {
        log('✓ node_modules already exists (skipping)', 'yellow');
    }

    // Step 4: Validate resources
    step(4, 'Validating embedded resources');
    const checks = [
        { path: 'resources/postgresql-15/bin/postgres.exe', name: 'PostgreSQL' },
        { path: 'resources/python-3.10/python.exe', name: 'Python' },
        { path: 'resources/odoo/odoo-bin', name: 'Odoo' },
        { path: 'resources/odoo/run_odoo.py', name: 'Odoo Runner' }
    ];
    
    let allGood = true;
    for (const check of checks) {
        if (fs.existsSync(check.path)) {
            log(`✓ ${check.name}`, 'green');
        } else {
            log(`✗ ${check.name} - MISSING`, 'red');
            allGood = false;
        }
    }

    if (!allGood) {
        log('\n⚠ Some resources are missing. The app may not work correctly.', 'red');
    }

    // Step 5: Summary
    console.log('\n' + '═'.repeat(60));
    log('Setup Complete!', 'green');
    console.log('═'.repeat(60));
    
    console.log('\n' + colors.bold + 'Next Steps:' + colors.reset);
    console.log('  1. Test in development mode:');
    console.log('     ' + colors.cyan + 'npm start' + colors.reset);
    console.log('     (First run takes 3-5 minutes)');
    console.log('\n  2. Build installer when ready:');
    console.log('     ' + colors.cyan + 'npm run build' + colors.reset);
    
    console.log('\n' + colors.yellow + 'Note: First startup initializes PostgreSQL and Odoo (one-time, 3-5 min)' + colors.reset);
    console.log('      Subsequent starts will be much faster (30-60 seconds)\n');

    // Ask if user wants to start now
    console.log('─'.repeat(60));
    log('Would you like to start the POS system now? (npm start)', 'cyan');
    log('This will take 3-5 minutes on first run...', 'yellow');
    console.log('─'.repeat(60));
    console.log('\nTo start manually, run: ' + colors.cyan + 'npm start' + colors.reset + '\n');

} catch (error) {
    console.error('\n' + colors.red + 'Error during setup:' + colors.reset, error.message);
    process.exit(1);
}
