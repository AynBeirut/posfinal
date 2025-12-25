// ===================================
// AYN BEIRUT POS - CORE LOGIC
// Product management, cart operations, calculations
// ===================================

// Toggle cart details visibility
function toggleCartDetails() {
    const detailsEl = document.getElementById('cart-details');
    const iconEl = document.getElementById('cart-toggle-icon');
    
    if (detailsEl.style.display === 'none') {
        detailsEl.style.display = 'block';
        iconEl.textContent = '▲';
    } else {
        detailsEl.style.display = 'none';
        iconEl.textContent = '▼';
    }
}

// ===================================
// PRODUCTION DATABASE - CLEAN INSTALL
// ===================================
// ⚠️ PRODUCTION VERSION - Empty by default
// Users add their own products through Admin Panel (⚙️ button)
// This ensures each client gets a clean, professional installation
let PRODUCTS = [];

// Cart State
let cart = [];
let currentCategory = 'all';

// Tax Rate
const TAX_RATE = 0.11; // 11%

// Service Timer Update Interval
let serviceTimerInterval = null;

// ===================================
// HOURLY SERVICE TIMER MANAGEMENT
// ===================================

function startServiceTimerUpdates() {
    // Clear existing interval
    if (serviceTimerInterval) {
        clearInterval(serviceTimerInterval);
    }
    
    // Update every minute (60000ms)
    serviceTimerInterval = setInterval(() => {
        updateServiceTimers();
    }, 60000);
    
    // Also update immediately
    updateServiceTimers();
}

function stopServiceTimerUpdates() {
    if (serviceTimerInterval) {
        clearInterval(serviceTimerInterval);
        serviceTimerInterval = null;
    }
}

function updateServiceTimers() {
    let needsUpdate = false;
    
    cart.forEach(item => {
        if (item.isHourlyService && item.serviceTimers) {
            item.serviceTimers.forEach(timer => {
                const now = Date.now();
                const elapsedMs = now - timer.startTime;
                const elapsedHours = Math.ceil(elapsedMs / (1000 * 60 * 60)); // Round up to next hour
                
                // Update if hour changed
                if (elapsedHours !== timer.elapsedHours) {
                    timer.elapsedHours = elapsedHours;
                    needsUpdate = true;
                }
            });
        }
    });
    
    if (needsUpdate) {
        console.log('⏱️ Service timer updated - recalculating totals');
        updateCart();
        saveCartToStorage();
    }
}

function calculateServicePrice(item) {
    if (!item.isHourlyService || !item.serviceTimers || item.serviceTimers.length === 0) {
        return item.price;
    }
    
    let totalPrice = 0;
    
    item.serviceTimers.forEach(timer => {
        const hours = Math.max(1, timer.elapsedHours); // At least 1 hour
        
        if (hours === 1) {
            // First hour
            totalPrice += timer.firstHourRate;
        } else {
            // First hour + additional hours
            totalPrice += timer.firstHourRate;
            totalPrice += (hours - 1) * timer.additionalHourRate;
        }
    });
    
    return totalPrice;
}

function formatServiceTimer(elapsedHours) {
    if (elapsedHours === 0) {
        return '⏱️ Started';
    } else if (elapsedHours === 1) {
        return '⏱️ 1 hour';
    } else {
        return `⏱️ ${elapsedHours} hours`;
    }
}

// ===================================
// PRODUCT RENDERING
// ===================================

function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) {
        console.error('❌ Product grid element not found!');
        return;
    }
    
    // Filter out raw materials - they should only appear in inventory/purchases
    const sellableProducts = products.filter(p => p.type !== 'raw_material');
    
    console.log('🔄 Rendering', sellableProducts.length, 'products (filtered out', products.length - sellableProducts.length, 'raw materials)');
    grid.innerHTML = '';
    
    if (sellableProducts.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;"><div style="font-size: 48px; margin-bottom: 20px;">📦</div><p>No products available</p><p style="font-size: 14px; margin-top: 10px;">Click Admin Panel (⚙️) to add products</p></div>';
        return;
    }
    
    sellableProducts.forEach(product => {
        const isService = product.type === 'service';
        
        // Calculate actual stock for composed products (products with recipes)
        let stock = product.stock || 0;
        if (product.has_recipe && typeof window.calculateComposedProductStock === 'function') {
            stock = window.calculateComposedProductStock(product.id);
            console.log(`🍽️ Composed product "${product.name}" calculated stock: ${stock}`);
        }
        
        const isOutOfStock = !isService && stock === 0;
        
        const card = document.createElement('div');
        card.className = `product-card ${isOutOfStock ? 'out-of-stock' : ''}`;
        card.innerHTML = `
            <div class="product-image">${product.icon}</div>
            <div class="product-name">${product.name}</div>
            <div class="product-category">${capitalizeFirst(product.category)}</div>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            ${!isService && stock <= 10 && stock > 0 ? `<div class="stock-warning">⚠️ Only ${stock} left</div>` : ''}
            ${isOutOfStock ? '<div class="out-of-stock-label">❌ Out of Stock</div>' : ''}
            ${isService ? '<div class="service-badge">🛠️ Service</div>' : ''}
        `;
        card.onclick = () => addToCart(product);
        grid.appendChild(card);
    });
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===================================
// CART OPERATIONS
// ===================================

