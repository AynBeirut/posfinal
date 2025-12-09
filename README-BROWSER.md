# Odoo POS - Browser Mode (Recommended)

## Why Browser Mode is Better:

| Feature | Browser Mode | Electron Desktop |
|---------|--------------|------------------|
| **Startup Time** | 10-30 seconds | 5-10 minutes |
| **Memory Usage** | 200-400 MB | 800+ MB |
| **Loading Speed** | Fast | Very Slow |
| **UI/UX** | Professional | Basic |
| **Updates** | Automatic | Manual |
| **Offline Support** | Yes (PWA) | Limited |
| **Installation** | One click | Complex |

## Quick Start:

### Option 1: Click to Start
**Double-click:** `🌐-BROWSER-MODE-CLICK-HERE.bat`

### Option 2: Use Quick Menu
**Double-click:** `QUICK-START.bat` → Select option 1

## First Time Setup:

1. **Start the server:**
   ```
   Double-click: BROWSER-POS.bat
   ```

2. **Wait 20-30 seconds** for server to start

3. **Browser opens automatically**
   - Login: `admin`
   - Password: `admin`

4. **Install as Desktop App (Optional):**
   - Click ⊕ icon in address bar
   - Or Menu → "Install Odoo POS System"
   - Now launches like native app!

## Two Modes Available:

### 🟢 FULL MODE (Online - Default)
- All 52 modules enabled
- Complete business management
- HR, CRM, Projects, Sales, Purchasing
- Best for: Management, Back Office
- Startup: 2-5 minutes

### 🔵 LITE MODE (Offline POS)
- Only 15 core POS modules
- Fast startup (30 seconds)
- Perfect for cashier terminals
- Lower memory usage
- Best for: Point of Sale only

**To switch modes:**
```
Double-click: SWITCH-MODE.bat
Choose: 1 (Full) or 2 (Lite)
Restart POS
```

## Daily Usage:

### Starting POS:
1. Double-click `BROWSER-POS.bat`
2. Wait for browser to open
3. Login and use

### Stopping POS:
- Close browser window
- Close terminal window (to stop server)

**Or use:** `QUICK-START.bat` → Option 5 (Stop All)

## Auto-Start on Windows Boot:

Want POS to start automatically when Windows boots?

1. Press `Win+R`, type `shell:startup`, Enter
2. Create shortcut to `BROWSER-POS.bat`
3. POS starts automatically on boot!

## Troubleshooting:

### "Cannot connect" error:
- Make sure server is running: `BROWSER-POS.bat`
- Check http://localhost:8070 in browser

### Blank page after login:
- **First time:** Wait 30-60 seconds for assets to compile
- **After first time:** Should be instant (cached)
- Try refreshing (F5)

### Slow startup in FULL mode:
- Switch to LITE mode: `SWITCH-MODE.bat` → Option 2
- Only load modules you need

### Want to reset everything:
```
Double-click: CLEAN-START.bat
```

## Access from Other Devices:

Want to use POS from tablets/phones on same network?

1. Find your PC's IP address:
   ```
   ipconfig
   Look for: IPv4 Address (e.g., 192.168.1.100)
   ```

2. On tablet/phone browser:
   ```
   http://YOUR-IP:8070
   Example: http://192.168.1.100:8070
   ```

3. Login: admin / admin

## Security Notes:

- Default password is `admin` - **CHANGE IT!**
- Database master password: `admin` - **CHANGE IT!**
- Only accessible on local network (safe)
- For internet access, set up proper security

## Performance Tips:

1. **Use LITE mode** for POS terminals
2. **Use FULL mode** for management/back office
3. **Install as PWA** for faster startup
4. **Close unused browser tabs** to save memory
5. **Use Chrome/Edge** (better performance than Firefox)

## Files You Need:

✅ Keep these files:
- `BROWSER-POS.bat` - Main launcher
- `QUICK-START.bat` - Menu
- `SWITCH-MODE.bat` - Mode switcher
- `START-POS.bat` - Desktop app (backup)

❌ Can delete these (Electron-related):
- `1-INSTALL-NODEJS.bat`
- `2-INSTALL-DEPENDENCIES.bat`
- `4-BUILD-INSTALLER.bat`
- `Dockerfile`

## Support:

- Login credentials: admin / admin
- Web interface: http://localhost:8070
- Database: posdb
- Port: 8070 (Odoo), 54320 (PostgreSQL)

## Next Steps:

1. ✅ Test browser mode (10 seconds)
2. ✅ Install as PWA for desktop icon
3. ✅ Switch to LITE mode for faster POS
4. ✅ Set up auto-start on boot
5. ✅ Change default passwords

**Ready to go!** 🚀
