// ===================================
// AYN BEIRUT POS - APP INITIALIZATION
// Main application startup and coordination
// ===================================

// App startup sequence
async function startApp() {
    try {
        updateLoadingStatus('Initializing database...');
        await initDatabase();
        
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
        
        updateLoadingStatus('Loading POS system...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Initialize virtual keyboard
        initVirtualKeyboard();
        
        // Initialize POS core
        initPOS();
        
        // Initialize product management
        initProductManagement();
        
        // Initialize reports
        initReports();
        
        // Initialize customer display
        initCustomerDisplay();
        
        // Initialize barcode scanner
        initBarcodeScanner();
        
        // Initialize inventory tracking
        initInventory();
        
        // Initialize payment module
        initPayment();
        
        updateLoadingStatus('Ready!');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Hide loading screen and show app
        hideLoadingScreen();
        
        console.log('✅ Ayn Beirut POS v1.0 started successfully');
        
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
// CONSOLE BRANDING
// ===================================

console.log('%c AYN BEIRUT POS ', 'background: linear-gradient(135deg, #1C75BC, #00C2FF); color: white; font-size: 20px; font-weight: bold; padding: 10px 20px; border-radius: 5px;');
console.log('%c Tech made in Beirut, deployed worldwide ', 'color: #00C2FF; font-size: 12px; font-weight: 600;');
console.log('%c Version 1.0.0 - MVP ', 'color: #C9D1D9; font-size: 10px;');
console.log('');
