/**
 * Inventory Tracking Module
 * Manages stock levels, auto-deduction, low stock alerts, and inventory reports
 */

let inventoryLowStockThreshold = 10; // Default low stock warning threshold

/**
 * Initialize inventory tracking
 */
function initInventory() {
    console.log('Initializing inventory tracking...');
    
    // Add inventory button to header
    addInventoryButton();
    
    // Check for low stock on startup
    checkLowStock();
    
    console.log('✅ Inventory tracking initialized');
}

/**
 * Add inventory button to header
 */
function addInventoryButton() {
    const headerRight = document.querySelector('.header-right');
    if (!headerRight) return;
    
    const reportsBtn = document.getElementById('reports-btn');
    if (!reportsBtn) return;
    
    const inventoryBtn = document.createElement('button');
    inventoryBtn.id = 'inventory-btn';
    inventoryBtn.className = 'btn-inventory';
    inventoryBtn.title = 'Inventory Management';
    inventoryBtn.innerHTML = '📦';
    inventoryBtn.addEventListener('click', openInventoryModal);
    
    // Insert after reports button
    reportsBtn.insertAdjacentElement('afterend', inventoryBtn);
}

/**
 * Open inventory management modal
 */
function openInventoryModal() {
    const modal = document.getElementById('inventory-modal');
    if (!modal) return;
    
    loadInventoryData();
    modal.classList.add('show');
}

/**
 * Close inventory modal
 */
