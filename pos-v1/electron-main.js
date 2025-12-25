const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Try to load electron-updater, but don't fail if it's not available
let autoUpdater = null;
try {
    autoUpdater = require('electron-updater').autoUpdater;
    console.log('✅ Auto-updater loaded successfully');
} catch (error) {
    console.warn('⚠️ Auto-updater not available:', error.message);
}

let mainWindow = null;
let printWindow = null;

// ============================================================================
// AUTO-UPDATE CONFIGURATION
// ============================================================================

if (autoUpdater) {
    // Configure auto-updater
    autoUpdater.autoDownload = false; // Ask user before downloading
    autoUpdater.autoInstallOnAppQuit = true; // Auto-install when app closes

    autoUpdater.on('checking-for-update', () => {
        console.log('🔍 Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('✅ Update available:', info.version);
        
        // Notify main window
        if (mainWindow) {
            mainWindow.webContents.send('update-available', info);
        }
    });

    autoUpdater.on('update-not-available', (info) => {
        console.log('✅ App is up to date:', info.version);
    });

    autoUpdater.on('error', (err) => {
        console.error('❌ Update error:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
        console.log(logMessage);
        
        if (mainWindow) {
            mainWindow.webContents.send('update-progress', progressObj);
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('✅ Update downloaded, will install on quit');
        
        if (mainWindow) {
            mainWindow.webContents.send('update-downloaded', info);
        }
    });
}

// ============================================================================
// WINDOW MANAGEMENT
// ============================================================================

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        title: 'Ayn Beirut POS',
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            preload: path.join(__dirname, 'preload.js')
        },
        backgroundColor: '#ffffff',
        show: false // Don't show until ready
    });

    // Load the POS application
    mainWindow.loadFile('index.html');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Create application menu
    createMenu();

    // Development tools
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
    
    // Setup IPC handlers for printing
    setupPrintHandlers();
}

// ============================================================================
// PRINT HANDLING
// ============================================================================

function setupPrintHandlers() {
    // Handle print requests from renderer
    ipcMain.on('print-receipt', (event, htmlContent) => {
        console.log('🖨️ Print request received, HTML length:', htmlContent?.length || 0);
        if (htmlContent) {
            printReceipt(htmlContent);
        } else {
            console.error('❌ No HTML content received for printing');
        }
    });
    console.log('✅ Print IPC handlers registered');
}

function printReceipt(htmlContent) {
    // Create invisible print window
    if (printWindow) {
        printWindow.close();
        printWindow = null;
    }
    
    printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    
    // Load the HTML content
    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    
    // Wait for content to load then print
    printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.print({
            silent: false,
            printBackground: true,
            margins: {
                marginType: 'none'
            }
        }, (success, errorType) => {
            if (!success) {
                console.error('Print failed:', errorType);
            }
            // Close print window after printing
            setTimeout(() => {
                if (printWindow) {
                    printWindow.close();
                    printWindow = null;
                }
            }, 500);
        });
    });
}

