// ===================================
// AYN BEIRUT POS - STORAGE MANAGER
// Platform-aware persistent storage
// ===================================

// Storage types in order of preference
const STORAGE_TYPES = {
    ELECTRON_FS: 'electron-fs',
    FILE_SYSTEM_API: 'file-system-api',
    INDEXEDDB: 'indexeddb',
    LOCALSTORAGE: 'localstorage'
};

let currentStorageType = null;
let fileHandle = null; // For File System Access API

// ===================================
// PLATFORM DETECTION
// ===================================

function detectPlatform() {
    // Check for Electron
    if (typeof require !== 'undefined') {
        try {
            const electron = require('electron');
            if (electron) {
                console.log('🖥️ Platform: Electron Desktop App');
                return STORAGE_TYPES.ELECTRON_FS;
            }
        } catch (e) {
            // Not Electron
        }
    }
    
    // DISABLED: File System Access API causes unwanted download dialogs
    // Use IndexedDB or localStorage for web browsers instead
    // if ('showSaveFilePicker' in window) {
    //     console.log('🌐 Platform: Modern Browser (File System Access API)');
    //     return STORAGE_TYPES.FILE_SYSTEM_API;
    // }
    
    // Check for IndexedDB
    if ('indexedDB' in window) {
        console.log('🌐 Platform: Browser (IndexedDB)');
        return STORAGE_TYPES.INDEXEDDB;
    }
    
    // Fallback to localStorage
    console.log('📦 Platform: Basic Browser (localStorage)');
    return STORAGE_TYPES.LOCALSTORAGE;
}

// ===================================
// ELECTRON FILE SYSTEM STORAGE
// ===================================

async function electronSave(dbName, data) {
    try {
        const fs = require('fs');
        const path = require('path');
        const { app } = require('electron').remote || require('@electron/remote');
        
        // Get app data directory
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'AynBeirutPOS', `${dbName}.sqlite`);
        
        // Ensure directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        // Write database file
        fs.writeFileSync(dbPath, Buffer.from(data));
        
        console.log(`💾 Database saved to: ${dbPath}`);
        return true;
    } catch (error) {
        console.error('Electron save failed:', error);
        throw error;
    }
}

async function electronLoad(dbName) {
    try {
        const fs = require('fs');
        const path = require('path');
        const { app } = require('electron').remote || require('@electron/remote');
        
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'AynBeirutPOS', `${dbName}.sqlite`);
        
        if (fs.existsSync(dbPath)) {
            const buffer = fs.readFileSync(dbPath);
            console.log(`📂 Database loaded from: ${dbPath}`);
            return new Uint8Array(buffer);
        }
        
        return null;
    } catch (error) {
        console.error('Electron load failed:', error);
        return null;
    }
}

// ===================================
// FILE SYSTEM ACCESS API STORAGE
// ===================================

async function fileSystemApiSave(dbName, data) {
    try {
        // Get or create file handle
        if (!fileHandle) {
            fileHandle = await window.showSaveFilePicker({
                suggestedName: `${dbName}.sqlite`,
                types: [{
                    description: 'SQLite Database',
                    accept: { 'application/x-sqlite3': ['.sqlite', '.db'] }
                }]
            });
        }
        
        // Write to file
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        
        console.log('💾 Database saved via File System Access API');
        
        // Store file handle reference for future use
        localStorage.setItem(`${dbName}_fileHandle`, 'granted');
        
        return true;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('User cancelled file picker');
            // Fall back to IndexedDB
            currentStorageType = STORAGE_TYPES.INDEXEDDB;
            return indexedDbSave(dbName, data);
        }
        console.error('File System API save failed:', error);
        throw error;
    }
}

async function fileSystemApiLoad(dbName) {
    try {
        // Check if we have permission
        const hasHandle = localStorage.getItem(`${dbName}_fileHandle`);
        
        if (!hasHandle) {
            return null; // First time, no file yet
        }
        
        // Ask user to select the database file
        const [handle] = await window.showOpenFilePicker({
            types: [{
                description: 'SQLite Database',
                accept: { 'application/x-sqlite3': ['.sqlite', '.db'] }
            }]
        });
        
        fileHandle = handle;
        
        const file = await handle.getFile();
        const buffer = await file.arrayBuffer();
        
        console.log('📂 Database loaded via File System Access API');
        return new Uint8Array(buffer);
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('User cancelled file picker');
        }
        console.error('File System API load failed:', error);
        return null;
    }
}

// ===================================
// INDEXEDDB BLOB STORAGE
// ===================================

async function indexedDbSave(dbName, data) {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(`${dbName}_BlobStorage`, 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('database')) {
                    db.createObjectStore('database');
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['database'], 'readwrite');
                const store = transaction.objectStore('database');
                
                const blob = new Blob([data], { type: 'application/x-sqlite3' });
                store.put(blob, 'sqliteDb');
                
                transaction.oncomplete = () => {
                    console.log('💾 Database saved to IndexedDB');
                    db.close();
                    resolve(true);
                };
                
                transaction.onerror = () => {
                    reject(transaction.error);
                };
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        } catch (error) {
            reject(error);
        }
    });
}

