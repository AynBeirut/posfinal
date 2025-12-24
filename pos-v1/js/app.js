// ===================================
// AYN BEIRUT POS - APP INITIALIZATION
// Progressive loading - UI first, features later
// ===================================

// App startup sequence - SHOW UI IMMEDIATELY
async function startApp() {
    try {
        console.log('🚀 Starting Ayn Beirut POS...');
        updateLoadingStatus('Loading interface...');
        
        // IMMEDIATE: Show the UI without waiting for anything
        await new Promise(resolve => setTimeout(resolve, 100));
        hideLoadingScreen();
        console.log('✅ Interface shown immediately');
        
        // Show loading notification
        showProgressNotification('Initializing system...', 'info');
        
        // NOW load features progressively in the background
        setTimeout(() => loadFeaturesProgressively(), 500);
        
    } catch (error) {
        console.error('❌ Fatal error during startup:', error);
        hideLoadingScreen();
    }
}

/**
 * Load features progressively after UI is shown
 */
async function loadFeaturesProgressively() {
    try {
        // Step 1: Initialize database (wait for completion)
        showProgressNotification('Loading database...', 'info');
        let dbReady = false;
        try {
            // Check if initDatabase is available
            if (typeof window.initDatabase === 'function') {
                console.log('🔧 Starting database initialization...');
                await window.initDatabase();
                dbReady = true;
                console.log('✅ Database initialized successfully');
            } else {
                console.error('❌ initDatabase function not found on window object');
                console.log('Available functions:', Object.keys(window).filter(k => k.includes('init')));
                throw new Error('Database function not available');
            }
        } catch (e) {
            console.error('❌ Database initialization failed:', e);
            console.error('Error details:', e.message);
            console.error('Stack trace:', e.stack);
            showProgressNotification('Database error - using offline mode', 'warning');
        }
        
        // Step 2: Load products (only if DB is ready)
        if (dbReady) {
            showProgressNotification('Loading products...', 'info');
            try {
                if (typeof loadProductsFromDB === 'function') {
                    const productsPromise = loadProductsFromDB();
                    const timeout = new Promise(resolve => setTimeout(() => resolve([]), 3000));
                    const products = await Promise.race([productsPromise, timeout]);
                    
                    if (Array.isArray(products) && products.length > 0) {
                        PRODUCTS.length = 0;
                        PRODUCTS.push(...products);
                        console.log('✅ Products loaded:', PRODUCTS.length);
                        
                        // Load dynamic categories from products
                        if (typeof loadCategoriesFromProducts === 'function') {
                            loadCategoriesFromProducts();
                        }
                        
                        // Render products
                        if (typeof renderProducts === 'function') {
                            renderProducts(PRODUCTS);
                        }
                    }
                }
            } catch (e) {
                console.warn('⚠️ Products load skipped:', e.message);
            }
        }
        
        // Step 3: Initialize modules (only if DB is ready)
        if (dbReady) {
            showProgressNotification('Initializing modules...', 'info');
            setTimeout(async () => {
                try { if (typeof initPOS === 'function') initPOS(); } catch (e) { console.warn('initPOS failed:', e); }
                try { if (typeof initCategories === 'function') await initCategories(); } catch (e) { console.warn('initCategories failed:', e); }
                try { if (typeof initProductManagement === 'function') initProductManagement(); } catch (e) { console.warn('initProductManagement failed:', e); }
                try { if (typeof initInventory === 'function') initInventory(); } catch (e) { console.warn('initInventory failed:', e); }
                try { if (typeof initPayment === 'function') initPayment(); } catch (e) { console.warn('initPayment failed:', e); }
                try { if (typeof initReports === 'function') initReports(); } catch (e) { console.warn('initReports failed:', e); }
                try { if (typeof initAdminDashboard === 'function') initAdminDashboard(); } catch (e) { console.warn('initAdminDashboard failed:', e); }
            }, 200);
        }
        
        // Step 4: Show success
        setTimeout(() => {
            if (dbReady) {
                showProgressNotification(`System Ready! ${PRODUCTS.length} products loaded`, 'success');
            } else {
                showProgressNotification('Running in limited mode', 'warning');
            }
        }, 2000);
        
        console.log('✅ Progressive loading complete');
        
    } catch (error) {
        console.error('Progressive loading error:', error);
        showProgressNotification('Some features may be limited', 'warning');
    }
}

/**
 * Show progress notification
 */
function showProgressNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.progress-notification');
    if (existing) existing.remove();
    
    const colors = {
        info: 'linear-gradient(135deg, #2196F3, #1976D2)',
        success: 'linear-gradient(135deg, #4CAF50, #45a049)',
        warning: 'linear-gradient(135deg, #FF9800, #F57C00)',
        error: 'linear-gradient(135deg, #f44336, #d32f2f)'
    };
    
    const notification = document.createElement('div');
    notification.className = 'progress-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-hide info messages
    if (type === 'info') {
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    } else if (type === 'success') {
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

/**
 * Initialize the app (DEPRECATED - now using progressive loading)
 */
/**
 * Initialize the app (DEPRECATED - now using progressive loading)
 */
async function initializeApp() {
    // This function is no longer used - keeping for compatibility
    console.log('⚠️ initializeApp called but using progressive loading instead');
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
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize page navigation first
        if (window.pageNav) {
            window.pageNav.init();
        }
        startApp();
    });
} else {
    // Initialize page navigation first
    if (window.pageNav) {
        window.pageNav.init();
    }
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
        console.log('✅ Refund button found, attaching event listener');
        console.log('showRefundModal function exists?', typeof showRefundModal !== 'undefined');
        refundBtn.addEventListener('click', () => {
            console.log('🔄 Refund button clicked!');
            if (typeof showRefundModal === 'function') {
                showRefundModal();
            } else {
                console.error('❌ showRefundModal function not found!');
            }
        });
    } else {
        console.error('❌ Refund button not found!');
    }
    
    // Initialize Reports module
    if (typeof window.initReports === 'function') {
        console.log('✅ Initializing Reports module');
        window.initReports();
    } else {
        console.warn('⚠️ initReports function not available yet');
    }
    
    // Reports button handler - Opens modal and auto-loads today's data
    const reportsBtn = document.getElementById('reports-btn');
    if (reportsBtn) {
        console.log('✅ Setting up Reports button handler');
        reportsBtn.addEventListener('click', async (e) => {
            console.log('📊 Reports button clicked');
            const modal = document.getElementById('reports-modal');
            if (modal) {
                modal.classList.add('active');
                
                // Populate filter dropdowns on first open
                if (!window._reportsFiltersPopulated && typeof populateFilterDropdowns === 'function') {
                    await populateFilterDropdowns();
                    window._reportsFiltersPopulated = true;
                }
                
                // Auto-load today's data
                if (typeof loadReportsData === 'function') {
                    console.log('📊 Auto-loading today\'s sales data...');
                    loadReportsData('today');
                } else {
                    console.warn('⚠️ loadReportsData function not available');
                }
            }
        });
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
// MODAL BODY SCROLL LOCK
// ===================================

// Prevent background scroll when modal is open
const modalObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const modal = mutation.target;
            if (modal.classList.contains('modal')) {
                const isVisible = window.getComputedStyle(modal).display !== 'none';
                if (isVisible) {
                    document.body.classList.add('modal-open');
                } else {
                    // Check if any other modals are open
                    const openModals = Array.from(document.querySelectorAll('.modal')).some(
                        m => window.getComputedStyle(m).display !== 'none'
                    );
                    if (!openModals) {
                        document.body.classList.remove('modal-open');
                    }
                }
            }
        }
    });
});

// Observe all modals
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal').forEach(modal => {
        modalObserver.observe(modal, { attributes: true, attributeFilter: ['style'] });
        
        // Also handle class changes
        const classObserver = new MutationObserver(() => {
            const isVisible = modal.classList.contains('show') || modal.classList.contains('active');
            if (isVisible) {
                document.body.classList.add('modal-open');
            } else {
                const openModals = Array.from(document.querySelectorAll('.modal')).some(
                    m => m.classList.contains('show') || m.classList.contains('active')
                );
                if (!openModals) {
                    document.body.classList.remove('modal-open');
                }
            }
        });
        classObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });
});

// ===================================
// CONSOLE BRANDING
// ===================================

console.log('%c AYN BEIRUT POS ', 'background: linear-gradient(135deg, #1C75BC, #00C2FF); color: white; font-size: 20px; font-weight: bold; padding: 10px 20px; border-radius: 5px;');
console.log('%c Tech made in Beirut, deployed worldwide ', 'color: #00C2FF; font-size: 12px; font-weight: 600;');
console.log('%c Version 1.0.0 - MVP ', 'color: #C9D1D9; font-size: 10px;');
console.log('');

// ===================================
// GLOBAL ENTER KEY NAVIGATION
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Add Enter key navigation to all forms
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
            const target = e.target;
            
            // Skip if target is a textarea (allow new lines)
            if (target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Skip if target is a button or submit input
            if (target.tagName === 'BUTTON' || (target.tagName === 'INPUT' && target.type === 'submit')) {
                return;
            }
            
            // Handle inputs and selects
            if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
                e.preventDefault();
                
                // Find the form
                const form = target.closest('form');
                if (form) {
                    // Get all focusable elements in the form
                    const focusableElements = Array.from(form.querySelectorAll(
                        'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])'
                    ));
                    
                    const currentIndex = focusableElements.indexOf(target);
                    
                    if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
                        // Move to next field
                        focusableElements[currentIndex + 1].focus();
                    } else {
                        // Last field - submit form if valid
                        if (form.checkValidity()) {
                            // Find submit button and click it
                            const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
                            if (submitButton) {
                                submitButton.click();
                            } else {
                                form.requestSubmit();
                            }
                        } else {
                            // Form invalid - report validity
                            form.reportValidity();
                        }
                    }
                }
            }
        }
    }, true); // Use capture phase
    
    console.log('✅ Global Enter key navigation enabled');
});