// ============================================================================
// APPLICATION MENU
// ============================================================================

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => mainWindow.reload()
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
                { type: 'separator' },
                { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Toggle Full Screen',
                    accelerator: 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                },
                { type: 'separator' },
                {
                    label: 'Actual Size',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => mainWindow.webContents.setZoomLevel(0)
                },
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom + 1);
                    }
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom - 1);
                    }
                },
                { type: 'separator' },
                {
                    label: 'Developer Tools',
                    accelerator: 'F12',
                    click: () => mainWindow.webContents.toggleDevTools()
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Ayn Beirut POS',
                    click: () => {
                        const aboutMessage = `Ayn Beirut POS v${app.getVersion()}
                        
A complete Point of Sale system with:
• Product & Category Management
• Sales & Refunds Processing
• Customer Management (Phonebook)
• Supplier & Delivery Tracking
• Reports & Analytics
• Cash Drawer Management
• Bill Payments & Services

Built with SQL.js (Offline Database)
© 2025 AynBeirut - All Rights Reserved`;

                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Ayn Beirut POS',
                            message: aboutMessage,
                            buttons: ['OK']
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Documentation',
                    click: () => {
                        // Open documentation if available
                        const docsPath = path.join(__dirname, 'docs', 'index.html');
                        const fs = require('fs');
                        if (fs.existsSync(docsPath)) {
                            shell.openPath(docsPath);
                        }
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// ============================================================================
// APP LIFECYCLE
// ============================================================================

// ============================================================================
// CUSTOMER DISPLAY WINDOW MANAGEMENT
// ============================================================================

let customerDisplayWindow = null;

console.log('✅ Registering customer display IPC handlers...');

ipcMain.handle('open-customer-display', async (event, config) => {
    console.log('🖥️ Customer display requested with config:', config);
    try {
        const { screen } = require('electron');
        const displays = screen.getAllDisplays();
        
        console.log(`🖥️ Detected ${displays.length} display(s)`);
        
        let targetDisplay = displays[0]; // Default to primary
        
        // Determine which display to use
        if (config.location === 'auto' && displays.length > 1) {
            // Use external display if available (not at position 0,0)
            targetDisplay = displays.find(d => d.bounds.x !== 0 || d.bounds.y !== 0) || displays[0];
            console.log('🖥️ Auto-detected external display');
        } else if (config.location === 'secondary' && displays.length > 1) {
            targetDisplay = displays[1];
            console.log('🖥️ Using secondary display');
        } else {
            console.log('🖥️ Using primary display');
        }
        
        // Close existing window if open
        if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
            console.log('🖥️ Closing existing customer display');
            customerDisplayWindow.close();
        }
        
        // Create new window
        customerDisplayWindow = new BrowserWindow({
            x: targetDisplay.bounds.x + 50,
            y: targetDisplay.bounds.y + 50,
            width: config.fullscreen ? targetDisplay.bounds.width : 800,
            height: config.fullscreen ? targetDisplay.bounds.height : 600,
            frame: !config.fullscreen,
            kiosk: config.fullscreen,
            fullscreen: config.fullscreen,
            backgroundColor: '#0A0F1C',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            }
        });
        
        // Load display page with config
        const displayUrl = `file://${__dirname}/customer-display.html?mode=${config.mode}&fontSize=${config.fontSize}`;
        await customerDisplayWindow.loadURL(displayUrl);
        
        console.log('✅ Customer display opened successfully');
        
        // Handle window close
        customerDisplayWindow.on('closed', () => {
            console.log('🖥️ Customer display closed');
            customerDisplayWindow = null;
        });
        
        return { success: true, displayCount: displays.length };
    } catch (error) {
        console.error('❌ Failed to open customer display:', error);
        return { success: false, error: error.message };
    }
});

console.log('✅ Customer display IPC handler registered');

ipcMain.handle('close-customer-display', async () => {
    console.log('🖥️ Close customer display requested');
    if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
        customerDisplayWindow.close();
        customerDisplayWindow = null;
        console.log('✅ Customer display closed');
        return { success: true };
    }
    return { success: false, error: 'No display window open' };
});

console.log('✅ Close customer display IPC handler registered');

ipcMain.handle('update-customer-display', async (event, cartData) => {
    console.log('🖥️ Update customer display requested with cart data');
    if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
        customerDisplayWindow.webContents.send('cart-update', cartData);
        return { success: true };
    }
    return { success: false };
});

console.log('✅ Update customer display IPC handler registered');
console.log('✅ All customer display handlers initialized');

// ============================================================================
// FILE-BASED DATABASE HANDLERS
// ============================================================================

/**
 * Get the appropriate database path
 * Main database: Always on C:\ drive for consistency
 * Backups: Prefer D:\ drive, fallback to C:\AynBeirutPOS-Backups
 */
