#!/usr/bin/env node
/**
 * Quick Start Script - Checks environment and provides helpful output
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function checkExists(filePath, name) {
    if (fs.existsSync(filePath)) {
        log(`✓ ${name}`, 'green');
        return true;
    } else {
        log(`✗ ${name} - NOT FOUND`, 'red');
        log(`  Expected: ${filePath}`, 'yellow');
        return false;
    }
}

console.log('\n' + '='.repeat(60));
log('Odoo POS - Pre-Flight Check', 'cyan');
console.log('='.repeat(60) + '\n');

let allGood = true;

// Check Node.js version
log('Checking Node.js version...', 'cyan');
const nodeVersion = process.version;
log(`  Node.js ${nodeVersion}`, 'green');

// Check npm dependencies
log('\nChecking npm dependencies...', 'cyan');
if (!fs.existsSync('node_modules')) {
    log('✗ node_modules not found', 'red');
    log('  Run: npm install', 'yellow');
    allGood = false;
} else {
    const hasElectron = fs.existsSync('node_modules/electron');
    const hasBuilder = fs.existsSync('node_modules/electron-builder');
    
    if (hasElectron) log('✓ electron', 'green');
    else { log('✗ electron', 'red'); allGood = false; }
    
    if (hasBuilder) log('✓ electron-builder', 'green');
    else { log('✗ electron-builder', 'red'); allGood = false; }
}

// Check icon
log('\nChecking build assets...', 'cyan');
const iconExists = checkExists('icon.ico', 'icon.ico');
if (!iconExists) {
    log('  Run: node copy-icon.js', 'yellow');
}

// Check resources
log('\nChecking embedded resources...', 'cyan');
allGood = checkExists('resources/postgresql-15/bin/postgres.exe', 'PostgreSQL 15') && allGood;
allGood = checkExists('resources/python-3.10/python.exe', 'Python 3.10') && allGood;
allGood = checkExists('resources/odoo/odoo-bin', 'Odoo binary') && allGood;
allGood = checkExists('resources/odoo/run_odoo.py', 'Odoo runner script') && allGood;

// Check data directory
log('\nChecking data directory...', 'cyan');
if (fs.existsSync('data')) {
    log('✓ data/ directory exists', 'green');
    
    if (fs.existsSync('data/postgresql/PG_VERSION')) {
        const pgVersion = fs.readFileSync('data/postgresql/PG_VERSION', 'utf8').trim();
        log(`  PostgreSQL ${pgVersion} initialized`, 'green');
    } else {
        log('  PostgreSQL not yet initialized (will happen on first run)', 'yellow');
    }
} else {
    log('✓ data/ directory will be created on first run', 'yellow');
}

// Summary
console.log('\n' + '='.repeat(60));
if (allGood) {
    log('✓ All checks passed! Ready to run.', 'green');
    console.log('\n' + colors.bold + 'Next steps:' + colors.reset);
    console.log('  Development: ' + colors.cyan + 'npm start' + colors.reset);
    console.log('  Build:       ' + colors.cyan + 'npm run build' + colors.reset);
} else {
    log('✗ Some checks failed. Please fix the issues above.', 'red');
    console.log('\n' + colors.bold + 'Quick fixes:' + colors.reset);
    if (!fs.existsSync('node_modules')) {
        console.log('  1. ' + colors.cyan + 'npm install' + colors.reset);
    }
    if (!iconExists) {
        console.log('  2. ' + colors.cyan + 'node copy-icon.js' + colors.reset);
    }
}
console.log('='.repeat(60) + '\n');

process.exit(allGood ? 0 : 1);
