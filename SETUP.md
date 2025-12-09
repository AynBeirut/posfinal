# Odoo POS - Setup and Testing Guide

## Prerequisites
- Windows 10/11 (64-bit)
- Node.js 18+ and npm (for development)
- 4GB RAM minimum
- 2GB free disk space

## Initial Setup

### 1. Install Dependencies
```powershell
cd C:\Users\Alaa\Documents\githup\pos\posfinal
npm install
```

This will:
- Install Electron and electron-builder
- Automatically copy the icon from Odoo resources via `postinstall` script

### 2. Verify Resources
After cloning, ensure these directories exist:
```
resources/
├── postgresql-15/
│   └── bin/postgres.exe
├── python-3.10/
│   └── python.exe
└── odoo/
    ├── odoo-bin
    └── run_odoo.py
```

### 3. Test in Development Mode
```powershell
npm start
```

**Expected behavior:**
1. Loading window appears
2. Status updates show:
   - "Validating resources..."
   - "Initializing database..." (first run only, 2-3 minutes)
   - "Starting database server..."
   - "Starting Odoo server..." (first run: 1-2 minutes)
   - "Opening POS interface..."
3. Fullscreen Odoo window opens at `http://localhost:8070/web`

**First-time initialization:**
- PostgreSQL database cluster creation: ~2-3 minutes
- Odoo module initialization: ~1-2 minutes
- Total first start: 3-5 minutes
- Subsequent starts: 30-60 seconds

### 4. Troubleshooting Development Mode

#### App won't start
Check logs:
```powershell
notepad data\logs\app-2025-12-07.log
```

#### PostgreSQL fails
- Port 54320 might be in use
- Check if another PostgreSQL instance is running
- View logs: `data\logs\app-*.log`

#### Odoo fails
- Check Python packages are installed in `resources\python-3.10\Lib\site-packages\`
- Verify `run_odoo.py` exists
- Check Odoo logs in the app log file

#### Application crashes on startup
- Run from terminal to see error messages:
  ```powershell
  .\node_modules\.bin\electron .
  ```

## Building Installer

### 1. Build Windows Installer
```powershell
npm run build
```

This will:
- Copy icon.ico automatically (prebuild script)
- Bundle all resources (~1.5 GB unpacked)
- Create NSIS installer in `dist/` folder
- Output: `dist/My POS Setup 1.0.0.exe` (~600-800 MB compressed)

### 2. Build Unpacked (for testing)
```powershell
npm run build:dir
```

Output: `dist/win-unpacked/` (portable folder, no installer)

### 3. Test the Built Installer
1. Install on a clean Windows machine
2. Run from Start Menu or Desktop shortcut
3. First run will initialize database
4. Subsequent runs should start in 30-60 seconds

## Database Management

### Location
- Development: `data/postgresql/`
- Production: `%APPDATA%\odoo-pos\data\postgresql\`

### Backup (Manual)
1. Open Odoo web interface: `http://localhost:8070/web`
2. Go to Settings → Database Manager
3. Click "Backup" → Download ZIP file
4. Save to safe location

### Restore
1. Open Database Manager
2. Click "Restore"
3. Upload ZIP backup file

### Alternative: File-based Backup
Copy the entire `data/` folder to backup location:
```powershell
# Backup
Copy-Item -Recurse data\ D:\Backups\pos-backup-$(Get-Date -Format 'yyyy-MM-dd')

# Restore
Copy-Item -Recurse D:\Backups\pos-backup-2025-12-07\* data\
```

## Configuration

### Odoo Admin Access
- **URL**: http://localhost:8070/web
- **Master Password**: `admin` (set in main.js CONFIG.odooMasterPassword)
- **Database**: `posdb`
- **First-time setup**: Create admin user via Odoo setup wizard

### Changing Ports
Edit `main.js`:
```javascript
const CONFIG = {
    pgPort: 54320,      // PostgreSQL port
    odooPort: 8070,     // Odoo web port
    // ...
};
```

### Changing Database Credentials
Edit `main.js`:
```javascript
const CONFIG = {
    pgUser: 'odoo',
    pgPassword: 'odoo123',  // Change this
    // ...
};
```

