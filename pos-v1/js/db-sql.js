// ===================================
// AYN BEIRUT POS - SQL.JS DATABASE
// LiteSQL offline-first persistence
// ===================================

let db = null;
let SQL = null;
const DB_NAME = 'AynBeirutPOS';
const APP_VERSION = '1.0.0';
const CURRENT_SCHEMA_VERSION = 1;

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
    
    // For now, we only have migration 001
    if (fromVersion < 1 && toVersion >= 1) {
        // Load migration 001 content (embedded for now, can be fetched later)
        migrations.push({
            version: 1,
            description: 'Initial schema with all 8 core tables + sync_queue + system_settings',
            sql: await fetch('./migrations/001-initial-schema.sql').then(r => r.text())
        });
    }
    
    return migrations;
}

async function requestMigrationApproval(migrations, fromVersion, toVersion) {
    // Auto-approve initial schema creation (0 -> 1)
    if (fromVersion === 0 && toVersion === 1) {
        console.log('✅ Auto-approving initial schema creation');
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
        // Create backup before migration
        console.log('💾 Creating backup before migration...');
        if (db) {
            backupData = db.export();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${DB_NAME}_backup_pre-migration_${timestamp}`;
            
            // Save to localStorage as emergency backup
            try {
                localStorage.setItem(filename, JSON.stringify(Array.from(backupData)));
                console.log(`✅ Emergency backup saved: ${filename}`);
            } catch (e) {
                console.warn('⚠️ Could not save emergency backup to localStorage:', e);
            }
        }
        
        await createBackup('pre-migration');
        
        // Apply each migration
        for (const migration of migrations) {
            console.log(`📝 Applying migration ${migration.version}: ${migration.description}`);
            db.exec(migration.sql);
            
            // Log migration to system_settings
            await logMigration(migration.version, migration.description, 'success');
        }
        
        // Save database after migrations
        await saveDatabase();
        
        console.log('✅ All migrations applied successfully');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        
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
        
        console.log('💾 Database saved to storage');
    } catch (error) {
        console.error('❌ Failed to save database:', error);
        throw error;
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
        
        // Create downloadable backup
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

function runExec(sql, params = []) {
    if (!db) {
        throw new Error('Database not initialized');
    }
    
    db.run(sql, params);
    saveDatabase(); // Auto-save after write operations
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

function saveSale(saleData) {
    try {
        const date = new Date(saleData.timestamp).toISOString().split('T')[0];
        const cashierId = getCashierId();
        
        runExec(
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

function clearAllSales() {
    try {
        runExec('DELETE FROM sales');
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
                SUM(json_extract(totals, '$.grandTotal')) as totalRevenue,
                AVG(json_extract(totals, '$.grandTotal')) as averageTransaction
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

function saveCustomer(customerData) {
    try {
        const now = Date.now();
        
        runExec(
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

function updateCustomer(customerId, customerData) {
    try {
        const now = Date.now();
        
        runExec(
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

function saveCategory(categoryData) {
    try {
        runExec(
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

function updateCategory(id, categoryData) {
    try {
        runExec(
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

function deleteCategory(id) {
    try {
        runExec('DELETE FROM categories WHERE id = ?', [id]);
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

function saveUnpaidOrder(orderData) {
    try {
        const cashierId = getCashierId();
        
        runExec(
            `INSERT INTO unpaid_orders (timestamp, status, customerName, customerPhone, items, totals, createdDate, notes, cashierId, synced)
             VALUES (?, 'unpaid', ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                Date.now(),
                orderData.customerName || null,
                orderData.customerPhone || null,
                JSON.stringify(orderData.items),
                JSON.stringify(orderData.totals),
                new Date().toISOString(),
                orderData.notes || null,
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

function updateUnpaidOrderStatus(id, status, paidDate = null) {
    try {
        runExec(
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

function deleteUnpaidOrder(id) {
    try {
        runExec('DELETE FROM unpaid_orders WHERE id = ?', [id]);
        console.log('✅ Unpaid order deleted:', id);
        
        addToSyncQueue('DELETE', 'unpaid_orders', { id });
        
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

// ===================================
// SYNC QUEUE OPERATIONS
// ===================================

function addToSyncQueue(operation, tableName, data) {
    try {
        runExec(
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

function markSyncOperationComplete(id) {
    try {
        runExec('UPDATE sync_queue SET synced = 1 WHERE id = ?', [id]);
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

function setSystemSetting(key, value) {
    try {
        runExec(
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
    window.deleteUnpaidOrder = deleteUnpaidOrder;
    
    // Sync
    window.getPendingSyncOperations = getPendingSyncOperations;
    window.markSyncOperationComplete = markSyncOperationComplete;
    
    // Utilities
    window.getCashierId = getCashierId;
    window.getSystemSetting = getSystemSetting;
    window.setSystemSetting = setSystemSetting;
}

console.log('📦 SQL.js database module loaded');
