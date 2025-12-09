# Install POS as Progressive Web App (PWA)

## What is PWA?
A Progressive Web App lets you install the POS system like a native desktop app:
- Works offline
- Launches from desktop/start menu
- Fullscreen experience (no browser UI)
- Auto-updates when online
- Professional look and feel

## How to Install:

### Method 1: Chrome/Edge (Recommended)

1. **Open POS in browser:**
   - Double-click `BROWSER-POS.bat`
   - Or go to: http://localhost:8070

2. **Install the app:**
   - Click the ⊕ icon in address bar (right side)
   - Or click menu (⋮) → "Install Odoo POS System"
   - Click "Install"

3. **Launch installed app:**
   - Find "Odoo POS System" in Start Menu
   - Or on Desktop (if you chose that option)
   - Double-click to launch

### Method 2: Manual Desktop Shortcut

Create a file on desktop: `POS.bat`

```batch
@echo off
start chrome --app=http://localhost:8070/web/login?db=posdb
```

## Features When Installed:

✅ **Launches like native app** - No browser tabs/address bar
✅ **Offline support** - Works without internet (after first load)
✅ **Fast startup** - Cached assets load instantly
✅ **Auto-updates** - Gets updates automatically when online
✅ **Fullscreen mode** - Professional POS experience
✅ **Desktop icon** - Easy access from desktop/taskbar

## Server Must Be Running:

⚠️ **Important:** The POS server must be running for the app to work.

**Auto-start server on Windows boot:**

1. Press `Win+R`, type `shell:startup`, press Enter
2. Create shortcut to `START-POS.bat` in the Startup folder
3. Server will auto-start when Windows boots

## Offline vs Online Mode:

- **Online Mode:** Full 52 modules, all features
- **Offline Mode:** Use `SWITCH-MODE.bat` → Choose "LITE MODE"
  - Only 15 modules
  - Faster startup
  - Perfect for cashier terminals

## Troubleshooting:

**Q: "Install" button doesn't appear**
- Make sure you're using Chrome/Edge
- Visit the site first to load all assets
- Refresh the page (F5)

**Q: App shows "Cannot connect"**
- Make sure server is running: `BROWSER-POS.bat`
- Check http://localhost:8070 works in browser

**Q: Want to uninstall?**
- Chrome: Settings → Apps → Odoo POS System → Uninstall
- Edge: Same as Chrome

## Benefits vs Electron Version:

| Feature | Electron | PWA Browser |
|---------|----------|-------------|
| Startup time | 5-10 min | 10-30 sec |
| Memory usage | 800+ MB | 200-400 MB |
| Updates | Manual | Automatic |
| Offline | Limited | Full support |
| UI/UX | Basic | Professional |
| Installation | Complex | One click |

**Recommendation:** Use PWA (browser-based) for better performance!