function addToCart(product) {
    const isService = product.type === 'service';
    
    console.log('🛒 Adding to cart:', product.name);
    console.log('  • Type:', product.type);
    console.log('  • Is Service:', isService);
    console.log('  • Stock:', product.stock);
    console.log('  • Hourly Enabled:', product.hourlyEnabled);
    console.log('  • First Hour Rate:', product.firstHourRate);
    console.log('  • Additional Hour Rate:', product.additionalHourRate);
    
    // Check existing cart item (needed for both services and items)
    const existingItem = cart.find(item => item.id === product.id);
    
    // Only check stock for physical items, not services
    if (!isService) {
        // Calculate actual stock for composed products
        let stock = product.stock || 0;
        if (product.type === 'composed' && typeof window.calculateComposedProductStock === 'function') {
            stock = window.calculateComposedProductStock(product.id);
            console.log(`  • Composed product calculated stock: ${stock}`);
        }
        
        const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
        
        if (stock === 0) {
            alert(`❌ ${product.name} is out of stock!`);
            return;
        }
        
        if (currentQuantityInCart >= stock) {
            alert(`⚠️ Only ${stock} ${product.name} available in stock!`);
            return;
        }
    }
    
    if (existingItem) {
        existingItem.quantity += 1;
        
        // If hourly service, start new timer for this instance
        if (isService && product.hourlyEnabled) {
            if (!existingItem.serviceTimers) {
                existingItem.serviceTimers = [];
            }
            existingItem.serviceTimers.push({
                instanceId: Date.now(),
                startTime: Date.now(),
                elapsedHours: 0,
                firstHourRate: product.firstHourRate || product.price,
                additionalHourRate: product.additionalHourRate || product.price
            });
        }
    } else {
        const cartItem = {
            ...product,
            quantity: 1
        };
        
        // If hourly service, initialize timer
        if (isService && product.hourlyEnabled) {
            cartItem.serviceTimers = [{
                instanceId: Date.now(),
                startTime: Date.now(),
                elapsedHours: 0,
                firstHourRate: product.firstHourRate || product.price,
                additionalHourRate: product.additionalHourRate || product.price
            }];
            cartItem.isHourlyService = true;
        }
        
        cart.push(cartItem);
    }
    
    updateCart();
    saveCartToStorage();
    
    // Start timer update if hourly service
    if (isService && product.hourlyEnabled) {
        startServiceTimerUpdates();
    }
    
    // Visual feedback
    showAddAnimation(product);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
    saveCartToStorage();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        const newQuantity = item.quantity + change;
        
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = newQuantity;
            
            // If hourly service, adjust timers array
            if (item.isHourlyService && item.serviceTimers) {
                if (change > 0) {
                    // Adding quantity - add new timers
                    for (let i = 0; i < change; i++) {
                        item.serviceTimers.push({
                            instanceId: Date.now() + i,
                            startTime: Date.now(),
                            elapsedHours: 0,
                            firstHourRate: item.firstHourRate || item.price,
                            additionalHourRate: item.additionalHourRate || item.price
                        });
                    }
                } else {
                    // Removing quantity - remove timers from the end
                    item.serviceTimers.splice(change); // negative number removes from end
                }
            }
            
            updateCart();
            saveCartToStorage();
        }
    }
}

