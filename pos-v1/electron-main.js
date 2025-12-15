const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let printWindow = null;

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
        icon: path.join(__dirname, 'build', 'icon.png'),
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

app.whenReady().then(() => {
    createWindow();

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
