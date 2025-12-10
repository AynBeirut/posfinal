// ===================================
// AYN BEIRUT POS - CORE LOGIC
// Product management, cart operations, calculations
// ===================================

// Product Catalog (Will be loaded from IndexedDB)
let PRODUCTS = [
    {
        id: 1,
        name: "Laptop Pro 15",
        category: "electronics",
        price: 1299.99,
        icon: "💻",
        barcode: "7891234567890",
        stock: 50
    },
    {
        id: 2,
        name: "Wireless Mouse",
        category: "accessories",
        price: 29.99,
        icon: "🖱️",
        barcode: "7891234567891",
        stock: 50
    },
    {
        id: 3,
        name: "Mechanical Keyboard",
        category: "accessories",
        price: 89.99,
        icon: "⌨️",
        barcode: "7891234567892",
        stock: 50
    },
    {
        id: 4,
        name: "4K Monitor 27\"",
        category: "electronics",
        price: 449.99,
        icon: "🖥️",
        barcode: "7891234567893",
        stock: 50
    },
    {
        id: 5,
        name: "USB-C Hub",
        category: "accessories",
        price: 49.99,
        icon: "🔌",
        barcode: "7891234567894",
        stock: 50
    },
    {
        id: 6,
        name: "Development IDE Pro",
        category: "software",
        price: 199.99,
        icon: "💾",
        barcode: "7891234567895",
        stock: 50
    },
    {
        id: 7,
        name: "Wireless Headphones",
        category: "accessories",
        price: 159.99,
        icon: "🎧",
        barcode: "7891234567896",
        stock: 50
    },
    {
        id: 8,
        name: "Webcam HD",
        category: "electronics",
        price: 79.99,
        icon: "📹",
        barcode: "7891234567897",
        stock: 50
    },
    {
        id: 9,
        name: "Cloud Storage 1TB",
        category: "software",
        price: 99.99,
        icon: "☁️",
        barcode: "7891234567898",
        stock: 50
    },
    {
        id: 10,
        name: "External SSD 1TB",
        category: "electronics",
        price: 129.99,
        icon: "💿",
        barcode: "7891234567899",
        stock: 50
    }
];

// Cart State
let cart = [];
let currentCategory = 'all';

// Tax Rate
const TAX_RATE = 0.11; // 11%

// ===================================
// PRODUCT RENDERING
// ===================================

function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) {
        console.error('❌ Product grid element not found!');
        return;
    }
    
    console.log('🔄 Rendering', products.length, 'products');
    grid.innerHTML = '';
    
    if (products.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;"><div style="font-size: 48px; margin-bottom: 20px;">📦</div><p>No products available</p><p style="font-size: 14px; margin-top: 10px;">Click Admin Panel (⚙️) to add products</p></div>';
        return;
    }
    
    products.forEach(product => {
        const stock = product.stock || 0;
        const isOutOfStock = stock === 0;
        
        const card = document.createElement('div');
        card.className = `product-card ${isOutOfStock ? 'out-of-stock' : ''}`;
        card.innerHTML = `
            <div class="product-image">${product.icon}</div>
            <div class="product-name">${product.name}</div>
            <div class="product-category">${capitalizeFirst(product.category)}</div>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            ${stock <= 10 && stock > 0 ? `<div class="stock-warning">⚠️ Only ${stock} left</div>` : ''}
            ${isOutOfStock ? '<div class="out-of-stock-label">❌ Out of Stock</div>' : ''}
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
    // Check stock availability
    const stock = product.stock || 0;
    const existingItem = cart.find(item => item.id === product.id);
    const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
    
    if (stock === 0) {
        alert(`❌ ${product.name} is out of stock!`);
        return;
    }
    
    if (currentQuantityInCart >= stock) {
        alert(`⚠️ Only ${stock} ${product.name} available in stock!`);
        return;
    }
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    updateCart();
    saveCartToStorage();
    
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
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCart();
            saveCartToStorage();
        }
    }
}

function clearCart() {
    if (cart.length > 0) {
        if (confirm('Clear all items from cart?')) {
            cart = [];
            updateCart();
            saveCartToStorage();
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
    } else {
        cartItemsContainer.innerHTML = '';
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-header">
                    <div class="cart-item-name">${item.name}</div>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">×</button>
                </div>
                <div class="cart-item-footer">
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                    <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
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
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
}

function getCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
}

// ===================================
// SEARCH & FILTER
// ===================================

function searchProducts(query) {
    query = query.toLowerCase().trim();
    
    let filtered = PRODUCTS;
    
    // Filter by category
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
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
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
}

// ===================================
// CHECKOUT
// ===================================

function checkout() {
    if (cart.length === 0) return;
    
    const totals = getCartTotals();
    const saleData = {
        items: [...cart],
        totals: totals,
        timestamp: new Date().toISOString()
    };
    
    // Save sale to history
    saveSale(saleData);
    
    // Show receipt
    showReceipt(saleData);
    
    // Clear cart
    cart = [];
    updateCart();
    saveCartToStorage();
    
    // Clear customer display
    if (typeof clearCustomerDisplay === 'function') {
        clearCustomerDisplay();
    }
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
    
    // Setup event listeners
    document.getElementById('product-search').addEventListener('input', (e) => {
        searchProducts(e.target.value);
    });
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterByCategory(btn.dataset.category);
        });
    });
    
    document.getElementById('clear-cart').addEventListener('click', clearCart);
    document.getElementById('checkout-btn').addEventListener('click', checkout);
    
    console.log('✅ POS Core initialized');
}

// Export functions for global access
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.clearCart = clearCart;
window.checkout = checkout;
window.initPOS = initPOS;