function clearCart() {
    if (cart.length > 0) {
        if (confirm('Clear all items from cart?')) {
            cart = [];
            
            // Stop service timers
            stopServiceTimerUpdates();
            
            // Unlock discount and tax controls
            const discountInput = document.getElementById('discount-amount');
            const taxCheckbox = document.getElementById('tax-enabled');
            
            if (discountInput) {
                discountInput.value = 0;
                discountInput.disabled = false;
                discountInput.style.backgroundColor = '';
                discountInput.title = '';
            }
            
            if (taxCheckbox) {
                taxCheckbox.checked = true;
                taxCheckbox.disabled = false;
                taxCheckbox.title = '';
            }
            
            // Clear unpaid order reference
            window.currentUnpaidOrderId = null;
            
            updateCart();
            saveCartToStorage();
            
            if (typeof clearCustomerDisplay === 'function') {
                clearCustomerDisplay();
            }
            
            showNotification('Cart Cleared', 'All items removed', 'info');
        }
    }
}

// ===================================
// CART RENDERING
// ===================================

function updateCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const checkoutBtn = document.getElementById('checkout-btn');
    const placeOrderBtn = document.getElementById('place-order-btn');
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <div class="empty-icon">🛒</div>
                <p>Cart is empty</p>
                <p class="empty-subtitle">Add products to start</p>
            </div>
        `;
        checkoutBtn.disabled = true;
        if (placeOrderBtn) placeOrderBtn.disabled = true;
        
        // Stop timer updates when cart is empty
        stopServiceTimerUpdates();
    } else {
        cartItemsContainer.innerHTML = '';
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            
            // Calculate price (use timer for hourly services)
            const itemPrice = item.isHourlyService ? calculateServicePrice(item) / item.quantity : item.price;
            const totalPrice = itemPrice * item.quantity;
            
            // Timer display for hourly services
            let timerDisplay = '';
            if (item.isHourlyService && item.serviceTimers) {
                const timers = item.serviceTimers.map((timer, idx) => {
                    const hours = Math.max(1, timer.elapsedHours);
                    let priceBreakdown = '';
                    if (hours === 1) {
                        priceBreakdown = `$${timer.firstHourRate.toFixed(2)} (1st hour)`;
                    } else {
                        const addHours = hours - 1;
                        priceBreakdown = `$${timer.firstHourRate.toFixed(2)} + $${timer.additionalHourRate.toFixed(2)}×${addHours}`;
                    }
                    return `<div style="font-size: 11px; color: #666;">#${idx + 1}: ${formatServiceTimer(hours)} • ${priceBreakdown}</div>`;
                }).join('');
                timerDisplay = `<div style="margin-top: 4px;">${timers}</div>`;
            }
            
            cartItem.innerHTML = `
                <div class="cart-item-header">
                    <div class="cart-item-name">
                        ${item.name}
                        ${item.isHourlyService ? '<span style="font-size: 11px; color: #FF9800; margin-left: 4px;">⏱️ HOURLY</span>' : ''}
                    </div>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">×</button>
                </div>
                ${timerDisplay}
                <div class="cart-item-footer">
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                    <div class="cart-item-price">$${totalPrice.toFixed(2)}</div>
                </div>
            `;
            cartItemsContainer.appendChild(cartItem);
        });
        checkoutBtn.disabled = false;
        if (placeOrderBtn) placeOrderBtn.disabled = false;
    }
    
    updateTotals();
    
    // Notify customer display of cart changes
    window.dispatchEvent(new CustomEvent('cart-updated'));
}

// ===================================
// CALCULATIONS
// ===================================

function updateTotals() {
    const subtotal = cart.reduce((sum, item) => {
        const itemPrice = item.isHourlyService ? calculateServicePrice(item) : (item.price * item.quantity);
        return sum + itemPrice;
    }, 0);
    
    console.log('💰 Cart items:', cart);
    console.log('💰 Calculated subtotal:', subtotal);
    
    // Get discount percentage (0-100)
    const discountPercent = parseFloat(document.getElementById('discount-amount')?.value || 0);
    const discountAmount = subtotal * (discountPercent / 100);
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    
    // Check if tax is enabled
    const taxEnabled = document.getElementById('tax-enabled')?.checked ?? true;
    const tax = taxEnabled ? afterDiscount * TAX_RATE : 0;
    
    const total = afterDiscount + tax;
    
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
}

function getCartTotals() {
    const subtotal = cart.reduce((sum, item) => {
        const itemPrice = item.isHourlyService ? calculateServicePrice(item) : (item.price * item.quantity);
        return sum + itemPrice;
    }, 0);
    
    // Get discount percentage (0-100)
    const discountPercent = parseFloat(document.getElementById('discount-amount')?.value || 0);
    const discount = subtotal * (discountPercent / 100);
    const afterDiscount = Math.max(0, subtotal - discount);
    
    // Check if tax is enabled
    const taxEnabled = document.getElementById('tax-enabled')?.checked ?? true;
    const tax = taxEnabled ? afterDiscount * TAX_RATE : 0;
    
    const total = afterDiscount + tax;
    
    return { subtotal, tax, total, discount, discountPercent, taxEnabled };
}

