// ===================================
// AYN BEIRUT POS - DISASTER RECOVERY
// VPS restore and backup system
// ===================================

// ===================================
// BACKUP OPERATIONS
// ===================================

async function cleanOldBackups() {
    try {
        console.log('🧹 Cleaning old backups...');
        
        const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const backupKeys = [];
        
        // Find all backup keys in localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('AynBeirutPOS_backup_')) {
                backupKeys.push(key);
            }
        }
        
        if (backupKeys.length === 0) {
            console.log('No backups found');
            return;
        }
        
        // Parse timestamps and sort by date (newest first)
        const backupsWithDate = backupKeys.map(key => {
            // Extract timestamp from key like: AynBeirutPOS_backup_pre-migration_2025-12-10T16-12-24-692Z
            const match = key.match(/(\d{4}-\d{2}-\d{2}T[\d-]+Z?)/);
            let timestamp = 0;
            if (match) {
                const dateStr = match[1].replace(/-/g, ':').replace('T', 'T').slice(0, -1) + '.000Z';
                try {
                    timestamp = new Date(dateStr.replace(/-(\d{3})Z$/, '.$1Z')).getTime();
                } catch (e) {
                    console.warn('Could not parse date from:', key);
                }
            }
            return { key, timestamp };
        }).sort((a, b) => b.timestamp - a.timestamp); // Newest first
        
        let deletedCount = 0;
        
        // Keep minimum 3 newest backups, delete others older than 90 days
        for (let i = 0; i < backupsWithDate.length; i++) {
            const backup = backupsWithDate[i];
            const age = now - backup.timestamp;
            
            // Always keep the 3 newest backups
            if (i < 3) {
                console.log(`✅ Keeping backup (${i + 1}/3 newest): ${backup.key}`);
                continue;
            }
            
            // Delete backups older than 90 days
            if (age > NINETY_DAYS_MS) {
                try {
                    localStorage.removeItem(backup.key);
                    deletedCount++;
                    const ageInDays = Math.floor(age / (24 * 60 * 60 * 1000));
                    console.log(`🗑️ Deleted backup (${ageInDays} days old): ${backup.key}`);
                } catch (e) {
                    console.warn('Could not delete backup:', backup.key, e);
                }
            }
        }
        
        if (deletedCount > 0) {
            console.log(`✅ Cleaned ${deletedCount} old backups`);
        } else {
            console.log('✅ No old backups to clean');
        }
        
    } catch (error) {
        console.error('❌ Backup cleanup failed:', error);
    }
}

async function createManualBackup() {
    try {
        console.log('💾 Creating manual backup...');
        
        if (!db) {
            throw new Error('Database not initialized');
        }
        
        // Export database
        const data = db.export();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `AynBeirutPOS_backup_${timestamp}.sqlite`;
        
        // Create downloadable file
        const blob = new Blob([data], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log(`✅ Backup created: ${filename}`);
        alert('✅ Backup created successfully');
        
        return filename;
    } catch (error) {
        console.error('❌ Backup failed:', error);
        alert('❌ Backup failed: ' + error.message);
        throw error;
    }
}

async function uploadBackupToServer() {
    try {
        console.log('📤 Uploading backup to server...');
        
        if (!db) {
            throw new Error('Database not initialized');
        }
        
        const data = db.export();
        const cashierId = getCashierId();
        
        // Placeholder for future VPS integration
        console.log('ℹ️ VPS upload will be enabled when server is ready');
        
        return null;
    } catch (error) {
        console.error('❌ Upload failed:', error);
        return null;
    }
}

// ===================================
// RESTORE OPERATIONS
// ===================================

async function restoreFromFile() {
    try {
        console.log('📂 Restoring from file...');
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.sqlite,.db';
        
        return new Promise((resolve, reject) => {
            input.onchange = async (e) => {
                try {
                    const file = e.target.files[0];
                    if (!file) {
                        reject(new Error('No file selected'));
                        return;
                    }
                    
                    const confirmed = confirm(
                        `⚠️ RESTORE DATABASE FROM FILE\n\n` +
                        `File: ${file.name}\n` +
                        `Size: ${(file.size / 1024).toFixed(2)} KB\n\n` +
                        `This will replace your current database.\n` +
                        `All unsaved local changes will be LOST.\n\n` +
                        `Are you sure?`
                    );
                    
                    if (!confirmed) {
                        reject(new Error('Restore cancelled'));
                        return;
                    }
                    
                    // Create backup first
                    await createManualBackup();
                    
                    // Read file
                    const buffer = await file.arrayBuffer();
                    const data = new Uint8Array(buffer);
                    
                    // Verify SQLite file
                    const signature = String.fromCharCode(...data.slice(0, 15));
                    if (!signature.startsWith('SQLite format 3')) {
                        throw new Error('Invalid SQLite file');
                    }
                    
                    // Load database
                    db = new SQL.Database(data);
                    await saveDatabase();
                    
                    console.log('✅ Database restored');
                    alert('✅ Database restored. Reloading...');
                    
                    setTimeout(() => window.location.reload(), 1000);
                    resolve(true);
                } catch (error) {
                    console.error('Restore failed:', error);
                    alert('❌ Restore failed: ' + error.message);
                    reject(error);
                }
            };
            
            input.click();
        });
    } catch (error) {
        console.error('❌ Restore failed:', error);
        throw error;
    }
}

async function restoreFromServer() {
    console.log('ℹ️ Server restore will be enabled when VPS is ready');
    alert('Server restore feature will be available when online sync is configured.');
    return false;
}

// ===================================
// EXPORT TO WINDOW
// ===================================

if (typeof window !== 'undefined') {
    window.cleanOldBackups = cleanOldBackups;
    window.createManualBackup = createManualBackup;
    window.uploadBackupToServer = uploadBackupToServer;
    window.restoreFromFile = restoreFromFile;
    window.restoreFromServer = restoreFromServer;
}

console.log('📦 Disaster recovery module loaded');
