# Odoo POS - Offline Point of Sale System

A portable, offline-first POS system built with Electron, Odoo 17 Community Edition, and PostgreSQL.

## Features

- ✅ **Fully Offline** - Works without internet connection
- ✅ **Self-Contained** - Bundles PostgreSQL and Odoo
- ✅ **Portable** - Copy to any Windows machine and run
- ✅ **Crash Resistant** - Data persists across power outages
- ✅ **Professional UI** - Full Odoo POS interface in fullscreen
- ✅ **Auto-Validation** - Checks all resources before startup
- ✅ **Easy Build** - Automated icon copying and build process

## Quick Start

### Automated Setup (Easiest)

**Option 1: Double-click** `SETUP-AUTO.bat` in Windows Explorer

**Option 2: Run PowerShell script**
```powershell
.\setup.ps1
```

**Option 3: Use npm script**
```powershell
npm run setup
```

All three methods will:
1. Copy the icon from Odoo resources
2. Install npm dependencies (electron, electron-builder)
3. Validate all embedded resources
4. Offer to start the POS system

### Manual Setup

```powershell
# 1. Clone repository (already done)
cd C:\Users\Alaa\Documents\githup\pos\posfinal

# 2. Install dependencies
npm install

# 3. Check everything is ready
npm run check

# 4. Run in development mode
npm start
```

### Building Installer

```powershell
# Build Windows installer
npm run build

# Output: dist/My POS Setup 1.0.0.exe (~600-800 MB)
```

For detailed setup, troubleshooting, and configuration, see **[SETUP.md](SETUP.md)**.

## System Requirements

- Windows 10/11 (64-bit)
- 4GB RAM minimum (8GB recommended)
- 2GB free disk space
- Node.js 18+ (for development only)

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
- Database user/password: odoo/odoo123
- Data directory: `./data/` (dev) or `%APPDATA%/odoo-pos/data/` (production)

**⚠️ Security**: Change default passwords in `main.js` before production deployment.

## Project Scripts

| Command | Description |
|---------|-------------|
| `npm run check` | Verify all resources and dependencies |
| `npm start` | Run in development mode |
| `npm run build` | Build Windows installer |
| `npm run build:dir` | Build unpacked (portable) version |

## Troubleshooting

### App won't start
```powershell
# Check logs
notepad data\logs\app-2025-12-07.log

# Verify resources
npm run check
```

### PostgreSQL fails
- Port 54320 might be in use. Change `CONFIG.pgPort` in main.js
- Delete `data/postgresql/` to reinitialize database

### Odoo errors
- Ensure Python packages are installed in `resources/python-3.10/Lib/site-packages/`
- Verify `run_odoo.py` exists in `resources/odoo/`
- Check logs for detailed error messages

### Build fails
- Ensure `icon.ico` exists (auto-copied via `npm run prebuild`)
- Run `node copy-icon.js` manually if needed
- Check `electron-builder` is installed: `npm list electron-builder`

For comprehensive troubleshooting, see **[SETUP.md](SETUP.md)**.

## Building Installer

(See detailed instructions in [SETUP.md](SETUP.md))

```powershell
npm run build
```

The installer will be created in `dist/My POS Setup 1.0.0.exe`.

## License

- Odoo: LGPL v3
- PostgreSQL: PostgreSQL License
- This wrapper: MIT

## Author

AynBeirut
