// ===================================
// AYN BEIRUT POS - SQL.JS DATABASE
// LiteSQL offline-first persistence
// ===================================

let db = null;
let SQL = null;
const DB_NAME = 'AynBeirutPOS';
const APP_VERSION = '1.0.0';
const CURRENT_SCHEMA_VERSION = 9;

// Storage manager instance (will be set by storage-manager.js)
let storageManager = null;

// Helper to update loading status
function updateLoadingText(message, detail = '') {
    const statusEl = document.getElementById('loading-status');
    const detailEl = document.getElementById('loading-detail');
    if (statusEl) statusEl.textContent = message;
    if (detailEl) detailEl.textContent = detail;
    console.log(`📢 ${message}${detail ? ' - ' + detail : ''}`);
}

// ===================================
// DATABASE INITIALIZATION
// ===================================

async function initDatabase() {
    try {
        console.log('🔧 Initializing SQL.js database...');
        updateLoadingText('Loading database engine... (first load may take 30s)');
        
        // Initialize SQL.js library
        const loadStart = Date.now();
        SQL = await initSqlJs({
            locateFile: file => `lib/${file}`
        });
        
        const loadTime = ((Date.now() - loadStart) / 1000).toFixed(1);
        console.log(`✅ SQL.js loaded in ${loadTime}s`);
        
        updateLoadingText('Loading database...');
        
        // Try to load existing database
        const existingDb = await loadDatabaseFromStorage();
        
        if (existingDb) {
            db = new SQL.Database(existingDb);
            console.log('✅ Loaded existing database from storage');
        } else {
            db = new SQL.Database();
            console.log('✅ Created new database');
        }
        
        // Check and apply migrations
        await checkAndApplyMigrations();
        
        // Save database
        await saveDatabase();
        
        console.log('✅ SQL.js database initialized successfully');
        
        // Auto-fix disabled - use manual fixServiceTypes() from console if needed
        // setTimeout(() => {
        //     try {
        //         autoFixServiceTypes();
        //     } catch (err) {
        //         console.error('❌ Auto-fix failed during execution:', err);
        //     }
        // }, 500);
        
        return db;
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

// ===================================
// MIGRATION SYSTEM
// ===================================

async function checkAndApplyMigrations() {
    try {
        // Check if schema_version table exists
        const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'");
        
        let currentVersion = 0;
        if (tables.length > 0) {
            const versionResult = db.exec('SELECT MAX(version) as version FROM schema_version');
            if (versionResult.length > 0 && versionResult[0].values.length > 0) {
                currentVersion = versionResult[0].values[0][0] || 0;
            }
        }
        
        console.log(`📊 Current schema version: ${currentVersion}, Target version: ${CURRENT_SCHEMA_VERSION}`);
        
        if (currentVersion < CURRENT_SCHEMA_VERSION) {
            // Load and apply migrations
            const migrations = await loadMigrations(currentVersion, CURRENT_SCHEMA_VERSION);
            
            if (migrations.length > 0) {
                // Request admin approval before applying migrations
                const approved = await requestMigrationApproval(migrations, currentVersion, CURRENT_SCHEMA_VERSION);
                
                if (approved) {
                    await applyMigrations(migrations);
                    console.log('✅ Migrations applied successfully');
                } else {
                    console.warn('⚠️ Migrations cancelled by user');
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Migration check failed:', error);
        throw error;
    }
}

async function loadMigrations(fromVersion, toVersion) {
    const migrations = [];
    
    // Migration 001: Initial schema
    if (fromVersion < 1 && toVersion >= 1) {
        migrations.push({
            version: 1,
            description: 'Initial schema with all 8 core tables + sync_queue + system_settings',
            sql: await fetch('./migrations/001-initial-schema.sql').then(r => r.text())
        });
    }
    
    // Migration 002: Enhanced features
    if (fromVersion < 2 && toVersion >= 2) {
        migrations.push({
            version: 2,
            description: 'Add phonebook, bill_payments, bill_types, company_info, app_settings',
            sql: await fetch('./migrations/002-enhanced-features.sql').then(r => r.text())
        });
    }
    
    // Migration 003: Phonebook enhancements
    if (fromVersion < 3 && toVersion >= 3) {
        migrations.push({
            version: 3,
            description: 'Enhanced phonebook with categories, birthday, balance, notes, and history',
            sql: await fetch('./migrations/002-phonebook-enhancements.sql').then(r => r.text())
        });
    }
    
    // Migration 004: Add product cost column
    if (fromVersion < 4 && toVersion >= 4) {
        migrations.push({
            version: 4,
            description: 'Add cost column to products table for weighted average cost tracking',
            sql: await fetch('./migrations/003-add-product-cost.sql').then(r => r.text())
        });
    }
    
    // Migration 005: Fix suppliers/deliveries AUTOINCREMENT
    if (fromVersion < 5 && toVersion >= 5) {
        migrations.push({
            version: 5,
            description: 'Fix AUTOINCREMENT for suppliers, deliveries, delivery_items, supplier_payments tables',
            sql: await fetch('./migrations/004-fix-suppliers-autoincrement.sql').then(r => r.text())
        });
    }
    
    // Migration 006: Add product type column
    if (fromVersion < 6 && toVersion >= 6) {
        migrations.push({
            version: 6,
            description: 'Add type column to products table (item/service) and service-specific fields',
            sql: await fetch('./migrations/005-add-product-type.sql').then(r => r.text())
        });
    }

    if (fromVersion < 7 && toVersion >= 7) {
        migrations.push({
            version: 7,
            description: 'Update existing service products to correct type and hourly rates',
            sql: await fetch('./migrations/006-update-service-types.sql').then(r => r.text())
        });
    }

    // Migration 008: Cash shifts and bank transfers
    if (fromVersion < 8 && toVersion >= 8) {
        migrations.push({
            version: 8,
            description: 'Add cash drawer shift management and bank transfer tables',
            sql: await fetch('./migrations/007-add-cash-shifts.sql').then(r => r.text())
        });
    }

    // Migration 009: Refunds and order modification tracking
    if (fromVersion < 9 && toVersion >= 9) {
        migrations.push({
            version: 9,
            description: 'Add refunds table and order modification tracking',
            sql: await fetch('./migrations/008-add-refunds.sql?v=2').then(r => r.text())
        });
    }

    return migrations;
}

async function requestMigrationApproval(migrations, fromVersion, toVersion) {
    // Auto-approve initial schema creation (0 -> 1 or 0 -> any for first-time setup)
    if (fromVersion === 0) {
        console.log('✅ Auto-approving initial database setup');
        return true;
    }
    
    // Auto-approve phonebook enhancements (2 -> 3)
    if (fromVersion === 2 && toVersion === 3) {
        console.log('✅ Auto-approving phonebook enhancements migration');
        return true;
    }
    
    // Auto-approve product cost column (3 -> 4)
    if (fromVersion === 3 && toVersion === 4) {
        console.log('✅ Auto-approving product cost column migration');
        return true;
    }
    
    // Auto-approve suppliers AUTOINCREMENT fix (4 -> 5)
    if (fromVersion === 4 && toVersion === 5) {
        console.log('✅ Auto-approving suppliers/deliveries AUTOINCREMENT fix');
        return true;
    }
    
    // Auto-approve multi-step migrations 3 -> 5 (includes cost column + suppliers fix)
    if (fromVersion === 3 && toVersion === 5) {
        console.log('✅ Auto-approving multi-step migration (product cost + suppliers AUTOINCREMENT)');
        return true;
    }
    
    // Auto-approve product type column (5 -> 6)
    if (fromVersion === 5 && toVersion === 6) {
        console.log('✅ Auto-approving product type column migration');
        return true;
    }
    
    // Auto-approve multi-step migrations 3 -> 6 (includes all enhancements)
    if (fromVersion === 3 && toVersion === 6) {
        console.log('✅ Auto-approving multi-step migration (cost + suppliers + product type)');
        return true;
    }
    
    // Auto-approve service type data migration (6 -> 7)
    if (fromVersion === 6 && toVersion === 7) {
        console.log('✅ Auto-approving service type data migration');
        return true;
    }
    
    // Auto-approve multi-step migrations 3 -> 7 (includes all enhancements + service data)
    if (fromVersion === 3 && toVersion === 7) {
        console.log('✅ Auto-approving multi-step migration (cost + suppliers + product type + service data)');
        return true;
    }
    
    // Auto-approve cash drawer migration (7 -> 8 or 6 -> 8)
    if ((fromVersion === 7 || fromVersion === 6) && toVersion === 8) {
        console.log('✅ Auto-approving cash drawer shift management migration');
        return true;
    }
    
    // Auto-approve refunds migration (8 -> 9 or 7 -> 9 or 6 -> 9)
    if ((fromVersion === 8 || fromVersion === 7 || fromVersion === 6) && toVersion === 9) {
        console.log('✅ Auto-approving refunds and order modification tracking migration');
        return true;
    }
    
    // Auto-approve multi-step migration 6 -> 9 (service types + cash drawer + refunds)
    if (fromVersion === 6 && toVersion === 9) {
        console.log('✅ Auto-approving multi-step migration (service types + cash drawer + refunds)');
        return true;
    }
    
    // Auto-approve multi-step migration 3 -> 9 (all enhancements)
    if (fromVersion === 3 && toVersion === 9) {
        console.log('✅ Auto-approving multi-step migration (cost + suppliers + types + shifts + refunds)');
        return true;
    }
    
    // Check if current user is admin for other migrations
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    if (currentUser.role !== 'admin') {
        console.error('❌ Only administrators can approve schema migrations');
        alert('Schema update required. Please contact an administrator.');
        return false;
    }
    
    const migrationDetails = migrations.map(m => 
        `Version ${m.version}: ${m.description}`
    ).join('\n');
    
    const message = `DATABASE SCHEMA UPDATE REQUIRED

Current Version: ${fromVersion}
New Version: ${toVersion}

Changes:
${migrationDetails}

⚠️ IMPORTANT:
- A backup will be created automatically before migration
- This operation cannot be undone
- The application will reload after completion

Do you want to proceed with the migration?`;
    
    return confirm(message);
}

async function applyMigrations(migrations) {
    let backupData = null;
    
    try {
        // Emergency backup to localStorage only (no file downloads)
        console.log('💾 Creating in-memory backup before migration...');
        if (db) {
            backupData = db.export();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const storageKey = `${DB_NAME}_backup_${timestamp}`;
            
            // Save to localStorage as emergency backup (limited to most recent 3)
            try {
                // Clean old migration backups to save space
                const allKeys = Object.keys(localStorage);
                const backupKeys = allKeys
                    .filter(k => k.startsWith(`${DB_NAME}_backup_`))
                    .sort()
                    .reverse();
                
                // Keep only last 2 backups
                backupKeys.slice(2).forEach(key => {
                    try {
                        localStorage.removeItem(key);
                    } catch (e) {}
                });
                
                // Store new backup
                localStorage.setItem(storageKey, JSON.stringify(Array.from(backupData)));
                console.log(`✅ Emergency backup saved to browser storage: ${storageKey}`);
                console.log('ℹ️ To restore: Use Disaster Recovery page');
            } catch (e) {
                console.warn('⚠️ Could not save emergency backup to localStorage:', e);
            }
        }
        
        // Note: Auto-download permanently disabled to prevent unwanted file downloads
        // Users can manually create backup files from Settings > Backup & Restore
        
        // Apply each migration
        for (const migration of migrations) {
            console.log(`📝 Applying migration ${migration.version}: ${migration.description}`);
            try {
                db.exec(migration.sql);
            } catch (execError) {
                console.error(`❌ SQL execution failed:`, execError);
                console.error(`❌ Error message:`, execError.message);
                throw execError;
            }
            
            // Log migration to system_settings
            await logMigration(migration.version, migration.description, 'success');
        }
        
        // Save database after migrations
        await saveDatabase();
        
        console.log('✅ All migrations applied successfully');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('❌ Error message:', error.message);
        
        // Log failure
        try {
            await logMigration(migrations[0]?.version || 0, 'Migration failed', 'failed');
        } catch (e) {
            console.warn('Could not log migration failure:', e);
        }
        
        // AUTO-ROLLBACK: Restore from backup
        if (backupData) {
            try {
                console.log('🔄 Auto-rolling back - restoring from backup...');
                db = new SQL.Database(backupData);
                await saveDatabase();
                
                alert(`❌ Migration failed: ${error.message}\n\n✅ Database automatically restored from backup.\n\nThe app will reload now.`);
                
                setTimeout(() => window.location.reload(), 2000);
                return; // Don't throw, we recovered
            } catch (rollbackError) {
                console.error('❌ Rollback failed:', rollbackError);
                alert(`❌ Migration AND rollback failed!\n\nMigration error: ${error.message}\nRollback error: ${rollbackError.message}\n\nPlease restore manually from backup in Admin panel.`);
            }
        } else {
            alert(`❌ Migration failed: ${error.message}\n\nNo backup available for auto-rollback.\nPlease restore manually from backup.`);
        }
        
        throw error;
    }
}

// ===================================
// STORAGE OPERATIONS
// ===================================

async function loadDatabaseFromStorage() {
    try {
        // Check if storage manager is available (will be injected by storage-manager.js)
        if (typeof loadFromStorage === 'function') {
            return await loadFromStorage(DB_NAME);
        }
        
        // Fallback to localStorage
        const saved = localStorage.getItem(`${DB_NAME}_sqljs`);
        if (saved) {
            const buffer = new Uint8Array(JSON.parse(saved));
            return buffer;
        }
        
        return null;
    } catch (error) {
        console.error('Error loading database:', error);
        return null;
    }
}

async function saveDatabase() {
    if (!db) return;
    
    try {
        const data = db.export();
        
        // Use storage manager if available
        if (typeof saveToStorage === 'function') {
            await saveToStorage(DB_NAME, data);
        } else {
            // Fallback to localStorage
            const buffer = Array.from(data);
            localStorage.setItem(`${DB_NAME}_sqljs`, JSON.stringify(buffer));
        }
        
        // AUTO-BACKUP: Store in localStorage for Import feature
        // Note: Browser cannot overwrite Downloads files, so we only backup to localStorage
        // Manual export via Settings still creates downloadable files
        autoBackupToLocalStorage(data);
        
        console.log('💾 Database saved to storage');
    } catch (error) {
        console.error('❌ Failed to save database:', error);
        throw error;
    }
}

// Auto-backup database to localStorage (not Downloads - browser can't overwrite files)
let lastBackupTime = 0;
const BACKUP_INTERVAL = 30000; // 30 seconds minimum between backups

function autoBackupToLocalStorage(data) {
    try {
        const now = Date.now();
        
        // Don't backup too frequently
        if (now - lastBackupTime < BACKUP_INTERVAL) {
            return;
        }
        
        lastBackupTime = now;
        
        // Store backup in localStorage - THIS DOES OVERWRITE
        localStorage.setItem('AynBeirutPOS_latest_backup', JSON.stringify({
            data: Array.from(data),
            timestamp: now,
            version: APP_VERSION,
            date: new Date().toISOString()
        }));
        
        console.log(`💾 Auto-backup updated in localStorage`);
        
        // Check if this is first backup (new installation) or update/refresh
        const installationFlag = localStorage.getItem('AynBeirutPOS_installation_complete');
        
        if (!installationFlag) {
            // NEW INSTALLATION: Download backup file automatically
            console.log('🆕 New installation detected - downloading initial backup...');
            downloadBackupFile(data);
            localStorage.setItem('AynBeirutPOS_installation_complete', 'true');
            console.log('✅ First backup downloaded (new installation)');
        } else {
            // UPDATE/REFRESH: Ask for password before downloading
            console.log('🔄 Existing installation - backup saved to localStorage only');
            console.log('💡 To download backup file, use Settings > Export Database (Ctrl+Shift+S)');
            
            // Optional: Uncomment below to ask user if they want backup on every update
            /*
            const userWantsBackup = confirm(
                '💾 Database updated. Download backup file?\n\n' +
                '(Requires Settings password for security)'
            );
            
            if (userWantsBackup) {
                const password = prompt('Enter Settings Password:');
                if (password === '6969') {
                    downloadBackupFile(data);
                    console.log('✅ Backup downloaded (authorized)');
                } else if (password) {
                    alert('❌ Incorrect password. Backup not downloaded.\n\nData is still saved in browser.');
                }
            }
            */
        }
        
        // In Electron, we'll add file system backup here that CAN overwrite
        if (window.electronAPI) {
            const today = new Date().toISOString().split('T')[0];
            window.electronAPI.saveBackup(data, `AynBeirutPOS_${today}.sqlite`);
        }
        
    } catch (error) {
        // Don't throw - backup is optional, don't break the app
        console.warn('Auto-backup failed:', error);
    }
}

// Helper function to download backup file
function downloadBackupFile(data) {
    try {
        const blob = new Blob([data], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const today = new Date().toISOString().split('T')[0];
        a.download = `AynBeirutPOS_Backup_${today}.sqlite`;
        
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`📥 Backup file downloaded: ${a.download}`);
    } catch (error) {
        console.error('Download failed:', error);
    }
}

async function logMigration(version, description, status) {
    try {
        if (!db) return;
        
        const timestamp = Date.now();
        const logEntry = JSON.stringify({ version, description, status, timestamp });
        
        // Store in system_settings table
        db.run(
            `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)`,
            [`migration_log_${version}_${timestamp}`, logEntry, timestamp]
        );
        
        await saveDatabase();
    } catch (error) {
        console.warn('Could not log migration:', error);
    }
}

async function createBackup(label = '') {
    if (!db) return;
    
    try {
        const data = db.export();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${DB_NAME}_backup_${label}_${timestamp}.sqlite`;
        
        // MANUAL backup - only called by user from Settings page
        const blob = new Blob([data], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log(`✅ Backup created: ${filename}`);
    } catch (error) {
        console.error('❌ Backup failed:', error);
    }
}

// ===================================
// HELPER FUNCTIONS
// ===================================

function runQuery(sql, params = []) {
    if (!db) {
        throw new Error('Database not initialized');
    }
    
    const stmt = db.prepare(sql);
    stmt.bind(params);
    
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    
    return results;
}

// Transaction state management
let transactionActive = false;
let transactionDepth = 0;

function beginTransaction() {
    if (transactionDepth === 0) {
        try {
            db.exec('BEGIN TRANSACTION');
            transactionActive = true;
            console.log('🔄 Transaction started');
        } catch (error) {
            console.error('❌ Failed to start transaction:', error);
            throw error;
        }
    }
    transactionDepth++;
}

async function commit() {
    transactionDepth--;
    if (transactionDepth === 0 && transactionActive) {
        try {
            db.exec('COMMIT');
            await saveDatabase(); // Single save after commit
            transactionActive = false;
            console.log('✅ Transaction committed');
        } catch (error) {
            console.error('❌ Failed to commit transaction:', error);
            transactionActive = false;
            transactionDepth = 0;
            throw error;
        }
    }
}

function rollback() {
    if (!transactionActive) {
        console.log('ℹ️ No active transaction to rollback');
        return;
    }
    try {
        db.exec('ROLLBACK');
        console.log('❌ Transaction rolled back');
    } catch (error) {
        console.error('⚠️ Rollback error (transaction may not exist):', error.message);
    } finally {
        // Always reset state regardless of rollback success
        transactionActive = false;
        transactionDepth = 0;
    }
}

async function runExec(sql, params = []) {
    if (!db) {
        throw new Error('Database not initialized');
    }
    
    try {
        db.run(sql, params);
        
        // Capture last insert ID BEFORE saving (save resets the ID)
        let lastId = null;
        if (sql.trim().toUpperCase().startsWith('INSERT')) {
            const result = db.exec('SELECT last_insert_rowid() as id');
            if (result.length > 0 && result[0].values.length > 0) {
                lastId = result[0].values[0][0];
            }
        }
        
        // Only auto-save if not in a transaction
        if (!transactionActive) {
            await saveDatabase();
        }
        
        // Return last insert ID for INSERT statements
        return lastId;
    } catch (error) {
        console.error('runExec failed:', error);
        throw error;
    }
}

function getLastInsertId() {
    if (!db) return null;
    
    const result = db.exec('SELECT last_insert_rowid() as id');
    if (result.length > 0 && result[0].values.length > 0) {
        return result[0].values[0][0];
    }
    return null;
}

// ===================================
// SALES OPERATIONS
// ===================================

async function saveSale(saleData) {
    try {
        const date = new Date(saleData.timestamp).toISOString().split('T')[0];
        const cashierId = getCashierId();
        
        // Validate required fields
        if (!saleData || !saleData.items || !saleData.totals) {
            console.error('❌ Invalid saleData:', saleData);
            throw new Error('Missing required fields in saleData');
        }
        
        console.log('💾 Saving sale:', {
            timestamp: saleData.timestamp,
            itemCount: saleData.items.length,
            totals: saleData.totals,
            paymentMethod: saleData.paymentMethod
        });
        
        await runExec(
            `INSERT INTO sales (timestamp, date, items, totals, paymentMethod, customerInfo, receiptNumber, cashierName, cashierId, notes, synced) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                saleData.timestamp,
                date,
                JSON.stringify(saleData.items),
                JSON.stringify(saleData.totals),
                saleData.paymentMethod || null,
                saleData.customerInfo ? JSON.stringify(saleData.customerInfo) : null,
                saleData.receiptNumber || null,
                saleData.cashierName || null,
                cashierId,
                saleData.notes || null
            ]
        );
        
        const lastId = getLastInsertId();
        console.log('✅ Sale saved to database:', lastId);
        
        // Add to sync queue
        addToSyncQueue('INSERT', 'sales', { ...saleData, id: lastId });
        
        return Promise.resolve(lastId);
    } catch (error) {
        console.error('Failed to save sale:', error);
        return Promise.reject(error);
    }
}

function getAllSales() {
    try {
        const results = runQuery('SELECT * FROM sales ORDER BY timestamp DESC');
        
        // Parse JSON fields
        return Promise.resolve(results.map(row => ({
            ...row,
            items: JSON.parse(row.items),
            totals: JSON.parse(row.totals),
            customerInfo: row.customerInfo ? JSON.parse(row.customerInfo) : null
        })));
    } catch (error) {
        return Promise.reject(error);
    }
}

function getSalesByDate(date) {
    try {
        const results = runQuery('SELECT * FROM sales WHERE date = ? ORDER BY timestamp DESC', [date]);
        
        return Promise.resolve(results.map(row => ({
            ...row,
            items: JSON.parse(row.items),
            totals: JSON.parse(row.totals),
            customerInfo: row.customerInfo ? JSON.parse(row.customerInfo) : null
        })));
    } catch (error) {
        return Promise.reject(error);
    }
}

function getTodaySales() {
    const today = new Date().toISOString().split('T')[0];
    return getSalesByDate(today);
}

async function clearAllSales() {
    try {
        await runExec('DELETE FROM sales');
        console.log('✅ All sales cleared');
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

async function getDailyStats() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const stats = runQuery(`
            SELECT 
                COUNT(*) as totalTransactions,
                SUM(json_extract(totals, '$.total')) as totalRevenue,
                AVG(json_extract(totals, '$.total')) as averageTransaction
            FROM sales 
            WHERE date = ?
        `, [today]);
        
        return Promise.resolve(stats[0] || { totalTransactions: 0, totalRevenue: 0, averageTransaction: 0 });
    } catch (error) {
        return Promise.reject(error);
    }
}

// ===================================
// CUSTOMER OPERATIONS
// ===================================

async function saveCustomer(customerData) {
    try {
        const now = Date.now();
        
        await runExec(
            `INSERT INTO customers (name, phone, email, address, totalSpent, totalPurchases, lastPurchase, notes, createdAt, updatedAt, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                customerData.name,
                customerData.phone || null,
                customerData.email || null,
                customerData.address || null,
                customerData.totalSpent || 0,
                customerData.totalPurchases || 0,
                customerData.lastPurchase || null,
                customerData.notes || null,
                now,
                now
            ]
        );
        
        const lastId = getLastInsertId();
        console.log('✅ Customer saved:', lastId);
        
        addToSyncQueue('INSERT', 'customers', { ...customerData, id: lastId });
        
        return Promise.resolve(lastId);
    } catch (error) {
        return Promise.reject(error);
    }
}

async function updateCustomer(customerId, customerData) {
    try {
        const now = Date.now();
        
        await runExec(
            `UPDATE customers 
             SET name = ?, phone = ?, email = ?, address = ?, totalSpent = ?, 
                 totalPurchases = ?, lastPurchase = ?, notes = ?, updatedAt = ?, synced = 0
             WHERE id = ?`,
            [
                customerData.name,
                customerData.phone || null,
                customerData.email || null,
                customerData.address || null,
                customerData.totalSpent || 0,
                customerData.totalPurchases || 0,
                customerData.lastPurchase || null,
                customerData.notes || null,
                now,
                customerId
            ]
        );
        
        console.log('✅ Customer updated:', customerId);
        
        addToSyncQueue('UPDATE', 'customers', { ...customerData, id: customerId });
        
        return Promise.resolve(customerId);
    } catch (error) {
        return Promise.reject(error);
    }
}

function getAllCustomers() {
    try {
        const results = runQuery('SELECT * FROM customers ORDER BY name ASC');
        return Promise.resolve(results);
    } catch (error) {
        return Promise.reject(error);
    }
}

function getCustomerByPhone(phone) {
    try {
        const results = runQuery('SELECT * FROM customers WHERE phone = ? LIMIT 1', [phone]);
        return Promise.resolve(results[0] || null);
    } catch (error) {
        return Promise.reject(error);
    }
}

// ===================================
// CATEGORY OPERATIONS
// ===================================

function getAllCategories() {
    try {
        const results = runQuery('SELECT * FROM categories ORDER BY sortOrder ASC');
        return Promise.resolve(results);
    } catch (error) {
        return Promise.reject(error);
    }
}

async function saveCategory(categoryData) {
    try {
        await runExec(
            `INSERT INTO categories (name, displayName, icon, sortOrder, synced)
             VALUES (?, ?, ?, ?, 0)`,
            [
                categoryData.name,
                categoryData.displayName,
                categoryData.icon || null,
                categoryData.sortOrder || 0
            ]
        );
        
        const lastId = getLastInsertId();
        console.log('✅ Category saved:', lastId);
        
        addToSyncQueue('INSERT', 'categories', { ...categoryData, id: lastId });
        
        return Promise.resolve(lastId);
    } catch (error) {
        return Promise.reject(error);
    }
}

async function updateCategory(id, categoryData) {
    try {
        await runExec(
            `UPDATE categories 
             SET name = ?, displayName = ?, icon = ?, sortOrder = ?, synced = 0
             WHERE id = ?`,
            [
                categoryData.name,
                categoryData.displayName,
                categoryData.icon || null,
                categoryData.sortOrder || 0,
                id
            ]
        );
        
        console.log('✅ Category updated:', id);
        
        addToSyncQueue('UPDATE', 'categories', { ...categoryData, id });
        
        return Promise.resolve(id);
    } catch (error) {
        return Promise.reject(error);
    }
}

async function deleteCategory(id) {
    try {
        await runExec('DELETE FROM categories WHERE id = ?', [id]);
        console.log('✅ Category deleted:', id);
        
        addToSyncQueue('DELETE', 'categories', { id });
        
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

// ===================================
// UNPAID ORDERS OPERATIONS
// ===================================

async function saveUnpaidOrder(orderData) {
    try {
        const cashierId = getCashierId();
        
        // Validate required fields
        if (!orderData || !orderData.items || !orderData.totals) {
            console.error('❌ Invalid orderData:', orderData);
            throw new Error('Missing required fields in orderData');
        }
        
        const timestamp = Date.now();
        const customerName = orderData.customerName || null;
        const customerPhone = orderData.customerPhone || null;
        const items = JSON.stringify(orderData.items);
        const totals = JSON.stringify(orderData.totals);
        const createdDate = new Date().toISOString();
        const notes = orderData.notes || null;
        
        console.log('💾 Saving unpaid order:', {
            timestamp,
            customerName,
            itemCount: orderData.items.length,
            totals: orderData.totals,
            cashierId
        });
        
        await runExec(
            `INSERT INTO unpaid_orders (timestamp, status, customerName, customerPhone, items, totals, createdDate, notes, cashierId, synced)
             VALUES (?, 'unpaid', ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                timestamp,
                customerName,
                customerPhone,
                items,
                totals,
                createdDate,
                notes,
                cashierId
            ]
        );
        
        const lastId = getLastInsertId();
        console.log('✅ Unpaid order saved:', lastId);
        
        addToSyncQueue('INSERT', 'unpaid_orders', { ...orderData, id: lastId });
        
        return Promise.resolve(lastId);
    } catch (error) {
        return Promise.reject(error);
    }
}

function getAllUnpaidOrders() {
    try {
        const results = runQuery('SELECT * FROM unpaid_orders WHERE status = "unpaid" ORDER BY timestamp DESC');
        
        return Promise.resolve(results.map(row => ({
            ...row,
            items: JSON.parse(row.items),
            totals: JSON.parse(row.totals)
        })));
    } catch (error) {
        return Promise.reject(error);
    }
}

function getUnpaidOrderById(id) {
    try {
        const results = runQuery('SELECT * FROM unpaid_orders WHERE id = ?', [id]);
        
        if (results.length > 0) {
            const row = results[0];
            return Promise.resolve({
                ...row,
                items: JSON.parse(row.items),
                totals: JSON.parse(row.totals)
            });
        }
        
        return Promise.resolve(null);
    } catch (error) {
        return Promise.reject(error);
    }
}

async function updateUnpaidOrderStatus(id, status, paidDate = null) {
    try {
        await runExec(
            `UPDATE unpaid_orders 
             SET status = ?, paidDate = ?, synced = 0
             WHERE id = ?`,
            [status, paidDate, id]
        );
        
        console.log('✅ Unpaid order status updated:', id);
        
        addToSyncQueue('UPDATE', 'unpaid_orders', { id, status, paidDate });
        
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

async function updateUnpaidOrder(id, orderData) {
    try {
        const currentUser = getCurrentUser();
        
        // Validate required fields
        if (!orderData || !orderData.items || !orderData.totals) {
            throw new Error('Missing required fields in orderData');
        }
        
        const items = JSON.stringify(orderData.items);
        const totals = JSON.stringify(orderData.totals);
        const notes = orderData.notes || null;
        const customerName = orderData.customerName || null;
        const customerPhone = orderData.customerPhone || null;
        const modifiedAt = Date.now();
        const modifiedBy = currentUser ? currentUser.username : 'System';
        
        console.log('💾 Updating unpaid order:', {
            id,
            itemCount: orderData.items.length,
            totals: orderData.totals,
            modifiedBy
        });
        
        await runExec(
            `UPDATE unpaid_orders 
             SET items = ?, totals = ?, notes = ?, customerName = ?, customerPhone = ?,
                 modified = 1, modifiedAt = ?, modifiedBy = ?, synced = 0
             WHERE id = ?`,
            [
                items,
                totals,
                notes,
                customerName,
                customerPhone,
                modifiedAt,
                modifiedBy,
                id
            ]
        );
        
        console.log('✅ Unpaid order updated:', id);
        
        addToSyncQueue('UPDATE', 'unpaid_orders', { ...orderData, id });
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('order_modification', `Modified unpaid order #${id} - ${modifiedBy}`);
        }
        
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

async function deleteUnpaidOrder(id) {
    try {
        await runExec('DELETE FROM unpaid_orders WHERE id = ?', [id]);
        console.log('✅ Unpaid order deleted:', id);
        
        addToSyncQueue('DELETE', 'unpaid_orders', { id });
        
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

// ===================================
// PHONEBOOK OPERATIONS
// ===================================

async function savePhonebookClient(clientData) {
    try {
        await runExec(
            `INSERT INTO phonebook (name, phone, email, address, notes, createdBy, cashierId, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [clientData.name, clientData.phone, clientData.email, clientData.address, 
             clientData.notes, clientData.createdBy, clientData.cashierId]
        );
        
        addToSyncQueue('INSERT', 'phonebook', clientData);
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

async function updatePhonebookClient(id, clientData) {
    try {
        await runExec(
            `UPDATE phonebook 
             SET name = ?, phone = ?, email = ?, address = ?, notes = ?, synced = 0
             WHERE id = ?`,
            [clientData.name, clientData.phone, clientData.email, clientData.address, clientData.notes, id]
        );
        
        addToSyncQueue('UPDATE', 'phonebook', { id, ...clientData });
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

function getPhonebookClients() {
    try {
        const results = runQuery('SELECT * FROM phonebook ORDER BY name ASC');
        return Promise.resolve(results);
    } catch (error) {
        return Promise.reject(error);
    }
}

// ===================================
// BILL PAYMENTS OPERATIONS
// ===================================

async function saveBillPayment(paymentData) {
    try {
        await runExec(
            `INSERT INTO bill_payments 
             (billType, billNumber, customerName, customerPhone, amount, paymentMethod, 
              timestamp, receiptNumber, cashierId, notes, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [paymentData.billType, paymentData.billNumber, paymentData.customerName, 
             paymentData.customerPhone, paymentData.amount, paymentData.paymentMethod,
             paymentData.timestamp, paymentData.receiptNumber, paymentData.cashierId, paymentData.notes]
        );
        
        addToSyncQueue('INSERT', 'bill_payments', paymentData);
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

function getAllBillPayments(startDate, endDate) {
    try {
        let query = `
            SELECT bp.*, bt.name as billTypeName, bt.icon as billTypeIcon
            FROM bill_payments bp
            LEFT JOIN bill_types bt ON bp.billType = bt.id
        `;
        let params = [];
        
        if (startDate && endDate) {
            query += ` WHERE DATE(bp.timestamp/1000, 'unixepoch') BETWEEN ? AND ?`;
            params = [startDate, endDate];
        }
        
        query += ` ORDER BY bp.timestamp DESC`;
        
        const results = runQuery(query, params);
        return Promise.resolve(results);
    } catch (error) {
        return Promise.reject(error);
    }
}

// ===================================
// BILL TYPES OPERATIONS
// ===================================

function getAllBillTypes() {
    try {
        const results = runQuery('SELECT * FROM bill_types ORDER BY sortOrder ASC, name ASC');
        return Promise.resolve(results);
    } catch (error) {
        return Promise.reject(error);
    }
}

async function saveBillType(typeData) {
    try {
        await runExec(
            `INSERT INTO bill_types (name, icon, isDefault, sortOrder, isActive, createdBy)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [typeData.name, typeData.icon, typeData.isDefault, typeData.sortOrder, 
             typeData.isActive, typeData.createdBy]
        );
        
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

async function updateBillType(id, typeData) {
    try {
        await runExec(
            `UPDATE bill_types 
             SET name = ?, icon = ?, sortOrder = ?, isActive = ?
             WHERE id = ?`,
            [typeData.name, typeData.icon, typeData.sortOrder, typeData.isActive, id]
        );
        
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

// ===================================
// COMPANY INFO OPERATIONS
// ===================================

function getCompanyInfo() {
    try {
        const results = runQuery('SELECT * FROM company_info WHERE id = 1');
        return Promise.resolve(results.length > 0 ? results[0] : null);
    } catch (error) {
        return Promise.reject(error);
    }
}

async function saveCompanyInfo(companyData) {
    try {
        console.log('🔵 saveCompanyInfo called with:', companyData);
        
        await runExec(
            `INSERT OR REPLACE INTO company_info 
             (id, companyName, phone, website, email, taxId, address, updatedAt, updatedBy)
             VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyData.companyName, companyData.phone, companyData.website, 
             companyData.email, companyData.taxId, companyData.address, 
             Date.now(), companyData.updatedBy]
        );
        
        console.log('🟢 Company info saved to database');
        return Promise.resolve();
    } catch (error) {
        console.error('🔴 Database save error:', error);
        return Promise.reject(error);
    }
}

// ===================================
// APP SETTINGS OPERATIONS
// ===================================

function getAppSetting(key) {
    try {
        const results = runQuery('SELECT value FROM app_settings WHERE key = ?', [key]);
        return results.length > 0 ? results[0].value : null;
    } catch (error) {
        return null;
    }
}

async function setAppSetting(key, value, category = 'general') {
    try {
        await runExec(
            `INSERT OR REPLACE INTO app_settings (key, value, category, updated_at)
             VALUES (?, ?, ?, ?)`,
            [key, value, category, Date.now()]
        );
    } catch (error) {
        console.error('Failed to set app setting:', error);
    }
}

function getAllAppSettings() {
    try {
        const results = runQuery('SELECT * FROM app_settings ORDER BY category, key');
        return Promise.resolve(results);
    } catch (error) {
        return Promise.reject(error);
    }
}

// ===================================
// SYNC QUEUE OPERATIONS
// ===================================

async function addToSyncQueue(operation, tableName, data) {
    try {
        await runExec(
            `INSERT INTO sync_queue (operation, table_name, data, timestamp, synced)
             VALUES (?, ?, ?, ?, 0)`,
            [operation, tableName, JSON.stringify(data), Date.now()]
        );
    } catch (error) {
        console.error('Failed to add to sync queue:', error);
    }
}

function getPendingSyncOperations() {
    try {
        const results = runQuery('SELECT * FROM sync_queue WHERE synced = 0 ORDER BY timestamp ASC');
        
        return Promise.resolve(results.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        })));
    } catch (error) {
        return Promise.reject(error);
    }
}

async function markSyncOperationComplete(id) {
    try {
        await runExec('UPDATE sync_queue SET synced = 1 WHERE id = ?', [id]);
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

function getCashierId() {
    let cashierId = localStorage.getItem('cashier_id');
    
    if (!cashierId) {
        // Generate UUID v4
        cashierId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem('cashier_id', cashierId);
        console.log('✅ Generated new cashier ID:', cashierId);
    }
    
    return cashierId;
}

function getSystemSetting(key) {
    try {
        const results = runQuery('SELECT value FROM system_settings WHERE key = ?', [key]);
        return results.length > 0 ? results[0].value : null;
    } catch (error) {
        return null;
    }
}

async function setSystemSetting(key, value) {
    try {
        await runExec(
            `INSERT OR REPLACE INTO system_settings (key, value, updated_at)
             VALUES (?, ?, ?)`,
            [key, value, Date.now()]
        );
    } catch (error) {
        console.error('Failed to set system setting:', error);
    }
}

// ===================================
// EXPORT TO WINDOW
// ===================================

if (typeof window !== 'undefined') {
    window.initDatabase = initDatabase;
    window.saveDatabase = saveDatabase;
    window.createBackup = createBackup;
    
    // Sales
    window.saveSale = saveSale;
    window.getAllSales = getAllSales;
    window.getSalesByDate = getSalesByDate;
    window.getTodaySales = getTodaySales;
    window.clearAllSales = clearAllSales;
    window.getDailyStats = getDailyStats;
    
    // Customers
    window.saveCustomer = saveCustomer;
    window.updateCustomer = updateCustomer;
    window.getAllCustomers = getAllCustomers;
    window.getCustomerByPhone = getCustomerByPhone;
    
    // Categories
    window.getAllCategories = getAllCategories;
    window.saveCategory = saveCategory;
    window.updateCategory = updateCategory;
    window.deleteCategory = deleteCategory;
    
    // Unpaid Orders
    window.saveUnpaidOrder = saveUnpaidOrder;
    window.getAllUnpaidOrders = getAllUnpaidOrders;
    window.getUnpaidOrderById = getUnpaidOrderById;
    window.updateUnpaidOrderStatus = updateUnpaidOrderStatus;
    window.updateUnpaidOrder = updateUnpaidOrder;
    window.deleteUnpaidOrder = deleteUnpaidOrder;
    
    // Phonebook
    window.savePhonebookClient = savePhonebookClient;
    window.updatePhonebookClient = updatePhonebookClient;
    window.getPhonebookClients = getPhonebookClients;
    
    // Bill Payments
    window.saveBillPayment = saveBillPayment;
    window.getAllBillPayments = getAllBillPayments;
    
    // Bill Types
    window.getAllBillTypes = getAllBillTypes;
    window.saveBillType = saveBillType;
    window.updateBillType = updateBillType;
    
    // Company Info
    window.getCompanyInfo = getCompanyInfo;
    window.saveCompanyInfo = saveCompanyInfo;
    
    // App Settings
    window.getAppSetting = getAppSetting;
    window.setAppSetting = setAppSetting;
    window.getAllAppSettings = getAllAppSettings;
    
    // Sync
    window.getPendingSyncOperations = getPendingSyncOperations;
    window.markSyncOperationComplete = markSyncOperationComplete;
    
    // Utilities
    window.getCashierId = getCashierId;
    window.getSystemSetting = getSystemSetting;
    window.setSystemSetting = setSystemSetting;
    
    // Migration Rollback
    window.rollbackMigration = rollbackMigration;
    window.backupDatabase = backupDatabase;
    window.restoreDatabase = restoreDatabase;
    window.fixServiceTypes = fixServiceTypes;
}

/**
 * Fix service product types (manual data migration)
 */
function fixServiceTypes() {
    try {
        console.log('🔧 Fixing service product types...');
        
        const updateSQL = `
            UPDATE products 
            SET type = 'service',
                hourlyEnabled = 1,
                firstHourRate = CASE 
                    WHEN name LIKE '%repair%' OR name LIKE '%maintenance%' THEN 50.00
                    WHEN name LIKE '%consult%' THEN 75.00
                    WHEN name LIKE '%recovery%' THEN 100.00
                    ELSE price
                END,
                additionalHourRate = CASE 
                    WHEN name LIKE '%repair%' OR name LIKE '%maintenance%' THEN 35.00
                    WHEN name LIKE '%consult%' THEN 50.00
                    WHEN name LIKE '%recovery%' THEN 60.00
                    ELSE price * 0.7
                END
            WHERE category = 'software' 
               OR LOWER(name) LIKE '%service%' 
               OR LOWER(name) LIKE '%repair%' 
               OR LOWER(name) LIKE '%maintenance%'
               OR LOWER(name) LIKE '%installation%'
               OR LOWER(name) LIKE '%consultation%'
               OR LOWER(name) LIKE '%recovery%';
        `;
        
        database.run(updateSQL);
        
        // Disable hourly for simple services
        const disableHourlySQL = `
            UPDATE products
            SET hourlyEnabled = 0,
                firstHourRate = 0,
                additionalHourRate = 0
            WHERE type = 'service' 
              AND (LOWER(name) LIKE '%installation%' 
                   AND LOWER(name) NOT LIKE '%repair%' 
                   AND LOWER(name) NOT LIKE '%consult%' 
                   AND LOWER(name) NOT LIKE '%recovery%');
        `;
        
        database.run(disableHourlySQL);
        
        // Get count of updated products
        const result = database.exec("SELECT COUNT(*) as count FROM products WHERE type = 'service'");
        const serviceCount = result[0]?.values[0][0] || 0;
        
        saveDatabase();
        
        console.log(`✅ Fixed ${serviceCount} service products`);
        alert(`✅ Service types fixed!\n\n${serviceCount} products updated to 'service' type.\n\nPage will reload to apply changes.`);
        
        location.reload();
        return true;
    } catch (error) {
        console.error('❌ Failed to fix service types:', error);
        alert(`Failed to fix service types: ${error.message}`);
        return false;
    }
}

/**
 * Auto-fix service types on page load (silent, no alert)
 */
function autoFixServiceTypes() {
    try {
        console.log('🔧 Running auto-fix service types check...');
        
        if (!database) {
            console.error('❌ Database not initialized yet');
            return;
        }
        
        // Check if there are any products with category='software' but type='item'
        const checkSQL = "SELECT COUNT(*) as count FROM products WHERE category = 'software' AND type = 'item'";
        console.log('📊 Executing check query:', checkSQL);
        
        const result = database.exec(checkSQL);
        console.log('📊 Check result:', result);
        
        const misconfiguredCount = result[0]?.values[0][0] || 0;
        console.log(`📊 Found ${misconfiguredCount} misconfigured service products`);
        
        if (misconfiguredCount === 0) {
            console.log('✅ No service type fixes needed');
            return;
        }
        
        console.log(`🔧 Auto-fixing ${misconfiguredCount} misconfigured service products...`);
        
        const updateSQL = `
            UPDATE products 
            SET type = 'service',
                hourlyEnabled = 1,
                firstHourRate = CASE 
                    WHEN LOWER(name) LIKE '%repair%' OR LOWER(name) LIKE '%maintenance%' THEN 50.00
                    WHEN LOWER(name) LIKE '%consult%' THEN 75.00
                    WHEN LOWER(name) LIKE '%recovery%' THEN 100.00
                    ELSE price
                END,
                additionalHourRate = CASE 
                    WHEN LOWER(name) LIKE '%repair%' OR LOWER(name) LIKE '%maintenance%' THEN 35.00
                    WHEN LOWER(name) LIKE '%consult%' THEN 50.00
                    WHEN LOWER(name) LIKE '%recovery%' THEN 60.00
                    ELSE price * 0.7
                END
            WHERE category = 'software' 
               OR LOWER(name) LIKE '%service%' 
               OR LOWER(name) LIKE '%repair%' 
               OR LOWER(name) LIKE '%maintenance%'
               OR LOWER(name) LIKE '%installation%'
               OR LOWER(name) LIKE '%consultation%'
               OR LOWER(name) LIKE '%recovery%';
        `;
        
        console.log('🔧 Running UPDATE query...');
        database.run(updateSQL);
        console.log('✅ UPDATE completed successfully');
        
        // Disable hourly for simple services
        const disableHourlySQL = `
            UPDATE products
            SET hourlyEnabled = 0,
                firstHourRate = 0,
                additionalHourRate = 0
            WHERE type = 'service' 
              AND (LOWER(name) LIKE '%installation%' 
                   AND LOWER(name) NOT LIKE '%repair%' 
                   AND LOWER(name) NOT LIKE '%consult%' 
                   AND LOWER(name) NOT LIKE '%recovery%');
        `;
        
        console.log('🔧 Disabling hourly rates for simple services...');
        database.run(disableHourlySQL);
        console.log('✅ Hourly adjustments completed');
        
        console.log('💾 Saving database...');
        saveDatabase();
        console.log('✅ Database saved');
        
        console.log(`✅ Auto-fixed ${misconfiguredCount} service products - page will reload in 1 second`);
        
        // Reload page to apply changes (with slight delay to allow save to complete)
        setTimeout(() => {
            console.log('🔄 Reloading page...');
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Auto-fix service types failed:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        // Don't alert on auto-fix errors, just log them
    }
}

/**
 * ===================================
 * MIGRATION ROLLBACK SYSTEM
 * ===================================
 */

/**
 * Backup database before rollback
 */
/**
 * Manual backup function - Downloads database file to user's computer
 * Only called when user clicks "Backup" button in Settings page
 */
async function backupDatabase() {
    try {
        if (!db) {
            throw new Error('Database not initialized');
        }

        // Export database to binary
        const data = db.export();
        const blob = new Blob([data], { type: 'application/octet-stream' });
        
        // MANUAL download - user initiated only
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pos-backup-${Date.now()}.db`;
        a.click();
        URL.revokeObjectURL(url);

        // Also save to localStorage as emergency backup
        try {
            const base64 = btoa(String.fromCharCode.apply(null, data));
            localStorage.setItem('pos_emergency_backup', base64);
            localStorage.setItem('pos_backup_timestamp', Date.now().toString());
        } catch (e) {
            console.warn('Could not save emergency backup to localStorage:', e);
        }

        console.log('✅ Database backup created');
        return true;
    } catch (error) {
        console.error('❌ Backup failed:', error);
        throw error;
    }
}

/**
 * Restore database from file
 */
async function restoreDatabase(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        // Load database from backup
        db = new SQL.Database(data);
        
        // Save to localStorage
        saveDatabase();
        
        console.log('✅ Database restored from backup');
        
        // Reload page to reinitialize
        if (confirm('Database restored successfully. Page will reload.')) {
            location.reload();
        }
        
        return true;
    } catch (error) {
        console.error('❌ Restore failed:', error);
        throw error;
    }
}

/**
 * Rollback migration 002
 */
async function rollbackMigration(targetVersion = 1) {
    try {
        // Check current version
        const currentVersion = db.exec('SELECT version FROM schema_version')[0].values[0][0];
        
        if (currentVersion <= targetVersion) {
            alert(`Already at version ${currentVersion}. No rollback needed.`);
            return false;
        }

        // Verify admin permission
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        if (currentUser.role !== 'admin') {
            alert('Only administrators can rollback migrations.');
            return false;
        }

        // Confirm rollback
        const confirmMsg = `⚠️ MIGRATION ROLLBACK WARNING ⚠️

Current Version: ${currentVersion}
Target Version: ${targetVersion}

This will:
1. CREATE A BACKUP of current database
2. DELETE all data in: phonebook, bill_payments, bill_types, company_info, app_settings
3. REMOVE these tables from database
4. DOWNGRADE schema to version ${targetVersion}

This action CANNOT be undone (unless you restore from backup).

Type "ROLLBACK" to confirm:`;

        const userInput = prompt(confirmMsg);
        if (userInput !== 'ROLLBACK') {
            console.log('Rollback cancelled by user');
            return false;
        }

        // Step 1: Create backup
        console.log('📦 Creating backup before rollback...');
        await backupDatabase();

        // Step 2: Export data from tables to be dropped
        const phonebookData = db.exec('SELECT * FROM phonebook');
        const billPaymentsData = db.exec('SELECT * FROM bill_payments');
        const billTypesData = db.exec('SELECT * FROM bill_types');
        const companyInfoData = db.exec('SELECT * FROM company_info');
        const appSettingsData = db.exec('SELECT * FROM app_settings');

        const dataBackup = {
            timestamp: Date.now(),
            version: currentVersion,
            phonebook: phonebookData[0]?.values || [],
            billPayments: billPaymentsData[0]?.values || [],
            billTypes: billTypesData[0]?.values || [],
            companyInfo: companyInfoData[0]?.values || [],
            appSettings: appSettingsData[0]?.values || []
        };

        // Save data backup to localStorage
        localStorage.setItem('migration_002_backup_data', JSON.stringify(dataBackup));
        console.log('📊 Data backed up to localStorage');

        // Step 3: Load rollback SQL
        const rollbackSQL = await fetch('migrations/002-rollback.sql')
            .then(r => r.text())
            .catch(() => {
                // Fallback: inline rollback SQL
                return `
                    DROP TABLE IF EXISTS app_settings;
                    DROP TABLE IF EXISTS company_info;
                    DROP TABLE IF EXISTS bill_payments;
                    DROP TABLE IF EXISTS bill_types;
                    DROP TABLE IF EXISTS phonebook;
                    UPDATE schema_version SET version = 1 WHERE version = 2;
                `;
            });

        // Step 4: Execute rollback
        console.log('🔄 Executing rollback...');
        db.run(rollbackSQL);

        // Step 5: Verify
        const newVersion = db.exec('SELECT version FROM schema_version')[0].values[0][0];
        console.log(`✅ Rollback complete. Schema version: ${newVersion}`);

        // Step 6: Save database
        saveDatabase();

        // Step 7: Reload page
        alert(`Rollback successful!\n\nSchema version: ${newVersion}\n\nData backup saved to localStorage and downloads.\n\nPage will reload.`);
        location.reload();

        return true;
    } catch (error) {
        console.error('❌ Rollback failed:', error);
        alert(`Rollback failed: ${error.message}\n\nDatabase may be in inconsistent state. Please restore from backup.`);
        throw error;
    }
}

/**
 * Restore data from migration 002 backup
 */
function restoreMigration002Data() {
    try {
        const backupData = JSON.parse(localStorage.getItem('migration_002_backup_data') || '{}');
        
        if (!backupData.timestamp) {
            alert('No backup data found');
            return false;
        }

        const backupDate = new Date(backupData.timestamp).toLocaleString();
        if (!confirm(`Restore data from backup created on ${backupDate}?`)) {
            return false;
        }

        // Re-run migration 002 first
        alert('Please run migration 002 again before restoring data');
        return false;

    } catch (error) {
        console.error('Failed to restore backup data:', error);
        return false;
    }
}

console.log('📦 SQL.js database module loaded');
