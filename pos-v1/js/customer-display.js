/**
 * Customer Display Module
 * Opens and syncs a customer-facing display window
 */

let customerDisplayWindow = null;

/**
 * Initialize customer display functionality
 */
function initCustomerDisplay() {
    const displayBtn = document.getElementById('customer-display-btn');
    const themeDropdown = document.getElementById('theme-dropdown');
    const openDisplayBtn = document.getElementById('open-customer-display');
    
    // Toggle dropdown on button click
    displayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.customer-display-container')) {
            themeDropdown.classList.remove('show');
        }
    });
    
    // Open customer display from dropdown
    openDisplayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openCustomerDisplay();
        themeDropdown.classList.remove('show');
    });
    
    // Sync cart changes to customer display
    window.addEventListener('cart-updated', syncCartToDisplay);
    
    // Check if display window is still open periodically
    setInterval(checkDisplayWindow, 3000);
}

/**
 * Open the customer display in a new window
 */
function openCustomerDisplay() {
    const displayUrl = 'customer-display.html';
    const windowFeatures = 'width=800,height=600,left=100,top=100,resizable=yes,scrollbars=no';
    
    // Check if window is already open
    if (customerDisplayWindow && !customerDisplayWindow.closed) {
        customerDisplayWindow.focus();
        return;
    }
    
    // Open new window
    customerDisplayWindow = window.open(displayUrl, 'CustomerDisplay', windowFeatures);
    
    if (customerDisplayWindow) {
        // Initial sync
        setTimeout(() => syncCartToDisplay(), 500);
        
        showNotification('Customer display opened successfully!');
    } else {
        showNotification('Failed to open customer display. Please allow popups.', 'error');
    }
}

/**
 * Sync current cart to customer display
 */
function syncCartToDisplay() {
    const cartData = getCurrentCart();
    
    // Store in localStorage for the customer display to read
    localStorage.setItem('customer-display-cart', JSON.stringify(cartData));
    
    // If window is open, also send via postMessage
    if (customerDisplayWindow && !customerDisplayWindow.closed) {
        try {
            customerDisplayWindow.postMessage({
                type: 'cart-update',
                cart: cartData
            }, '*');
        } catch (error) {
            console.error('Failed to sync to customer display:', error);
        }
    }
}

/**
 * Get current cart data for display
 */
function getCurrentCart() {
    return cart.map(item => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        price: item.price,
        quantity: item.quantity,
        category: item.category
    }));
}

/**
 * Check if display window is still open
 */
function checkDisplayWindow() {
    if (customerDisplayWindow && customerDisplayWindow.closed) {
        customerDisplayWindow = null;
    }
}

/**
 * Clear customer display (on checkout)
 */
function clearCustomerDisplay() {
    localStorage.setItem('customer-display-cart', JSON.stringify([]));
    
    if (customerDisplayWindow && !customerDisplayWindow.closed) {
        customerDisplayWindow.postMessage({
            type: 'cart-update',
            cart: []
        }, '*');
    }
}
