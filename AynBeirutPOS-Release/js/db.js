// ===================================
// AYN BEIRUT POS - INDEXEDDB
// Offline data persistence
// ===================================

let db = null;
const DB_NAME = 'AynBeirutPOS';
const DB_VERSION = 5; // Updated to add categories store

// ===================================
// DATABASE INITIALIZATION
// ===================================

function initDatabase() {
    return new Promise((resolve, reject) => {
        console.log('🔧 Opening database:', DB_NAME, 'version', DB_VERSION);
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('❌ Database failed to open:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('✅ IndexedDB initialized successfully');
            console.log('📊 Object stores:', Array.from(db.objectStoreNames));
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            console.log('🔄 Database upgrade needed from version', event.oldVersion, 'to', event.newVersion);
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
            
            // Create customers store
            if (!db.objectStoreNames.contains('customers')) {
                console.log('📝 Creating customers store...');
                const customersStore = db.createObjectStore('customers', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                customersStore.createIndex('phone', 'phone', { unique: false }); // Changed to false to avoid conflicts
                customersStore.createIndex('name', 'name', { unique: false });
                customersStore.createIndex('lastPurchase', 'lastPurchase', { unique: false });
                console.log('✅ Customers store created');
            }
            
            // Create categories store
            if (!db.objectStoreNames.contains('categories')) {
                console.log('📝 Creating categories store...');
                const categoriesStore = db.createObjectStore('categories', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                categoriesStore.createIndex('name', 'name', { unique: true });
                console.log('✅ Categories store created');
                
                // Add default categories
                const transaction = event.target.transaction;
                const store = transaction.objectStore('categories');
                const defaultCategories = [
                    { name: 'electronics', displayName: 'Electronics', icon: '💻' },
                    { name: 'accessories', displayName: 'Accessories', icon: '🎧' },
                    { name: 'software', displayName: 'Software', icon: '📀' },
                    { name: 'other', displayName: 'Other', icon: '📦' }
                ];
                defaultCategories.forEach(cat => store.add(cat));
            }
            
            console.log('✅ Database schema created/updated');
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
// CUSTOMER OPERATIONS
// ===================================

function saveCustomer(customerData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction(['customers'], 'readwrite');
        const store = transaction.objectStore('customers');
        const request = store.add(customerData);
        
        request.onsuccess = () => {
            console.log('✅ Customer saved');
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

function updateCustomer(customerId, customerData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction(['customers'], 'readwrite');
        const store = transaction.objectStore('customers');
        const request = store.put({ ...customerData, id: customerId });
        
        request.onsuccess = () => {
            console.log('✅ Customer updated');
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

function getAllCustomers() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction(['customers'], 'readonly');
        const store = transaction.objectStore('customers');
        const request = store.getAll();
        
        request.onsuccess = () => {
            resolve(request.result || []);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

function getCustomerByPhone(phone) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction(['customers'], 'readonly');
        const store = transaction.objectStore('customers');
        const index = store.index('phone');
        const request = index.get(phone);
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

// ===================================
// CATEGORY OPERATIONS
// ===================================

function getAllCategories() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.getAll();
        
        request.onsuccess = () => {
            resolve(request.result || []);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

function saveCategory(categoryData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        const request = store.add(categoryData);
        
        request.onsuccess = () => {
            console.log('✅ Category saved');
            resolve(request.result);
        };
        
        request.onerror = () => {
            console.error('Failed to save category');
            reject(request.error);
        };
    });
}

function updateCategory(id, categoryData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        const request = store.put({ ...categoryData, id });
        
        request.onsuccess = () => {
            console.log('✅ Category updated');
            resolve(request.result);
        };
        
        request.onerror = () => {
            console.error('Failed to update category');
            reject(request.error);
        };
    });
}

function deleteCategory(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        const request = store.delete(id);
        
        request.onsuccess = () => {
            console.log('✅ Category deleted');
            resolve();
        };
        
        request.onerror = () => {
            console.error('Failed to delete category');
            reject(request.error);
        };
    });
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
window.saveCustomer = saveCustomer;
window.updateCustomer = updateCustomer;
window.getAllCustomers = getAllCustomers;
window.getCustomerByPhone = getCustomerByPhone;
window.getAllCategories = getAllCategories;
window.saveCategory = saveCategory;
window.updateCategory = updateCategory;
window.deleteCategory = deleteCategory;
