# Odoo POS - Offline Point of Sale System

A portable, offline-first POS system built with Electron, Odoo 17 Community Edition, and PostgreSQL.

## Features

- ✅ **Fully Offline** - Works without internet connection
- ✅ **Self-Contained** - Bundles PostgreSQL and Odoo
- ✅ **Portable** - Copy to any Windows machine and run
- ✅ **Crash Resistant** - Data persists across power outages
- ✅ **Professional UI** - Full Odoo POS interface in fullscreen

## System Requirements

- Windows 10/11 (64-bit)
- 4GB RAM minimum
- 2GB free disk space

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Run the app: `npm start`

## First Run

On first run, the app will:
1. Initialize PostgreSQL database (takes 2-3 minutes)
2. Create database user
3. Start Odoo server
4. Load POS interface

## Architecture

```
odoo-pos/
├── resources/
│   ├── postgresql-15/     # Embedded PostgreSQL
│   ├── python-3.10/       # Python runtime with packages
│   └── odoo/              # Odoo 17 source code
├── data/
│   ├── postgresql/        # Database files (created at runtime)
│   └── logs/              # Application logs
├── main.js                # Electron main process
├── loading.html           # Startup loading screen
└── package.json
```

## Configuration

Key settings in `main.js`:
- PostgreSQL port: 54320 (non-standard to avoid conflicts)
- Odoo port: 8070
- Database name: posdb
- Data directory: `./data/`

## Troubleshooting

### App won't start
Check logs in `data/logs/app-YYYY-MM-DD.log`

### PostgreSQL fails
Port 54320 might be in use. Change `CONFIG.pgPort` in main.js

### Odoo errors
Ensure Python packages are installed in `resources/python-3.10/Lib/site-packages/`

## Building Installer

(TODO: Add electron-builder configuration)

## License

- Odoo: LGPL v3
- PostgreSQL: PostgreSQL License
- This wrapper: MIT

## Author

AynBeirut