// ===================================
// SEARCH & FILTER
// ===================================

function searchProducts(query) {
    query = query.toLowerCase().trim();
    
    // Filter out raw materials first
    let filtered = PRODUCTS.filter(p => p.type !== 'raw_material');
    
    // Filter by category (case-insensitive comparison)
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category.toLowerCase() === currentCategory.toLowerCase());
    }
    
    // Filter by search query
    if (query) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
        );
    }
    
    renderProducts(filtered);
}

function filterByCategory(category) {
    currentCategory = category;
    const searchQuery = document.getElementById('product-search').value;
    searchProducts(searchQuery);
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-category="${category}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// ===================================
// DYNAMIC CATEGORY LOADING
// ===================================

function loadCategoriesFromProducts() {
    // Get unique categories from products (excluding raw materials)
    const categories = [...new Set(
        PRODUCTS
            .filter(p => p.type !== 'raw_material')
            .map(p => p.category)
            .filter(c => c && c.trim())
    )].sort();
    
    console.log('📋 Categories found:', categories);
    
    // Get category filter container
    const categoryFilter = document.querySelector('.category-filter');
    if (!categoryFilter) return;
    
    // Build category buttons HTML
    let html = '<button class="category-btn active" data-category="all">All Products</button>';
    
    categories.forEach(category => {
        const displayName = category.charAt(0).toUpperCase() + category.slice(1);
        html += `<button class="category-btn" data-category="${category.toLowerCase()}">${displayName}</button>`;
    });
    
    categoryFilter.innerHTML = html;
    
    // Re-attach event listeners
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterByCategory(btn.dataset.category);
        });
    });
}

// ===================================
// CUSTOMER SELECTION MODAL
// ===================================

/**
 * Open customer selection modal
 */
function openCustomerSelectionModal() {
    if (cart.length === 0) {
        showNotification('Empty Cart', 'Add items to cart first', 'warning');
        return;
    }
    
    const modal = document.getElementById('customer-selection-modal');
    if (!modal) {
        console.error('❌ Customer selection modal not found in DOM');
        return;
    }
    
    // Clear inputs
    const nameInput = document.getElementById('pre-customer-name');
    const phoneInput = document.getElementById('pre-customer-phone');
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    
    // Open modal
    modal.classList.add('show');
    
    // Focus name input
    setTimeout(() => {
        if (nameInput) nameInput.focus();
    }, 300);
}

/**
 * Close customer selection modal
 */
