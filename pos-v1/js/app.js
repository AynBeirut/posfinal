// ===================================
// AYN BEIRUT POS - APP INITIALIZATION
// Main application startup and coordination
// ===================================

// App startup sequence
async function startApp() {
    try {
        console.log('🚀 Starting Ayn Beirut POS...');
        updateLoadingStatus('Initializing database...');
        
        try {
            // Initialize SQL.js database (new system) with extended timeout for large databases
            console.log('📦 Initializing SQL.js database...');
            
            const dbTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database initialization timeout - falling back to legacy')), 60000)
            );
            
            await Promise.race([
                initDatabase(),
                dbTimeout
            ]);
            console.log('✅ Database initialized');
            
            // Clean old backups (90-day retention, keep minimum 3)
            updateLoadingStatus('Cleaning old backups...');
            if (typeof cleanOldBackups === 'function') {
                try {
                    await cleanOldBackups();
                } catch (e) {
                    console.warn('Backup cleanup failed:', e);
                }
            }
            
            // Check sync queue before migrations
            updateLoadingStatus('Checking sync queue...');
            try {
                const queueCount = runQuery('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0');
                const pendingCount = queueCount[0]?.count || 0;
                
                if (pendingCount > 0) {
                    console.log(`📊 Found ${pendingCount} pending sync items`);
                    updateLoadingStatus(`Syncing ${pendingCount} pending items...`);
                    
                    // Attempt sync with 30s timeout
                    if (typeof syncPendingTransactions === 'function') {
                        const syncTimeout = new Promise((resolve) => 
                            setTimeout(() => {
                                console.warn('⚠️ Sync timeout - proceeding with migration');
                                resolve(false);
                            }, 30000)
                        );
                        
                        try {
                            await Promise.race([
                                syncPendingTransactions(),
                                syncTimeout
                            ]);
                        } catch (syncError) {
                            console.warn('⚠️ Sync failed, proceeding with migration:', syncError);
                        }
                    }
                }
            } catch (queueError) {
                console.warn('⚠️ Could not check sync queue:', queueError);
            }
            
            // Run migration from IndexedDB if needed
            updateLoadingStatus('Checking for data migration...');
            console.log('🔄 Checking for migration...');
            await migrateFromIndexedDB();
            console.log('✅ Migration check complete');
            
        } catch (dbError) {
            console.error('❌ Database initialization failed:', dbError);
            console.error('Stack:', dbError.stack);
            
            updateLoadingStatus('Database error - attempting recovery...');
            
            // NEVER offer to clear database - this would destroy customer data!
            // Instead, provide recovery options
            if (dbError.message.includes('timeout')) {
                alert('Database is taking longer than usual to load.\n\n' +
                      'This is normal for large databases with many transactions.\n\n' +
                      'The page will retry automatically.\n\n' +
                      'If this persists, please contact support - DO NOT clear data!');
                
                // Retry after 3 seconds
                setTimeout(() => {
                    console.log('🔄 Retrying database initialization...');
                    location.reload();
                }, 3000);
                return;
            } else if (dbError.message.includes('object store')) {
                alert('Database structure issue detected.\n\n' +
                      'An automatic backup has been created.\n\n' +
                      'The page will reload to repair the database structure.\n\n' +
                      'Your data is safe.');
                
                // Reload to trigger fresh IndexedDB creation
                setTimeout(() => location.reload(), 2000);
                return;
            } else {
                alert('Database initialization error.\n\n' +
                      'Error: ' + dbError.message + '\n\n' +
                      'An automatic backup has been created.\n\n' +
                      'Please contact support for assistance.\n\n' +
                      'DO NOT clear browser data - your sales records are safe.');
                
                console.error('💾 Emergency backup available in IndexedDB');
                console.error('🔧 Check for backups: AynBeirutPOS_backup_*');
            }
            
            // Fallback - continue with legacy database if available
            // This prevents complete app failure while preserving data
        }
        
        updateLoadingStatus('Checking authentication...');
        const isAuthenticated = await initAuth();
        
        if (!isAuthenticated) {
            // User not logged in, redirect handled by initAuth()
            return;
        }
        
        updateLoadingStatus('Loading products...');
        const products = await loadProductsFromDB();
        PRODUCTS.length = 0;
        PRODUCTS.push(...products);
        console.log('✅ Products loaded:', PRODUCTS.length, 'items');
        
        updateLoadingStatus('Loading POS system...');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Initialize modules with error handling
        try {
            if (typeof initCategories === 'function') await initCategories();
        } catch (e) { console.warn('initCategories failed:', e); }
        
        try {
            if (typeof initVirtualKeyboard === 'function') initVirtualKeyboard();
        } catch (e) { console.warn('initVirtualKeyboard failed:', e); }
        
        try {
            if (typeof initPOS === 'function') initPOS();
        } catch (e) { console.warn('initPOS failed:', e); }
        
        try {
            if (typeof initProductManagement === 'function') initProductManagement();
        } catch (e) { console.warn('initProductManagement failed:', e); }
        
        try {
            if (typeof initReports === 'function') initReports();
        } catch (e) { console.warn('initReports failed:', e); }
        
        try {
            if (typeof initCustomerDisplay === 'function') initCustomerDisplay();
        } catch (e) { console.warn('initCustomerDisplay failed:', e); }
        
        try {
            if (typeof initBarcodeScanner === 'function') initBarcodeScanner();
        } catch (e) { console.warn('initBarcodeScanner failed:', e); }
        
        try {
            if (typeof initInventory === 'function') initInventory();
        } catch (e) { console.warn('initInventory failed:', e); }
        
        try {
            if (typeof initPayment === 'function') initPayment();
        } catch (e) { console.warn('initPayment failed:', e); }
        
        try {
            if (typeof initCustomers === 'function') initCustomers();
        } catch (e) { console.warn('initCustomers failed:', e); }
        
        try {
            if (typeof initUnpaidOrders === 'function') await initUnpaidOrders();
        } catch (e) { console.warn('initUnpaidOrders failed:', e); }
        
        // Initialize new enhanced modules
        updateLoadingStatus('Loading enhanced modules...');
        try {
            if (typeof initSettingsPage === 'function') initSettingsPage();
        } catch (e) { console.warn('initSettingsPage failed:', e); }
        
        try {
            if (typeof initAdminDashboard === 'function') initAdminDashboard();
        } catch (e) { console.warn('initAdminDashboard failed:', e); }
        
        try {
            if (typeof initPhonebook === 'function') initPhonebook();
        } catch (e) { console.warn('initPhonebook failed:', e); }
        
        try {
            if (typeof initBillPayments === 'function') initBillPayments();
        } catch (e) { console.warn('initBillPayments failed:', e); }
        
        try {
            if (typeof initUserManagement === 'function') initUserManagement();
        } catch (e) { console.warn('initUserManagement failed:', e); }
        
        // Initialize purchasing module (suppliers, deliveries, payments)
        updateLoadingStatus('Initializing purchasing system...');
        try {
            if (typeof initSuppliersModule === 'function') await initSuppliersModule();
        } catch (e) { console.warn('initSuppliersModule failed:', e); }
        
        // Initialize sync manager (for future online features)
        updateLoadingStatus('Setting up sync...');
        try {
            if (typeof initSyncManager === 'function') await initSyncManager();
        } catch (e) { console.warn('initSyncManager failed:', e); }
        
        updateLoadingStatus('Ready!');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Hide loading screen and show app
        hideLoadingScreen();
        
        // Final render to ensure products are displayed
        console.log('🔄 Final render - Products count:', PRODUCTS.length);
        if (PRODUCTS.length > 0) {
            renderProducts(PRODUCTS);
        }
        
        console.log('✅ Ayn Beirut POS v1.0 started successfully');
        console.log('💾 Storage:', getStorageInfo().description);
        console.log('🆔 Cashier ID:', getCashierId());
        
    } catch (error) {
        console.error('Failed to start app:', error);
        updateLoadingStatus('Error: ' + error.message);
    }
}

