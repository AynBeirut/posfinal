// ===================================
// SUPPLIERS MANAGEMENT MODULE
// Handles supplier CRUD operations and balance tracking
// ===================================

// Initialize suppliers module - create tables if they don't exist
async function initSuppliersModule() {
    try {
        console.log('📦 Initializing Suppliers Module...');
        
        // Check if database is available
        if (!db || typeof runExec !== 'function') {
            console.warn('⚠️ Database not ready, skipping suppliers initialization');
            return;
        }
        
        // Create suppliers table if it doesn't exist
        await runExec(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contactPerson TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                paymentTerms TEXT,
                balance REAL DEFAULT 0,
                notes TEXT,
                createdAt INTEGER NOT NULL,
                updatedAt INTEGER NOT NULL,
                synced INTEGER DEFAULT 0,
                synced_at INTEGER
            )
        `);
        
        await runExec(`CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)`);
        
        // Create deliveries table if it doesn't exist
        await runExec(`
            CREATE TABLE IF NOT EXISTS deliveries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supplierId INTEGER NOT NULL,
                deliveryRef TEXT,
                invoiceNumber TEXT,
                deliveryDate INTEGER NOT NULL,
                totalAmount REAL DEFAULT 0,
                notes TEXT,
                receivedBy TEXT,
                createdAt INTEGER NOT NULL,
                synced INTEGER DEFAULT 0,
                synced_at INTEGER,
                FOREIGN KEY (supplierId) REFERENCES suppliers(id)
            )
        `);
        
        await runExec(`CREATE INDEX IF NOT EXISTS idx_deliveries_supplierId ON deliveries(supplierId)`);
        await runExec(`CREATE INDEX IF NOT EXISTS idx_deliveries_deliveryDate ON deliveries(deliveryDate)`);
        
        // Create delivery_items table if it doesn't exist
        await runExec(`
            CREATE TABLE IF NOT EXISTS delivery_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deliveryId INTEGER NOT NULL,
                productId INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                unitCost REAL NOT NULL,
                lineTotal REAL NOT NULL,
                FOREIGN KEY (deliveryId) REFERENCES deliveries(id),
                FOREIGN KEY (productId) REFERENCES products(id)
            )
        `);
        
        await runExec(`CREATE INDEX IF NOT EXISTS idx_delivery_items_deliveryId ON delivery_items(deliveryId)`);
        await runExec(`CREATE INDEX IF NOT EXISTS idx_delivery_items_productId ON delivery_items(productId)`);
        
        // Create supplier_payments table if it doesn't exist
        await runExec(`
            CREATE TABLE IF NOT EXISTS supplier_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supplierId INTEGER NOT NULL,
                amount REAL NOT NULL,
                paymentMethod TEXT,
                reference TEXT,
                notes TEXT,
                paidBy TEXT,
                paidAt INTEGER NOT NULL,
                createdAt INTEGER NOT NULL,
                synced INTEGER DEFAULT 0,
                synced_at INTEGER,
                FOREIGN KEY (supplierId) REFERENCES suppliers(id)
            )
        `);
        
        await runExec(`CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplierId ON supplier_payments(supplierId)`);
        await runExec(`CREATE INDEX IF NOT EXISTS idx_supplier_payments_paidAt ON supplier_payments(paidAt)`);
        
        // Create purchase_returns table if it doesn't exist
        await runExec(`
            CREATE TABLE IF NOT EXISTS purchase_returns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deliveryId INTEGER NOT NULL,
                originalDeliveryDate INTEGER,
                returnAmount REAL NOT NULL,
                returnType TEXT DEFAULT 'full' CHECK(returnType IN ('full', 'partial')),
                returnItems TEXT NOT NULL,
                reason TEXT NOT NULL,
                approvedBy TEXT NOT NULL,
                approverUsername TEXT NOT NULL,
                approverRole TEXT NOT NULL,
                processedBy TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                returnReference TEXT,
                supplierNotified INTEGER DEFAULT 0,
                creditNote TEXT,
                notes TEXT,
                synced INTEGER DEFAULT 0,
                synced_at INTEGER,
                FOREIGN KEY (deliveryId) REFERENCES deliveries(id)
            )
        `);
        
        await runExec(`CREATE INDEX IF NOT EXISTS idx_purchase_returns_deliveryId ON purchase_returns(deliveryId)`);
        await runExec(`CREATE INDEX IF NOT EXISTS idx_purchase_returns_timestamp ON purchase_returns(timestamp)`);
        await runExec(`CREATE INDEX IF NOT EXISTS idx_purchase_returns_reason ON purchase_returns(reason)`);
        
        // Add return tracking columns to deliveries table if they don't exist
        // Check if columns exist first to avoid error logs
        const deliveriesInfo = db.exec(`PRAGMA table_info(deliveries)`);
        const existingColumns = deliveriesInfo.length > 0 ? deliveriesInfo[0].values.map(col => col[1]) : [];
        
        if (!existingColumns.includes('returnId')) {
            await runExec(`ALTER TABLE deliveries ADD COLUMN returnId INTEGER`);
        }
        if (!existingColumns.includes('returnedAt')) {
            await runExec(`ALTER TABLE deliveries ADD COLUMN returnedAt INTEGER`);
        }
        if (!existingColumns.includes('returnStatus')) {
            await runExec(`ALTER TABLE deliveries ADD COLUMN returnStatus TEXT DEFAULT 'none'`);
        }
        
        console.log('✅ Suppliers module tables initialized');
        
    } catch (error) {
        console.error('❌ Error initializing suppliers module:', error);
        // Don't throw - allow app to continue even if tables can't be created
    }
}

// Load all suppliers from database
async function loadSuppliers() {
    try {
        const results = await runQuery('SELECT * FROM suppliers ORDER BY name');
        return results || [];
    } catch (error) {
        console.error('Error loading suppliers:', error);
        return [];
    }
}

// Get supplier by ID
async function getSupplierById(supplierId) {
    try {
        const results = await runQuery('SELECT * FROM suppliers WHERE id = ?', [supplierId]);
        return results && results.length > 0 ? results[0] : null;
    } catch (error) {
        console.error('Error getting supplier:', error);
        return null;
    }
}

// Add new supplier
async function addSupplier(supplierData) {
    try {
        const { name, contactPerson, phone, email, address, paymentTerms, notes } = supplierData;
        
        if (!name || name.trim() === '') {
            throw new Error('Supplier name is required');
        }
        
        const now = Date.now();
        
        // Insert supplier and get ID from runExec return value
        const supplierId = await runExec(
            `INSERT INTO suppliers (name, contactPerson, phone, email, address, paymentTerms, balance, notes, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
            [
                name.trim(),
                contactPerson || '',
                phone || '',
                email || '',
                address || '',
                paymentTerms || '',
                notes || '',
                now,
                now
            ]
        );
        
        console.log('Supplier ID:', supplierId);
        
        if (!supplierId || supplierId === 0) {
            throw new Error(`Failed to get supplier ID after insertion. Got: ${supplierId}`);
        }
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('supplier_add', `Added supplier: ${name}`);
        }
        
        console.log(`✅ Supplier added: ${name} (ID: ${supplierId})`);
        return supplierId;
        
    } catch (error) {
        console.error('Error adding supplier:', error);
        throw error;
    }
}