**⚠️ Important**: After changing credentials, delete `data/postgresql/` and restart to reinitialize.

## POS Module Configuration

### First-time POS Setup
1. Open Odoo: http://localhost:8070/web
2. Login with admin credentials
3. Go to: Apps → Point of Sale
4. Configure:
   - POS Name
   - Payment Methods (Cash, Card, etc.)
   - Products and Pricing
   - Receipt Printer (if hardware)
   - Cash Register

### Access POS Interface
1. Go to: Point of Sale → Dashboard
2. Click "New Session"
3. POS interface opens in fullscreen

### Keyboard Shortcuts
- **F11**: Toggle fullscreen
- **ESC**: Exit (with confirmation)

## Performance Tips

### Optimize for Production
1. **Disable Odoo Debug Mode** (if enabled)
2. **Close unused Odoo modules**
3. **Set PostgreSQL shared_buffers** (advanced):
   - Edit: `data/postgresql/postgresql.conf`
   - Set: `shared_buffers = 256MB` (adjust based on RAM)

### Fast Startup
- Keep app running in background (minimize instead of closing)
- Use SSD for `data/` directory
- Allocate adequate RAM (4GB minimum, 8GB recommended)

## Development

### Project Structure
```
posfinal/
├── main.js              # Electron main process
├── preload.js           # Renderer preload script
├── loading.html         # Loading screen UI
├── copy-icon.js         # Icon copy helper
├── package.json         # Node.js config
├── resources/           # Embedded software (1.5 GB)
│   ├── postgresql-15/
│   ├── python-3.10/
│   └── odoo/
└── data/                # Runtime data (created on first run)
    ├── postgresql/      # Database files
    └── logs/            # Application logs
```

### Making Changes

#### Update Odoo
1. Replace `resources/odoo/` with new version
2. Ensure Python dependencies match
3. Test in development mode
4. Rebuild installer

#### Update PostgreSQL
1. Replace `resources/postgresql-15/` with new version
2. Delete `data/postgresql/` to reinitialize
3. Test startup

#### Customize UI
- Loading screen: Edit `loading.html`
- Window behavior: Edit `createMainWindow()` in `main.js`
- Startup flow: Edit `startup()` in `main.js`

## Known Issues

### Long First Start
- PostgreSQL initialization: 2-3 minutes (normal)
- Odoo module init: 1-2 minutes (normal)
- **Solution**: Show progress to user (already implemented)

### Large Installer Size
- ~600-800 MB compressed
- ~1.5-2 GB unpacked
- **Cause**: Embedded PostgreSQL + Python + Odoo
- **Acceptable for offline-first POS system**

### Windows SmartScreen Warning
- **Cause**: Unsigned executable
- **Solution**: Code signing certificate (~$100-400/year)
- **Workaround**: Click "More info" → "Run anyway"

## Support

### Logs Location
- Development: `data/logs/app-YYYY-MM-DD.log`
- Production: `%APPDATA%\odoo-pos\data\logs\app-YYYY-MM-DD.log`

### Common Error Messages

**"PostgreSQL failed to start"**
- Port 54320 in use → Change `CONFIG.pgPort`
- Corrupted data → Delete `data/postgresql/` and restart

**"Odoo failed to start"**
- Python module errors → Check `resources/python-3.10/Lib/site-packages/`
- Database connection failed → Check PostgreSQL is running

**"Required resources are missing"**
- Incomplete installation → Reinstall
- Check `resources/` folder integrity

## Next Steps

1. **Test Development Mode**: `npm start`
2. **Configure POS**: Add products, payment methods
3. **Test Functionality**: Create test sales, print receipts
4. **Build Installer**: `npm run build`
5. **Deploy**: Install on target machine
6. **Backup**: Set up regular backup schedule

## Production Deployment Checklist

- [ ] Change default passwords in `main.js`
- [ ] Test on clean Windows machine
- [ ] Configure POS settings (products, payments)
- [ ] Train staff on POS usage
- [ ] Set up backup schedule
- [ ] Test hardware (receipt printer, barcode scanner)
- [ ] Document custom configurations
- [ ] (Optional) Obtain code signing certificate

---

**Version**: 1.0.0  
**Author**: AynBeirut  
**License**: MIT