async function indexedDbLoad(dbName) {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(`${dbName}_BlobStorage`, 1);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('database')) {
                    db.close();
                    resolve(null);
                    return;
                }
                
                const transaction = db.transaction(['database'], 'readonly');
                const store = transaction.objectStore('database');
                const getRequest = store.get('sqliteDb');
                
                getRequest.onsuccess = async () => {
                    if (getRequest.result) {
                        const buffer = await getRequest.result.arrayBuffer();
                        console.log('📂 Database loaded from IndexedDB');
                        db.close();
                        resolve(new Uint8Array(buffer));
                    } else {
                        db.close();
                        resolve(null);
                    }
                };
                
                getRequest.onerror = () => {
                    db.close();
                    reject(getRequest.error);
                };
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        } catch (error) {
            reject(error);
        }
    });
}

// ===================================
// LOCALSTORAGE FALLBACK (< 5MB)
// ===================================

async function localStorageSave(dbName, data) {
    try {
        // Check size (localStorage limit is typically 5-10MB)
        const sizeInMB = data.length / (1024 * 1024);
        
        if (sizeInMB > 5) {
            console.warn(`⚠️ Database size (${sizeInMB.toFixed(2)}MB) exceeds localStorage recommended limit`);
            throw new Error('Database too large for localStorage');
        }
        
        const buffer = Array.from(data);
        localStorage.setItem(`${dbName}_sqljs`, JSON.stringify(buffer));
        
        console.log(`💾 Database saved to localStorage (${sizeInMB.toFixed(2)}MB)`);
        return true;
    } catch (error) {
        console.error('localStorage save failed:', error);
        throw error;
    }
}

async function localStorageLoad(dbName) {
    try {
        const saved = localStorage.getItem(`${dbName}_sqljs`);
        
        if (saved) {
            const buffer = new Uint8Array(JSON.parse(saved));
            console.log('📂 Database loaded from localStorage');
            return buffer;
        }
        
        return null;
    } catch (error) {
        console.error('localStorage load failed:', error);
        return null;
    }
}

// ===================================
// UNIFIED STORAGE INTERFACE
// ===================================

async function saveToStorage(dbName, data) {
    // Initialize storage type on first use
    if (!currentStorageType) {
        currentStorageType = detectPlatform();
    }
    
    try {
        switch (currentStorageType) {
            case STORAGE_TYPES.ELECTRON_FS:
                return await electronSave(dbName, data);
            
            case STORAGE_TYPES.FILE_SYSTEM_API:
                return await fileSystemApiSave(dbName, data);
            
            case STORAGE_TYPES.INDEXEDDB:
                return await indexedDbSave(dbName, data);
            
            case STORAGE_TYPES.LOCALSTORAGE:
                return await localStorageSave(dbName, data);
            
            default:
                throw new Error('No storage method available');
        }
    } catch (error) {
        // Try fallback storage
        console.warn(`Primary storage failed, attempting fallback...`);
        
        if (currentStorageType !== STORAGE_TYPES.LOCALSTORAGE) {
            try {
                return await localStorageSave(dbName, data);
            } catch (fallbackError) {
                console.error('All storage methods failed');
                throw fallbackError;
            }
        }
        
        throw error;
    }
}

async function loadFromStorage(dbName) {
    // Initialize storage type on first use
    if (!currentStorageType) {
        currentStorageType = detectPlatform();
    }
    
    try {
        switch (currentStorageType) {
            case STORAGE_TYPES.ELECTRON_FS:
                return await electronLoad(dbName);
            
            case STORAGE_TYPES.FILE_SYSTEM_API:
                return await fileSystemApiLoad(dbName);
            
            case STORAGE_TYPES.INDEXEDDB:
                return await indexedDbLoad(dbName);
            
            case STORAGE_TYPES.LOCALSTORAGE:
                return await localStorageLoad(dbName);
            
            default:
                return null;
        }
    } catch (error) {
        console.error('Load failed, trying fallback:', error);
        
        // Try localStorage fallback
        if (currentStorageType !== STORAGE_TYPES.LOCALSTORAGE) {
            return await localStorageLoad(dbName);
        }
        
        return null;
    }
}

function getStorageInfo() {
    return {
        type: currentStorageType,
        description: getStorageDescription(currentStorageType),
        isElectron: currentStorageType === STORAGE_TYPES.ELECTRON_FS,
        hasUnlimitedStorage: currentStorageType === STORAGE_TYPES.ELECTRON_FS || 
                             currentStorageType === STORAGE_TYPES.FILE_SYSTEM_API
    };
}

function getStorageDescription(type) {
    const descriptions = {
        [STORAGE_TYPES.ELECTRON_FS]: 'Electron Native File System (Unlimited)',
        [STORAGE_TYPES.FILE_SYSTEM_API]: 'Browser File System API (Unlimited)',
        [STORAGE_TYPES.INDEXEDDB]: 'IndexedDB Blob Storage (~1GB)',
        [STORAGE_TYPES.LOCALSTORAGE]: 'localStorage (5-10MB limit)'
    };
    
    return descriptions[type] || 'Unknown';
}

// ===================================
// EXPORT TO WINDOW
// ===================================

if (typeof window !== 'undefined') {
    window.saveToStorage = saveToStorage;
    window.loadFromStorage = loadFromStorage;
    window.getStorageInfo = getStorageInfo;
    window.STORAGE_TYPES = STORAGE_TYPES;
}

console.log('📦 Storage manager loaded');
console.log('🔧 Detected platform:', detectPlatform());