function closeInventoryModal() {
    const modal = document.getElementById('inventory-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Load and display inventory data
 */
async function loadInventoryData() {
    const products = await loadProductsFromDB();
    
    // Calculate inventory stats
    const stats = calculateInventoryStats(products);
    updateInventoryStats(stats);
    
    // Render inventory table
    renderInventoryTable(products);
    
    // Render low stock alerts
    renderLowStockAlerts(products);
}

/**
 * Calculate inventory statistics
 */
function calculateInventoryStats(products) {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const lowStockItems = products.filter(p => (p.stock || 0) <= inventoryLowStockThreshold).length;
    const outOfStockItems = products.filter(p => (p.stock || 0) === 0).length;
    const totalValue = products.reduce((sum, p) => sum + ((p.stock || 0) * p.price), 0);
    
    return {
        totalProducts,
        totalStock,
        lowStockItems,
        outOfStockItems,
        totalValue
    };
}

/**
 * Update inventory statistics display
 */
function updateInventoryStats(stats) {
    document.getElementById('total-products-stat').textContent = stats.totalProducts;
    document.getElementById('total-stock-stat').textContent = stats.totalStock;
    document.getElementById('low-stock-stat').textContent = stats.lowStockItems;
    document.getElementById('out-of-stock-stat').textContent = stats.outOfStockItems;
    document.getElementById('inventory-value-stat').textContent = `$${stats.totalValue.toFixed(2)}`;
}

/**
 * Render inventory table
 */
function renderInventoryTable(products) {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    products.forEach(product => {
        const stock = product.stock || 0;
        const stockStatus = getStockStatus(stock);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.icon} ${product.name}</td>
            <td>${product.category}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td>
                <span class="stock-badge stock-${stockStatus.class}">
                    ${stock} ${stockStatus.icon}
                </span>
            </td>
            <td>$${(stock * product.price).toFixed(2)}</td>
            <td>
                <div class="inventory-actions">
                    <button class="btn-adjust" onclick="adjustStock(${product.id}, 'add')" title="Add Stock">
                        ➕
                    </button>
                    <button class="btn-adjust" onclick="adjustStock(${product.id}, 'remove')" title="Remove Stock">
                        ➖
                    </button>
                    <button class="btn-adjust" onclick="setStock(${product.id})" title="Set Stock">
                        ✏️
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

/**
 * Get stock status
 */
function getStockStatus(stock) {
    if (stock === 0) {
        return { class: 'out', icon: '❌', label: 'Out of Stock' };
    } else if (stock <= inventoryLowStockThreshold) {
        return { class: 'low', icon: '⚠️', label: 'Low Stock' };
    } else {
        return { class: 'good', icon: '✅', label: 'In Stock' };
    }
}

/**
 * Render low stock alerts
 */
function renderLowStockAlerts(products) {
    const alertsContainer = document.getElementById('low-stock-alerts');
    if (!alertsContainer) return;
    
    const lowStockProducts = products.filter(p => (p.stock || 0) <= inventoryLowStockThreshold && (p.stock || 0) > 0);
    const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);
    
    if (lowStockProducts.length === 0 && outOfStockProducts.length === 0) {
        alertsContainer.innerHTML = '<div class="no-alerts">✅ All products have sufficient stock</div>';
        return;
    }
    
    let html = '';
    
    if (outOfStockProducts.length > 0) {
        html += '<div class="alert-section out-of-stock-section">';
        html += '<h4>❌ Out of Stock</h4>';
        outOfStockProducts.forEach(p => {
            html += `<div class="alert-item out">${p.icon} ${p.name} - <strong>0 units</strong></div>`;
        });
        html += '</div>';
    }
    
    if (lowStockProducts.length > 0) {
        html += '<div class="alert-section low-stock-section">';
        html += '<h4>⚠️ Low Stock</h4>';
        lowStockProducts.forEach(p => {
            html += `<div class="alert-item low">${p.icon} ${p.name} - <strong>${p.stock} units</strong></div>`;
        });
        html += '</div>';
    }
    
    alertsContainer.innerHTML = html;
}

/**
 * Adjust stock (add or remove)
 */
async function adjustStock(productId, action) {
    const amount = prompt(`Enter amount to ${action === 'add' ? 'add to' : 'remove from'} stock:`, '10');
    
    if (!amount || isNaN(amount) || parseInt(amount) <= 0) {
        return;
    }
    
    const quantity = parseInt(amount);
    const products = await loadProductsFromDB();
    const product = products.find(p => p.id === productId);
    
    if (!product) return;
    
    const currentStock = product.stock || 0;
    let newStock;
    
    if (action === 'add') {
        newStock = currentStock + quantity;
    } else {
        newStock = Math.max(0, currentStock - quantity);
    }
    
    await updateProductStock(productId, newStock, `Manual ${action}: ${quantity} units`);
    
    showInventoryNotification(`✅ Stock ${action === 'add' ? 'added' : 'removed'}: ${product.name}`);
    loadInventoryData();
}

/**
 * Set stock to specific value
 */
async function setStock(productId) {
    const products = await loadProductsFromDB();
    const product = products.find(p => p.id === productId);
    
    if (!product) return;
    
    const currentStock = product.stock || 0;
    const newStock = prompt(`Set stock quantity for ${product.name}:`, currentStock.toString());
    
    if (newStock === null || isNaN(newStock) || parseInt(newStock) < 0) {
        return;
    }
    
    const quantity = parseInt(newStock);
    await updateProductStock(productId, quantity, `Stock set to ${quantity}`);
    
    showInventoryNotification(`✅ Stock updated: ${product.name} = ${quantity} units`);
    loadInventoryData();
}

/**
 * Update product stock in database
 */
async function updateProductStock(productId, newStock, reason = '') {
    if (!db) return;
    
    return new Promise(async (resolve, reject) => {
        try {
            // Get current product
            const products = await loadProductsFromDB();
            const product = products.find(p => p.id === productId);
            
            if (!product) {
                reject(new Error('Product not found'));
                return;
            }
            
            const oldStock = product.stock || 0;
            product.stock = newStock;
            
            // Save to database
            const transaction = db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            const request = store.put(product);
            
            request.onsuccess = async () => {
                // Log stock change
                await logStockChange(productId, product.name, oldStock, newStock, reason);
                
                // Log activity
                if (typeof logActivity === 'function') {
                    await logActivity('stock_update', `${product.name}: ${oldStock} → ${newStock} (${reason})`);
                }
                
                // Update global products array
                await reloadProducts();
                
                resolve();
            };
            
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Log stock change to history
 */
async function logStockChange(productId, productName, oldStock, newStock, reason) {
    if (!db) return;
    
    const user = getCurrentUser ? getCurrentUser() : null;
    
    const stockChange = {
        id: Date.now(),
        productId: productId,
        productName: productName,
        oldStock: oldStock,
        newStock: newStock,
        change: newStock - oldStock,
        reason: reason,
        timestamp: new Date().toISOString(),
        user: user ? {
            id: user.id,
            username: user.username,
            name: user.name
        } : null
    };
    
    try {
        const transaction = db.transaction(['stock_history'], 'readwrite');
        const store = transaction.objectStore('stock_history');
        store.add(stockChange);
    } catch (error) {
        console.error('Failed to log stock change:', error);
    }
}

/**
 * Deduct stock after sale
 */
async function deductStockAfterSale(cartItems) {
    for (const item of cartItems) {
        const products = await loadProductsFromDB();
        const product = products.find(p => p.id === item.id);
        
        if (product) {
            const currentStock = product.stock || 0;
            const newStock = Math.max(0, currentStock - item.quantity);
            
            await updateProductStock(
                item.id, 
                newStock, 
                `Sale: ${item.quantity} unit${item.quantity > 1 ? 's' : ''} sold`
            );
        }
    }
    
    // Check for low stock after sale
    checkLowStock();
}

/**
 * Check for low stock and show notifications
 */
async function checkLowStock() {
    const products = await loadProductsFromDB();
    const lowStockProducts = products.filter(p => {
        const stock = p.stock || 0;
        return stock > 0 && stock <= inventoryLowStockThreshold;
    });
    
    const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);
    
    // Update header badge
    updateInventoryBadge(lowStockProducts.length + outOfStockProducts.length);
    
    // Show notification if there are low/out of stock items
    if (lowStockProducts.length > 0 || outOfStockProducts.length > 0) {
        const message = `⚠️ ${outOfStockProducts.length} out of stock, ${lowStockProducts.length} low stock`;
        console.warn('Inventory Alert:', message);
    }
}

/**
 * Update inventory button badge
 */
function updateInventoryBadge(count) {
    const inventoryBtn = document.getElementById('inventory-btn');
    if (!inventoryBtn) return;
    
    // Remove existing badge
    const existingBadge = inventoryBtn.querySelector('.inventory-badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    
    // Add new badge if count > 0
    if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'inventory-badge';
        badge.textContent = count;
        inventoryBtn.appendChild(badge);
    }
}

/**
 * Show inventory notification
 */
function showInventoryNotification(message, type = 'success') {
    const existing = document.querySelector('.inventory-notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `inventory-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Export inventory report to CSV
 */
async function exportInventoryCSV() {
    const products = await loadProductsFromDB();
    
    let csv = 'Product,Category,Price,Stock,Value,Status\n';
    
    products.forEach(product => {
        const stock = product.stock || 0;
        const value = stock * product.price;
        const status = getStockStatus(stock).label;
        
        csv += `"${product.name}","${product.category}","$${product.price.toFixed(2)}",${stock},"$${value.toFixed(2)}","${status}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showInventoryNotification('✅ Inventory report exported');
}