ipcMain.handle('get-database-path', async () => {
    const databaseFileName = 'pos-database.sqlite';
    
    // ALWAYS use C:\ drive for main database
    const cDrivePath = path.join('C:', 'AynBeirutPOS-Data', databaseFileName);
    const cDriveDir = path.join('C:', 'AynBeirutPOS-Data');
    
    // Create directory if doesn't exist
    await fs.promises.mkdir(cDriveDir, { recursive: true });
    console.log('✅ Using C:\\ drive for main database:', cDrivePath);
    
    return cDrivePath;
});

/**
 * Check if a specific drive exists
 */
ipcMain.handle('check-drive-exists', async (event, driveLetter) => {
    try {
        await fs.promises.access(`${driveLetter}:`, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
});

/**
 * Save database file to disk
 */
ipcMain.handle('save-database', async (event, data, customPath = null) => {
    try {
        // Get database path if not provided
        let dbPath = customPath;
        if (!dbPath) {
            const databaseFileName = 'pos-database.sqlite';
            const cDrivePath = path.join('C:', 'AynBeirutPOS-Data', databaseFileName);
            const cDriveDir = path.join('C:', 'AynBeirutPOS-Data');
            await fs.promises.mkdir(cDriveDir, { recursive: true });
            dbPath = cDrivePath;
        }
        
        // Convert data to Buffer if it's a Uint8Array
        const buffer = Buffer.from(data);
        
        // Write to file
        await fs.promises.writeFile(dbPath, buffer);
        
        console.log(`✅ Database saved successfully: ${dbPath} (${buffer.length} bytes)`);
        return { success: true, path: dbPath, size: buffer.length };
    } catch (error) {
        console.error('❌ Failed to save database:', error);
        return { success: false, error: error.message };
    }
});

/**
 * Load database file from disk
 */
ipcMain.handle('load-database', async (event, customPath = null) => {
    try {
        const dbPath = customPath || await ipcMain.emit('get-database-path');
        
        // Check if file exists
        try {
            await fs.promises.access(dbPath, fs.constants.F_OK);
        } catch {
            console.log('ℹ️ Database file not found, will create new');
            return { success: false, error: 'File not found', data: null };
        }
        
        // Read file
        const buffer = await fs.promises.readFile(dbPath);
        
        console.log(`✅ Database loaded successfully: ${dbPath} (${buffer.length} bytes)`);
        return { success: true, data: Array.from(buffer), size: buffer.length };
    } catch (error) {
        console.error('❌ Failed to load database:', error);
        return { success: false, error: error.message, data: null };
    }
});

// ============================================================================
// AUTOMATIC BACKUP SYSTEM
// ============================================================================

/**
 * Create a backup of the database
 */
ipcMain.handle('create-backup', async (event, data) => {
    try {
        // Get timestamp for backup filename
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/:/g, '')
            .replace(/\..+/, '')
            .replace('T', '-');
        const backupFileName = `backup-${timestamp}.sqlite`;
        
        // Determine backup location (D:\ first, then C:\)
        let backupDir;
        try {
            await fs.promises.access('D:', fs.constants.F_OK);
            backupDir = path.join('D:', 'AynBeirutPOS-Backups');
        } catch {
            backupDir = path.join('C:', 'AynBeirutPOS-Backups');
        }
        
        // Create backup directory
        await fs.promises.mkdir(backupDir, { recursive: true });
        
        const backupPath = path.join(backupDir, backupFileName);
        const buffer = Buffer.from(data);
        
        // Write backup file
        await fs.promises.writeFile(backupPath, buffer);
        
        console.log(`✅ Backup created: ${backupPath} (${buffer.length} bytes)`);
        return { success: true, path: backupPath, size: buffer.length };
    } catch (error) {
        console.error('❌ Failed to create backup:', error);
        return { success: false, error: error.message };
    }
});

/**
 * List all available backups
 */
ipcMain.handle('list-backups', async () => {
    try {
        const backups = [];
        
        // Check both D:\ and C:\ for backups
        const possibleDirs = [
            path.join('D:', 'AynBeirutPOS-Backups'),
            path.join('C:', 'AynBeirutPOS-Backups')
        ];
        
        for (const dir of possibleDirs) {
            try {
                const files = await fs.promises.readdir(dir);
                
                for (const file of files) {
                    if (file.endsWith('.sqlite')) {
                        const filePath = path.join(dir, file);
                        const stats = await fs.promises.stat(filePath);
                        
                        backups.push({
                            name: file,
                            path: filePath,
                            size: stats.size,
                            created: stats.birthtime,
                            modified: stats.mtime
                        });
                    }
                }
            } catch {
                // Directory doesn't exist or not accessible
                continue;
            }
        }
        
        // Sort by creation date (newest first)
        backups.sort((a, b) => b.created - a.created);
        
        console.log(`📋 Found ${backups.length} backup(s)`);
        return { success: true, backups };
    } catch (error) {
        console.error('❌ Failed to list backups:', error);
        return { success: false, error: error.message, backups: [] };
    }
});

/**
 * Restore database from a backup
 */
ipcMain.handle('restore-backup', async (event, backupPath) => {
    try {
        const buffer = await fs.promises.readFile(backupPath);
        
        console.log(`✅ Backup restored: ${backupPath} (${buffer.length} bytes)`);
        return { success: true, data: Array.from(buffer), size: buffer.length };
    } catch (error) {
        console.error('❌ Failed to restore backup:', error);
        return { success: false, error: error.message, data: null };
    }
});

/**
 * Clean old backups (keep last 30 days, minimum 3 backups)
 */
ipcMain.handle('clean-old-backups', async () => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        let deletedCount = 0;
        const possibleDirs = [
            path.join('D:', 'AynBeirutPOS-Backups'),
            path.join('C:', 'AynBeirutPOS-Backups')
        ];
        
        for (const dir of possibleDirs) {
            try {
                const files = await fs.promises.readdir(dir);
                const backupFiles = [];
                
                // Get all backup files with stats
                for (const file of files) {
                    if (file.endsWith('.sqlite')) {
                        const filePath = path.join(dir, file);
                        const stats = await fs.promises.stat(filePath);
                        backupFiles.push({ path: filePath, created: stats.birthtime });
                    }
                }
                
                // Sort by date (newest first)
                backupFiles.sort((a, b) => b.created - a.created);
                
                // Keep minimum 3 backups regardless of age
                const filesToCheck = backupFiles.slice(3);
                
                for (const backup of filesToCheck) {
                    if (backup.created < thirtyDaysAgo) {
                        await fs.promises.unlink(backup.path);
                        deletedCount++;
                        console.log(`🗑️ Deleted old backup: ${backup.path}`);
                    }
                }
            } catch {
                continue;
            }
        }
        
        console.log(`✅ Cleanup complete: ${deletedCount} old backup(s) deleted`);
        return { success: true, deletedCount };
    } catch (error) {
        console.error('❌ Failed to clean backups:', error);
        return { success: false, error: error.message, deletedCount: 0 };
    }
});

// ============================================================================
// APPLICATION LIFECYCLE
// ============================================================================

app.whenReady().then(() => {
    createWindow();
    
    // Check for updates after app starts (give it 3 seconds to settle)
    if (autoUpdater) {
        setTimeout(() => {
            autoUpdater.checkForUpdates();
        }, 3000);
    }

    app.on('activate', () => {
        // On macOS re-create window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // On macOS, apps stay active until Cmd+Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle app errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    const { dialog } = require('electron');
    dialog.showErrorBox('Application Error', error.message);
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, focus our window
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

console.log(`
╔════════════════════════════════════════════════════════════╗
║                   AYN BEIRUT POS                           ║
║                  Electron Desktop App                      ║
╠════════════════════════════════════════════════════════════╣
║  Version: ${app.getVersion().padEnd(48)} ║
║  Platform: ${process.platform.padEnd(47)} ║
║  Architecture: ${process.arch.padEnd(43)} ║
╚════════════════════════════════════════════════════════════╝
`);