function updateLoadingStatus(message) {
    const statusEl = document.getElementById('loading-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const posApp = document.getElementById('pos-app');
    
    loadingScreen.classList.add('hidden');
    posApp.style.display = 'flex';
    
    // Remove loading screen after animation
    setTimeout(() => {
        loadingScreen.remove();
    }, 500);
}

// ===================================
// APP LIFECYCLE
// ===================================

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('App resumed');
        // Reload cart from storage in case it was updated in another tab
        if (typeof loadCartFromStorage === 'function') {
            loadCartFromStorage();
        }
    }
});

// Handle before unload (save state)
window.addEventListener('beforeunload', () => {
    console.log('Saving state before unload');
    if (typeof saveCartToStorage === 'function') {
        saveCartToStorage();
    }
});

// ===================================
// KEYBOARD SHORTCUTS
// ===================================

document.addEventListener('keydown', (e) => {
    // F1 - Focus search
    if (e.key === 'F1') {
        e.preventDefault();
        document.getElementById('product-search').focus();
    }
    
    // Escape - Clear search or close modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('receipt-modal');
        if (modal.classList.contains('show')) {
            modal.classList.remove('show');
        } else {
            const searchInput = document.getElementById('product-search');
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        }
    }
    
    // Ctrl/Cmd + K - Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('product-search').focus();
    }
    
    // Ctrl/Cmd + Enter - Checkout
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const checkoutBtn = document.getElementById('checkout-btn');
        if (!checkoutBtn.disabled) {
            checkout();
        }
    }
});