function closeCustomerSelectionModal() {
    const modal = document.getElementById('customer-selection-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Export to window for payment.js to use
window.openCustomerSelectionModal = openCustomerSelectionModal;
window.closeCustomerSelectionModal = closeCustomerSelectionModal;

// ===================================
// CHECKOUT
// ===================================

function checkout() {
    if (cart.length === 0) return;
    
    // Check if shift is open
    if (!window.currentShift) {
        if (!confirm('⚠️ No cash shift is open!\n\nYou must open a cash shift before making sales.\n\nOpen Cash Drawer now?')) {
            return; // Block checkout
        }
        // Open cash drawer modal
        if (typeof showCashDrawerModal === 'function') {
            showCashDrawerModal();
        }
        return; // Block checkout
    }
    
    openCustomerSelectionModal();
}

// ===================================
// LOCAL STORAGE
// ===================================

function saveCartToStorage() {
    try {
        localStorage.setItem('ayn-pos-cart', JSON.stringify(cart));
    } catch (e) {
        console.error('Failed to save cart:', e);
    }
}

function loadCartFromStorage() {
    try {
        const saved = localStorage.getItem('ayn-pos-cart');
        if (saved) {
            cart = JSON.parse(saved);
            updateCart();
        }
    } catch (e) {
        console.error('Failed to load cart:', e);
        cart = [];
    }
}

// ===================================
// VISUAL FEEDBACK
// ===================================

function showAddAnimation(product) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 440px;
        background: linear-gradient(135deg, #1C75BC, #00C2FF);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 194, 255, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = `${product.icon} Added to cart`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ===================================
// INITIALIZATION
// ===================================

function initPOS() {
    // Load cart from storage
    loadCartFromStorage();
    
    // Render initial products
    console.log('🎨 InitPOS - Rendering products, count:', PRODUCTS.length);
    renderProducts(PRODUCTS);
    
    // Load dynamic categories
    if (PRODUCTS.length > 0) {
        loadCategoriesFromProducts();
    }
    
    // Setup event listeners
    document.getElementById('product-search').addEventListener('input', (e) => {
        searchProducts(e.target.value);
    });
    
    // Note: Category button event listeners are set up in loadCategoriesFromProducts()
    // since categories are now dynamically generated
    
    document.getElementById('clear-cart').addEventListener('click', clearCart);
    document.getElementById('checkout-btn').addEventListener('click', checkout);
    
    // Add event listeners for discount and tax updates
    const discountInput = document.getElementById('discount-amount');
    const taxCheckbox = document.getElementById('tax-enabled');
    
    if (discountInput) {
        discountInput.addEventListener('input', updateTotals);
    }
    
    if (taxCheckbox) {
        taxCheckbox.addEventListener('change', updateTotals);
    }
    
    console.log('✅ POS Core initialized');
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} - The escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Shows a notification message to the user
 * @param {string} message - The message to display
 * @param {string} type - The notification type: 'success', 'error', or 'info'
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    
    const backgroundColor = type === 'error' ? '#f44336' : 
                           type === 'success' ? '#4caf50' : 
                           '#2196f3';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${backgroundColor};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyle);

// Export functions for global access
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.clearCart = clearCart;
window.checkout = checkout;
window.initPOS = initPOS;
window.escapeHtml = escapeHtml;
window.showNotification = showNotification;
// ===================================
// MENU DROPDOWN FUNCTIONALITY
// ===================================

// Initialize menu dropdown - SINGLETON PATTERN (prevents duplicate listeners)
if (!window._menuDropdownInitialized) {
    window._menuDropdownInitialized = true;
    
    document.addEventListener('DOMContentLoaded', () => {
        // Use DropdownManager singleton if available
        if (window.dropdownManager) {
            window.dropdownManager.init();
            
            const menuToggleBtn = document.getElementById('menu-toggle-btn');
            const menuDropdown = document.getElementById('menu-dropdown');
            const statusToggleBtn = document.getElementById('status-toggle-btn');
            const statusDropdown = document.getElementById('status-dropdown');
            const customerDisplayMenuBtn = document.getElementById('customer-display-menu-btn');
            
            // Register dropdowns with manager
            if (menuToggleBtn && menuDropdown) {
                window.dropdownManager.register(menuToggleBtn, menuDropdown, {
                    closeOnItemClick: true,
                    itemSelector: '.menu-dropdown-item, .submenu-item'
                });
            }
            
            if (statusToggleBtn && statusDropdown) {
                window.dropdownManager.register(statusToggleBtn, statusDropdown);
            }
            
            // Handle customer display button
            if (customerDisplayMenuBtn) {
                customerDisplayMenuBtn.addEventListener('click', () => {
                    window.dropdownManager.closeAll();
                    openDisplaySettingsModal();
                });
            }
            
            // Update badge count
            function updateMenuBadge() {
                const menuBadge = document.getElementById('menu-total-badge');
                const unpaidBadge = document.getElementById('unpaid-orders-badge');
                const billsBadge = document.getElementById('bills-badge');
                const debtBadge = document.getElementById('purchases-debt-badge');
                
                let totalCount = 0;
                
                if (unpaidBadge && unpaidBadge.textContent) {
                    const count = parseInt(unpaidBadge.textContent);
                    if (!isNaN(count)) totalCount += count;
                }
                
                if (billsBadge && billsBadge.textContent) {
                    const count = parseInt(billsBadge.textContent);
                    if (!isNaN(count)) totalCount += count;
                }
                
                if (debtBadge && debtBadge.textContent) {
                    const count = parseInt(debtBadge.textContent);
                    if (!isNaN(count)) totalCount += count;
                }
                
                if (menuBadge) {
                    if (totalCount > 0) {
                        menuBadge.textContent = totalCount;
                        menuBadge.style.display = 'inline';
                    } else {
                        menuBadge.style.display = 'none';
                    }
                }
            }
            
            updateMenuBadge();
            const badgeInterval = setInterval(updateMenuBadge, 2000);
            window.dropdownManager.registerInterval(badgeInterval);
            
        } else {
            console.error('❌ DropdownManager not loaded - dropdowns may accumulate listeners');
        }
    });
}