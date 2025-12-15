/**
 * Preload Script for Ayn Beirut POS Electron App
 * This script safely exposes Electron APIs to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    print: (htmlContent) => {
        ipcRenderer.send('print-receipt', htmlContent);
    }
});