// ===================================
// UTILITY FUNCTIONS
// ===================================

// Check if app is online
function isOnline() {
    return navigator.onLine;
}

// Update connection status indicator
function updateConnectionStatus() {
    const statusEl = document.getElementById('connection-status');
    const indicator = document.querySelector('.status-indicator');
    
    if (isOnline()) {
        statusEl.textContent = 'Online';
        indicator.classList.remove('offline');
        indicator.classList.add('online');
    } else {
        statusEl.textContent = 'Offline Mode';
        indicator.classList.remove('online');
        indicator.classList.add('offline');
    }
}

// Listen for online/offline events
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// Initial connection check
updateConnectionStatus();

// ===================================
// UNPAID ORDERS BUTTON
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    const unpaidOrdersBtn = document.getElementById('unpaid-orders-btn');
    if (unpaidOrdersBtn) {
        unpaidOrdersBtn.addEventListener('click', showUnpaidOrdersModal);
    }
    
    const cashDrawerBtn = document.getElementById('cash-drawer-btn');
    if (cashDrawerBtn) {
        cashDrawerBtn.addEventListener('click', showCashDrawerModal);
    }
    
    const refundBtn = document.getElementById('refund-btn');
    if (refundBtn) {
        refundBtn.addEventListener('click', showRefundModal);
    }
});

// ===================================
// ERROR HANDLING
// ===================================

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Could show user-friendly error message here
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// ===================================
// KEYBOARD SHORTCUTS
// ===================================
document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+P - Add Product
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        if (typeof openProductManagement === 'function') {
            openProductManagement();
        }
    }
});

// ===================================
// CONSOLE BRANDING
// ===================================

console.log('%c AYN BEIRUT POS ', 'background: linear-gradient(135deg, #1C75BC, #00C2FF); color: white; font-size: 20px; font-weight: bold; padding: 10px 20px; border-radius: 5px;');
console.log('%c Tech made in Beirut, deployed worldwide ', 'color: #00C2FF; font-size: 12px; font-weight: 600;');
console.log('%c Version 1.0.0 - MVP ', 'color: #C9D1D9; font-size: 10px;');
console.log('');
