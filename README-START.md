# Odoo POS - Quick Start Guide

## How to Start the POS System

Simply **double-click** on:
```
START-POS.bat
```

That's it! The system will:
1. Stop any previous instances
2. Start PostgreSQL database
3. Start Odoo server
4. Open the POS window automatically

## First Time Setup

The first startup takes 1-2 minutes to initialize the database.
Please be patient and wait for the window to appear.

## What's Inside

- **PostgreSQL 15.4** - Embedded database (port 54320)
- **Python 3.10.11** - With all Odoo dependencies
- **Odoo 17 Community** - Full ERP/POS system
- **Electron** - Desktop wrapper

## Fixes Applied

✓ Missing `icon.ico` - Auto-copied from Odoo resources
✓ Database user creation - Fixed PostgreSQL role setup
✓ Missing `rjsmin` - Made optional with fallback
✓ Missing `OpenSSL` - Made optional (only needed for SMTP certificates)

## Notes

- All data is stored in the `data` folder
- Database runs on port 54320 (not the default 5432)
- Web interface is at http://localhost:8070
- POS system opens in fullscreen

## Troubleshooting

If the app doesn't start:
1. Double-click `START-POS.bat` again
2. Check that Node.js is installed
3. Wait at least 2 minutes on first run

## Building an Installer

To create a Windows installer:
```
npm run build
```

The installer will be in the `dist` folder.