// Update existing supplier
async function updateSupplier(supplierId, supplierData) {
    try {
        const { name, contactPerson, phone, email, address, paymentTerms, notes } = supplierData;
        
        if (!name || name.trim() === '') {
            throw new Error('Supplier name is required');
        }
        
        const now = Date.now();
        
        await runExec(
            `UPDATE suppliers 
             SET name = ?, contactPerson = ?, phone = ?, email = ?, address = ?, 
                 paymentTerms = ?, notes = ?, updatedAt = ?
             WHERE id = ?`,
            [
                name.trim(),
                contactPerson || '',
                phone || '',
                email || '',
                address || '',
                paymentTerms || '',
                notes || '',
                now,
                supplierId
            ]
        );
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('supplier_edit', `Updated supplier: ${name} (ID: ${supplierId})`);
        }
        
        console.log(`✅ Supplier updated: ${name}`);
        return true;
        
    } catch (error) {
        console.error('Error updating supplier:', error);
        throw error;
    }
}

// Delete supplier
async function deleteSupplier(supplierId) {
    try {
        // Check if supplier has any deliveries
        const deliveries = await runQuery('SELECT COUNT(*) as count FROM deliveries WHERE supplierId = ?', [supplierId]);
        
        if (deliveries && deliveries[0].count > 0) {
            throw new Error('Cannot delete supplier with existing deliveries. Please delete or reassign deliveries first.');
        }
        
        // Get supplier name for logging
        const supplier = await getSupplierById(supplierId);
        const supplierName = supplier ? supplier.name : `ID ${supplierId}`;
        
        await runExec('DELETE FROM suppliers WHERE id = ?', [supplierId]);
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('supplier_delete', `Deleted supplier: ${supplierName}`);
        }
        
        console.log(`✅ Supplier deleted: ${supplierName}`);
        return true;
        
    } catch (error) {
        console.error('Error deleting supplier:', error);
        throw error;
    }
}

// Get supplier balance (negative = we owe them, positive = they owe us)
async function getSupplierBalance(supplierId) {
    try {
        const results = await runQuery('SELECT balance FROM suppliers WHERE id = ?', [supplierId]);
        return results && results.length > 0 ? (results[0].balance || 0) : 0;
    } catch (error) {
        console.error('Error getting supplier balance:', error);
        return 0;
    }
}

// Update supplier balance
async function updateSupplierBalance(supplierId, amount, reason = '') {
    try {
        const currentBalance = await getSupplierBalance(supplierId);
        const newBalance = currentBalance + amount;
        
        await runExec(
            'UPDATE suppliers SET balance = ?, updatedAt = ? WHERE id = ?',
            [newBalance, Date.now(), supplierId]
        );
        
        console.log(`✅ Supplier balance updated: ${currentBalance.toFixed(2)} → ${newBalance.toFixed(2)} (${reason})`);
        return newBalance;
        
    } catch (error) {
        console.error('Error updating supplier balance:', error);
        throw error;
    }
}

// Get suppliers with outstanding balances (we owe them money)
async function getSuppliersWithDebt() {
    try {
        const results = await runQuery(
            'SELECT * FROM suppliers WHERE balance < 0 ORDER BY balance ASC'
        );
        return results || [];
    } catch (error) {
        console.error('Error getting suppliers with debt:', error);
        return [];
    }
}

// Get total amount owed to all suppliers
async function getTotalSupplierDebt() {
    try {
        const results = await runQuery(
            'SELECT SUM(balance) as totalDebt FROM suppliers WHERE balance < 0'
        );
        return results && results[0].totalDebt ? Math.abs(results[0].totalDebt) : 0;
    } catch (error) {
        console.error('Error calculating total supplier debt:', error);
        return 0;
    }
}

// Initialize tables on module load - but ONLY if database is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Don't initialize here - wait for database
    });
} else {
    // Don't auto-initialize - app.js will call initSuppliersModule() after DB is ready
}

console.log('✅ Suppliers module loaded');
