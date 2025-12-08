// ===================================
// AYN BEIRUT POS - INDEXEDDB
// Offline data persistence
// ===================================

let db = null;
const DB_NAME = 'AynBeirutPOS';
const DB_VERSION = 3; // Updated to add stock_history store

// ===================================
// DATABASE INITIALIZATION
// ===================================

function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('Database failed to open');
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('✅ IndexedDB initialized');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            
            // Create sales history store
            if (!db.objectStoreNames.contains('sales')) {
                const salesStore = db.createObjectStore('sales', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                salesStore.createIndex('timestamp', 'timestamp', { unique: false });
                salesStore.createIndex('date', 'date', { unique: false });
            }
            
            // Create products store (for future use)
            if (!db.objectStoreNames.contains('products')) {
                const productsStore = db.createObjectStore('products', { 
                    keyPath: 'id' 
                });
                productsStore.createIndex('category', 'category', { unique: false });
                productsStore.createIndex('name', 'name', { unique: false });
            }
            
            // Create users store
            if (!db.objectStoreNames.contains('users')) {
                const usersStore = db.createObjectStore('users', { 
                    keyPath: 'id' 
                });
                usersStore.createIndex('username', 'username', { unique: true });
                usersStore.createIndex('role', 'role', { unique: false });
            }
            
            // Create activity logs store
            if (!db.objectStoreNames.contains('activity')) {
                const activityStore = db.createObjectStore('activity', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                activityStore.createIndex('userId', 'userId', { unique: false });
                activityStore.createIndex('action', 'action', { unique: false });
                activityStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            
            // Create stock history store
            if (!db.objectStoreNames.contains('stock_history')) {
                const stockHistoryStore = db.createObjectStore('stock_history', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                stockHistoryStore.createIndex('productId', 'productId', { unique: false });
                stockHistoryStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            
            console.log('✅ Database schema created');
        };
    });
}

// ===================================
// SALES OPERATIONS
// ===================================

function saveSale(saleData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        // Add date for easy querying
        const sale = {
            ...saleData,
            date: new Date(saleData.timestamp).toISOString().split('T')[0]
        };
        
        const transaction = db.transaction(['sales'], 'readwrite');
        const store = transaction.objectStore('sales');
        const request = store.add(sale);
        
        request.onsuccess = () => {
            console.log('✅ Sale saved to database');
            resolve(request.result);
        };
        
        request.onerror = () => {
            console.error('Failed to save sale');
            reject(request.error);
        };
    });
}

function getAllSales() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction(['sales'], 'readonly');
        const store = transaction.objectStore('sales');
        const request = store.getAll();
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

function getSalesByDate(date) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction(['sales'], 'readonly');
        const store = transaction.objectStore('sales');
        const index = store.index('date');
        const request = index.getAll(date);
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

function getTodaySales() {
    const today = new Date().toISOString().split('T')[0];
    return getSalesByDate(today);
}

function clearAllSales() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction(['sales'], 'readwrite');
        const store = transaction.objectStore('sales');
        const request = store.clear();
        
        request.onsuccess = () => {
            console.log('✅ All sales cleared');
            resolve();
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

// ===================================
// STATISTICS
// ===================================

async function getDailyStats() {
    try {
        const sales = await getTodaySales();
        
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.totals.total, 0);
        const totalItems = sales.reduce((sum, sale) => {
            return sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
        }, 0);
        
        return {
            totalSales,
            totalRevenue,
            totalItems,
            averageSale: totalSales > 0 ? totalRevenue / totalSales : 0
        };
    } catch (error) {
        console.error('Failed to get daily stats:', error);
        return {
            totalSales: 0,
            totalRevenue: 0,
            totalItems: 0,
            averageSale: 0
        };
    }
}

// ===================================
// EXPORT FUNCTIONS
// ===================================

window.initDatabase = initDatabase;
window.saveSale = saveSale;
window.getAllSales = getAllSales;
window.getSalesByDate = getSalesByDate;
window.getTodaySales = getTodaySales;
window.clearAllSales = clearAllSales;
window.getDailyStats = getDailyStats;
