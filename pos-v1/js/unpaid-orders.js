/**
 * Unpaid Orders Module
 * Manage orders that are placed but not yet paid
 */

let unpaidOrdersCache = [];

/**
 * Initialize unpaid orders system
 */
async function initUnpaidOrders() {
    await loadUnpaidOrders();
    updateUnpaidOrdersBadge();
    console.log('✅ Unpaid orders system initialized');
}

/**
 * Load unpaid orders from database
 */
async function loadUnpaidOrders() {
    try {
        unpaidOrdersCache = await getAllUnpaidOrders();
        console.log(`📋 Loaded ${unpaidOrdersCache.length} unpaid orders`);
        return unpaidOrdersCache;
    } catch (error) {
        console.error('Failed to load unpaid orders:', error);
        return [];
    }
}

/**
 * Place an order without payment
 */
async function placeUnpaidOrder(orderData) {
    try {
        const orderId = await saveUnpaidOrder(orderData);
        await loadUnpaidOrders();
        updateUnpaidOrdersBadge();
        
        showNotification('Order Placed', `Order #${orderId} saved successfully`, 'success');
        console.log('✅ Unpaid order placed:', orderId);
        
        return orderId;
    } catch (error) {
        console.error('Failed to place unpaid order:', error);
        showNotification('Error', 'Failed to place order', 'error');
        throw error;
    }
}

/**
 * Show unpaid orders modal
 */
function showUnpaidOrdersModal() {
    const modal = document.getElementById('unpaid-orders-modal');
    if (!modal) {
        console.error('Unpaid orders modal not found');
        return;
    }
    
    renderUnpaidOrdersList();
    modal.classList.add('active');
}

/**
 * Close unpaid orders modal
 */
