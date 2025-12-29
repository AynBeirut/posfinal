# AYN BEIRUT POS - Ubuntu 24 Installation Guide

## 🐧 System Requirements

- **OS**: Ubuntu 24.04 LTS (or compatible Debian-based distro)
- **CPU**: x64 (64-bit Intel/AMD)
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 500 MB free space (1 GB with backups)
- **Display**: 1280x720 minimum resolution

## 📦 Installation Methods

### Method 1: .deb Package (Recommended for Ubuntu/Debian)

```bash
# Download the .deb package
# Then install:
sudo dpkg -i ayn-beirut-pos_1.0.0_amd64.deb

# If there are dependency issues, fix them:
sudo apt-get install -f

# Launch from applications menu or terminal:
ayn-beirut-pos
```

### Method 2: AppImage (Universal Linux)

```bash
# Download the AppImage
# Make it executable:
chmod +x Ayn\ Beirut\ POS-1.0.0.AppImage

# Run directly:
./Ayn\ Beirut\ POS-1.0.0.AppImage

# Optional: Integrate with system (create desktop entry)
./Ayn\ Beirut\ POS-1.0.0.AppImage --appimage-integrate
```

## 🛠️ Development Setup

### Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be 18.x or higher
npm --version

# Install build dependencies
sudo apt install -y git build-essential
```

### Clone and Run

```bash
# Clone repository
git clone https://github.com/AynBeirut/posfinal.git
cd posfinal

# Make scripts executable
chmod +x START-POS-LINUX.sh
chmod +x BUILD-LINUX.sh

# Install dependencies
cd pos-v1
npm install

# Start development server
npm start

# Or use the script:
../START-POS-LINUX.sh
```

### Build Installer

```bash
# From project root
./BUILD-LINUX.sh

# Or manually:
cd pos-v1
npm run build:linux

# Output files in: pos-v1/dist/
```

## 📂 Data Storage Locations

### Ubuntu/Linux Paths

```bash
# Database location
~/.config/ayn-beirut-pos/pos-database.sqlite

# Backups location (change in electron-main.js if needed)
~/AynBeirutPOS-Backups/

# Logs
~/.config/ayn-beirut-pos/logs/
```

### File Permissions

```bash
# Ensure data directory exists and is writable
mkdir -p ~/.config/ayn-beirut-pos
chmod 755 ~/.config/ayn-beirut-pos

# Ensure backup directory exists
mkdir -p ~/AynBeirutPOS-Backups
chmod 755 ~/AynBeirutPOS-Backups
```

## 🔧 Linux-Specific Configuration

### Update Database Paths (if needed)

Edit `pos-v1/electron-main.js`:

```javascript
// Line ~70 - Update for Linux
const isLinux = process.platform === 'linux';
const dbPath = isLinux 
  ? path.join(app.getPath('userData'), 'pos-database.sqlite')
  : 'C:\\AynBeirutPOS-Data\\pos-database.sqlite';

const backupDir = isLinux
  ? path.join(app.getPath('home'), 'AynBeirutPOS-Backups')
  : 'D:\\AynBeirutPOS-Backups';
```

### Desktop Integration

Create manual desktop entry if needed:

```bash
# Create desktop file
cat > ~/.local/share/applications/ayn-beirut-pos.desktop << 'EOF'
[Desktop Entry]
Name=Ayn Beirut POS
Comment=Restaurant Point of Sale System
Exec=/usr/local/bin/ayn-beirut-pos
Icon=ayn-beirut-pos
Terminal=false
Type=Application
Categories=Office;Finance;
EOF

# Update desktop database
update-desktop-database ~/.local/share/applications/
```

## 🚀 Running on Ubuntu Server (Headless)

If running without GUI:

```bash
# Install Xvfb (virtual display)
sudo apt install -y xvfb

# Run with virtual display
xvfb-run --auto-servernum --server-args='-screen 0 1280x720x24' npm start
```

## 🐛 Troubleshooting

### Issue: "electron: command not found"

```bash
# Reinstall electron locally
cd pos-v1
npm install electron --save-dev
```

### Issue: Permission Denied

```bash
# Fix permissions on all scripts
chmod +x *.sh
chmod +x pos-v1/*.sh
```

### Issue: Missing Dependencies

```bash
# Install missing libraries
sudo apt install -y libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 \
  xdg-utils libatspi2.0-0 libdrm2 libgbm1 libxcb-dri3-0
```

### Issue: Database Won't Load

```bash
# Check file permissions
ls -la ~/.config/ayn-beirut-pos/

# Reset permissions
chmod 644 ~/.config/ayn-beirut-pos/pos-database.sqlite
```

### Issue: Auto-updater Error

The auto-updater requires code signing. For Linux builds without signing:

Edit `pos-v1/electron-main.js` and disable auto-updater for Linux:

```javascript
if (process.platform !== 'linux') {
  autoUpdater.checkForUpdatesAndNotify();
}
```

## 📋 Quick Commands Reference

```bash
# Start development
npm start

# Build Linux installers
npm run build:linux

# Build for all platforms
npm run build:all

# Run tests
npm test

# View logs
tail -f ~/.config/ayn-beirut-pos/logs/app.log
```

## 🔒 Security Notes

### File Permissions
- Database: `0644` (rw-r--r--)
- Backups: `0644` (rw-r--r--)
- Executable: `0755` (rwxr-xr-x)

### Firewall (if running on server)
```bash
# If exposing to network (not recommended for POS)
sudo ufw allow 3000/tcp  # Development port
sudo ufw status
```

## 📖 Additional Resources

- **Main README**: See `pos-v1/README.md` for feature documentation
- **Windows Guide**: `README.md` in project root
- **Issue Tracker**: https://github.com/AynBeirut/posfinal/issues

## 🆘 Support

For Ubuntu-specific issues:
1. Check logs: `~/.config/ayn-beirut-pos/logs/`
2. Run in debug mode: `npm start --verbose`
3. Check system requirements
4. Report issues on GitHub with:
   - Ubuntu version (`lsb_release -a`)
   - Node version (`node --version`)
   - Error logs

---

**Built with ❤️ for Ayn Beirut Restaurant**  
*Linux support added December 2025*
