# Quick Reference Card

## Essential Commands

```powershell
# Setup (one time)
npm install                    # Install dependencies + copy icon

# Validation
npm run check                  # Verify all resources ready

# Development
npm start                      # Run POS system (first start: 3-5 min)

# Building
npm run build                  # Create installer (dist/*.exe)
npm run build:dir              # Create portable version (no installer)

# Troubleshooting
notepad data\logs\app-*.log    # View application logs
node copy-icon.js              # Manually copy icon
node check.js                  # Run validation
```

## Important Paths

| What | Development | Production |
|------|-------------|------------|
| **App Root** | `C:\Users\Alaa\Documents\githup\pos\posfinal` | Install directory |
| **Data** | `.\data\` | `%APPDATA%\odoo-pos\data\` |
| **Database** | `.\data\postgresql\` | `%APPDATA%\odoo-pos\data\postgresql\` |
| **Logs** | `.\data\logs\` | `%APPDATA%\odoo-pos\data\logs\` |
| **Resources** | `.\resources\` | `<install>\resources\app.asar.unpacked\resources\` |

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Odoo Web** | http://localhost:8070/web | Create on first login |
| **PostgreSQL** | localhost:54320 | odoo / odoo123 |
| **Database** | posdb | (auto-created) |
| **Master Password** | - | admin |

## First Run Timeline

| Step | Time | What's Happening |
|------|------|------------------|
| Validate resources | ~1 sec | Check all files exist |
| Initialize PostgreSQL | 2-3 min | Create database cluster (once) |
| Start PostgreSQL | ~10 sec | Launch database server |
| Create database user | ~5 sec | Setup odoo user |
| Start Odoo | 1-2 min | Initialize modules (first time) |
| Load POS | ~5 sec | Open web interface |
| **TOTAL** | **3-5 min** | **First run only!** |

Subsequent runs: **30-60 seconds**

## Common Issues & Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| Build fails (icon missing) | `node copy-icon.js` |
| PostgreSQL won't start | Change port in main.js or kill process on 54320 |
| Odoo errors | Check `data\logs\app-*.log` |
| Missing dependencies | `npm install` |
| Long first start | **Normal!** Be patient (3-5 min) |
| Installer too large | **Normal!** (~600-800 MB compressed) |

## File Structure

```
posfinal/
├── main.js                 ← Core application logic
├── package.json            ← npm configuration & scripts
├── check.js                ← Pre-flight validation
├── copy-icon.js            ← Icon copy automation
├── README.md               ← Quick start guide
├── SETUP.md                ← Detailed documentation
├── IMPLEMENTATION.md       ← What was implemented
├── resources/              ← Embedded software (1.5 GB)
│   ├── postgresql-15/
│   ├── python-3.10/
│   └── odoo/
├── data/                   ← Runtime (created on first run)
│   ├── postgresql/         ← Database files
│   └── logs/               ← Application logs
└── dist/                   ← Build output (after npm run build)
```

## Status Indicators

**Loading Screen Messages:**
- ✅ "Validating resources..." - All files checked
- ✅ "Initializing database..." - First run only
- ✅ "Starting database server..." - PostgreSQL starting
- ✅ "Setting up database user..." - Creating odoo user
- ✅ "Starting Odoo server..." - Launching Odoo
- ✅ "Opening POS interface..." - Almost ready!

**Success:** Fullscreen Odoo window opens

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **F11** | Toggle fullscreen |
| **ESC** | Close (shows confirmation) |

## Production Checklist

Before deploying to production:

- [ ] Change passwords in `main.js` (CONFIG section)
- [ ] Test on clean Windows machine
- [ ] Configure products and payment methods in Odoo
- [ ] Test receipt printing (if using printer)
- [ ] Set up backup schedule
- [ ] Train staff on POS usage
- [ ] Document any custom configurations
- [ ] (Optional) Get code signing certificate

## Support

**Documentation:**
- Quick Start: `README.md`
- Detailed Guide: `SETUP.md`
- Implementation Notes: `IMPLEMENTATION.md`

**Logs:**
- Location: `data\logs\app-YYYY-MM-DD.log`
- View: `notepad data\logs\app-*.log`

**Validation:**
- Run: `npm run check`
- Shows: All resources, dependencies, initialization status

---

**Version:** 1.0.0  
**Ready to Deploy!** 🚀