function closeUnpaidOrdersModal() {
    const modal = document.getElementById('unpaid-orders-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Render unpaid orders list
 */
function renderUnpaidOrdersList() {
    const container = document.getElementById('unpaid-orders-list');
    if (!container) return;
    
    if (unpaidOrdersCache.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>No unpaid orders</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = unpaidOrdersCache.map(order => {
        const orderDate = new Date(order.timestamp);
        const timeAgo = getTimeAgo(order.timestamp);
        
        return `
            <div class="unpaid-order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-number">Order #${order.id}</div>
                    <div class="order-time">${timeAgo}</div>
                </div>
                <div class="order-customer">
                    <strong>${order.customerName || 'Walk-in Customer'}</strong>
                    ${order.customerPhone ? `<span>${order.customerPhone}</span>` : ''}
                </div>
                <div class="order-items">
                    ${order.items.slice(0, 3).map(item => `
                        <div class="order-item">
                            <span>${item.name}</span>
                            <span>×${item.quantity}</span>
                        </div>
                    `).join('')}
                    ${order.items.length > 3 ? `<div class="order-item-more">+${order.items.length - 3} more items</div>` : ''}
                </div>
                <div class="order-footer">
                    <div class="order-total">
                        <strong>Total:</strong> $${(order.totals?.total || 0).toFixed(2)}
                        ${order.totals?.discountPercent > 0 ? `
                        <div style="font-size: 12px; color: #28a745; margin-top: 2px;">
                            💰 Discount: ${order.totals.discountPercent.toFixed(0)}% off
                        </div>
                        ` : ''}
                        ${order.totals ? `
                        <div style="font-size: 12px; color: #666; margin-top: 2px;">
                            ${order.totals.taxEnabled ? '✅ Tax: Yes' : '❌ Tax: No'}
                        </div>
                        ` : ''}
                    </div>
                    <div class="order-actions">
                        <button class="btn btn-sm btn-success" onclick="payUnpaidOrder(${order.id})">
                            💳 Pay Now
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="editUnpaidOrder(${order.id})">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="viewUnpaidOrder(${order.id})">
                            👁️ View
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUnpaidOrderConfirm(${order.id})">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * View unpaid order details
 */
async function viewUnpaidOrder(orderId) {
    try {
        const order = await getUnpaidOrderById(orderId);
        if (!order) {
            showNotification('Error', 'Order not found', 'error');
            return;
        }
        
        // Load order into cart
        cart.length = 0;
        order.items.forEach(item => {
            cart.push({ ...item });
        });
        
        updateCart();
        if (typeof updateCustomerDisplay === 'function') {
            updateCustomerDisplay();
        }
        closeUnpaidOrdersModal();
        
        showNotification('Order Loaded', `Order #${orderId} loaded into cart`, 'info');
    } catch (error) {
        console.error('Failed to view order:', error);
        showNotification('Error', 'Failed to load order', 'error');
    }
}

/**
 * Edit an unpaid order
 */
async function editUnpaidOrder(orderId) {
    try {
        const order = await getUnpaidOrderById(orderId);
        if (!order) {
            showNotification('Error', 'Order not found', 'error');
            return;
        }
        
        // Load order into cart
        cart.length = 0;
        order.items.forEach(item => {
            cart.push({ ...item });
        });
        
        // Restore discount and tax settings from order (EDITABLE)
        const discountInput = document.getElementById('discount-amount');
        const taxCheckbox = document.getElementById('tax-enabled');
        
        if (discountInput && order.totals?.discountPercent !== undefined) {
            discountInput.value = order.totals.discountPercent;
            discountInput.disabled = false;
        }
        
        if (taxCheckbox && order.totals?.taxEnabled !== undefined) {
            taxCheckbox.checked = order.totals.taxEnabled;
            taxCheckbox.disabled = false;
        }
        
        updateCart();
        if (typeof updateCustomerDisplay === 'function') {
            updateCustomerDisplay();
        }
        closeUnpaidOrdersModal();
        
        // Store order ID to update it when placing order again
        window.editingUnpaidOrderId = orderId;
        
        showNotification('Order Loaded', 'Make changes and click "Place Order" to update', 'info');
    } catch (error) {
        console.error('Failed to edit order:', error);
        showNotification('Error', 'Failed to load order for editing', 'error');
    }
}

/**
 * Pay for an unpaid order
 */
async function payUnpaidOrder(orderId) {
    try {
        const order = await getUnpaidOrderById(orderId);
        if (!order) {
            showNotification('Error', 'Order not found', 'error');
            return;
        }
        
        // Load order into cart
        cart.length = 0;
        order.items.forEach(item => {
            cart.push({ ...item });
        });
        
        // Restore discount and tax settings from order (LOCKED)
        const discountInput = document.getElementById('discount-amount');
        const taxCheckbox = document.getElementById('tax-enabled');
        
        if (discountInput && order.totals?.discountPercent !== undefined) {
            discountInput.value = order.totals.discountPercent;
            discountInput.disabled = true;
            discountInput.style.backgroundColor = '#f0f0f0';
            discountInput.title = 'Locked from original order';
        }
        
        if (taxCheckbox && order.totals?.taxEnabled !== undefined) {
            taxCheckbox.checked = order.totals.taxEnabled;
            taxCheckbox.disabled = true;
            taxCheckbox.title = 'Locked from original order';
        }
        
        updateCart();
        if (typeof updateCustomerDisplay === 'function') {
            updateCustomerDisplay();
        }
        closeUnpaidOrdersModal();
        
        // Open payment modal with pre-filled customer info
        openPaymentModal();
        
        // Pre-fill customer name and phone using correct input IDs
        const nameInput = document.getElementById('customer-name');
        const phoneInput = document.getElementById('customer-phone');
        
        if (nameInput && order.customerName) {
            nameInput.value = order.customerName;
        }
        if (phoneInput && order.customerPhone) {
            phoneInput.value = order.customerPhone;
        }
        
        // Store order ID to delete it after payment
        window.currentUnpaidOrderId = orderId;
        
        showNotification('Order Loaded', '🔒 Discount/tax locked. Complete payment to finalize order', 'info');
    } catch (error) {
        console.error('Failed to load order for payment:', error);
        showNotification('Error', 'Failed to load order', 'error');
    }
}

/**
 * Delete unpaid order with confirmation
 */
function deleteUnpaidOrderConfirm(orderId) {
    if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
        deleteUnpaidOrderNow(orderId);
    }
}

/**
 * Delete unpaid order
 */
async function deleteUnpaidOrderNow(orderId) {
    try {
        await deleteUnpaidOrder(orderId);
        await loadUnpaidOrders();
        renderUnpaidOrdersList();
        updateUnpaidOrdersBadge();
        
        showNotification('Order Deleted', 'Unpaid order removed', 'success');
    } catch (error) {
        console.error('Failed to delete order:', error);
        showNotification('Error', 'Failed to delete order', 'error');
    }
}

/**
 * Update unpaid orders badge
 */
function updateUnpaidOrdersBadge() {
    const badge = document.getElementById('unpaid-orders-badge');
    if (!badge) return;
    
    const count = unpaidOrdersCache.length;
    
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

/**
 * Get time ago string
 */
function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
}

/**
 * After payment completion, delete the unpaid order if it exists
 */
async function cleanupPaidOrder() {
    if (window.currentUnpaidOrderId) {
        try {
            await deleteUnpaidOrder(window.currentUnpaidOrderId);
            await loadUnpaidOrders();
            updateUnpaidOrdersBadge();
            console.log('✅ Paid order removed from unpaid list');
            window.currentUnpaidOrderId = null;
        } catch (error) {
            console.error('Failed to cleanup paid order:', error);
        }
    }
}

// Export functions
window.initUnpaidOrders = initUnpaidOrders;
window.loadUnpaidOrders = loadUnpaidOrders;
window.placeUnpaidOrder = placeUnpaidOrder;
window.showUnpaidOrdersModal = showUnpaidOrdersModal;
window.closeUnpaidOrdersModal = closeUnpaidOrdersModal;
window.viewUnpaidOrder = viewUnpaidOrder;
window.payUnpaidOrder = payUnpaidOrder;
window.deleteUnpaidOrderConfirm = deleteUnpaidOrderConfirm;
window.cleanupPaidOrder = cleanupPaidOrder;

// Attach menu button click handler when script loads
const unpaidOrdersBtn = document.getElementById('unpaid-orders-btn');
if (unpaidOrdersBtn) {
    unpaidOrdersBtn.addEventListener('click', showUnpaidOrdersModal);
    console.log('✅ Unpaid orders menu button handler attached');
}
