const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onStatus: (callback) => ipcRenderer.on('status', (_, status) => callback(status))
});
