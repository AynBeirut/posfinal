/**
 * Payment Methods & Tracking Module
 * Handles cash, card, and mobile payments with change calculation
 */

let currentPaymentMethod = 'cash';
let paymentTotal = 0;
let paymentSubtotal = 0;
let paymentTax = 0;

/**
 * Initialize payment module
 */
function initPayment() {
    const checkoutBtn = document.getElementById('checkout-btn');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const paymentModal = document.getElementById('payment-modal');
    const closeBtn = paymentModal.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancel-payment-btn');
    const completeBtn = document.getElementById('complete-payment-btn');
    const cashInput = document.getElementById('cash-received');
    const methodBtns = document.querySelectorAll('.payment-method-btn');
    const quickCashBtns = document.querySelectorAll('.quick-cash-btn');
    
    // Open payment modal on checkout
    checkoutBtn.addEventListener('click', openPaymentModal);
    
    // Place order without payment
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', handlePlaceOrder);
    }
    
    // Close modal
    closeBtn.addEventListener('click', closePaymentModal);
    cancelBtn.addEventListener('click', closePaymentModal);
    
    // Click outside to close
    paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            closePaymentModal();
        }
    });
    
    // Payment method selection
    methodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            methodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPaymentMethod = btn.dataset.method;
            switchPaymentSection(currentPaymentMethod);
        });
    });
    
    // Cash input change calculation
    cashInput.addEventListener('input', calculateChange);
    
    // Quick cash buttons
    quickCashBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.dataset.amount;
            if (amount === 'exact') {
                cashInput.value = paymentTotal.toFixed(2);
            } else {
                cashInput.value = amount;
            }
            calculateChange();
        });
    });
    
    // Complete payment
    completeBtn.addEventListener('click', processPayment);
    
    // Enter key in cash input
    cashInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processPayment();
        }
    });
    
    console.log('✅ Payment module initialized');
}

/**
 * Open payment modal
 */
function openPaymentModal() {
    if (cart.length === 0) return;
    
    const modal = document.getElementById('payment-modal');
    
    // Calculate totals
    paymentSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    paymentTax = paymentSubtotal * 0.11;
    paymentTotal = paymentSubtotal + paymentTax;
    
    // Update summary
    document.getElementById('payment-subtotal').textContent = `$${paymentSubtotal.toFixed(2)}`;
    document.getElementById('payment-tax').textContent = `$${paymentTax.toFixed(2)}`;
    document.getElementById('payment-total').textContent = `$${paymentTotal.toFixed(2)}`;
    
    // Reset to cash method
    currentPaymentMethod = 'cash';
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === 'cash');
    });
    
    // Reset cash input
    document.getElementById('cash-received').value = '';
    document.getElementById('change-amount').textContent = '$0.00';
    
    // Show cash section
    switchPaymentSection('cash');
    
    // Open modal
    modal.classList.add('show');
    
    // Focus cash input
    setTimeout(() => {
        document.getElementById('cash-received').focus();
    }, 300);
}

/**
 * Close payment modal
 */
function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.classList.remove('show');
}

/**
 * Handle placing an order without payment
 */
async function handlePlaceOrder() {
    if (cart.length === 0) {
        showNotification('Empty Cart', 'Add items to cart before placing order', 'warning');
        return;
    }
    
    // Get customer info from payment modal (optional)
    const customerName = prompt('Customer Name (optional):') || 'Walk-in Customer';
    const customerPhone = prompt('Customer Phone (optional):') || '';
    
    const orderData = {
        items: cart.map(item => ({...item})),
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) / 1.11,
        tax: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.11 / 1.11,
        customerName: customerName,
        customerPhone: customerPhone
    };
    
    try {
        const orderId = await placeUnpaidOrder(orderData);
        
        // Clear cart
        cart.length = 0;
        updateCart();
        updateCustomerDisplay();
        
        showNotification('Order Placed', `Order #${orderId} saved successfully. Pay later from Unpaid Orders.`, 'success');
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('order', `Placed unpaid order #${orderId}: ${orderData.items.length} items, $${orderData.total.toFixed(2)}`);
        }
    } catch (error) {
        console.error('Failed to place order:', error);
        showNotification('Error', 'Failed to place order', 'error');
    }
}

/**
 * Switch payment section
 */
function switchPaymentSection(method) {
    const sections = document.querySelectorAll('.payment-section');
    sections.forEach(section => section.classList.remove('active'));
    
    const activeSection = document.getElementById(`${method}-payment-section`);
    if (activeSection) {
        activeSection.classList.add('active');
    }
}

/**
 * Calculate change for cash payment
 */
function calculateChange() {
    const cashReceived = parseFloat(document.getElementById('cash-received').value) || 0;
    const change = cashReceived - paymentTotal;
    
    const changeDisplay = document.getElementById('change-amount');
    changeDisplay.textContent = `$${Math.max(0, change).toFixed(2)}`;
    
    // Visual feedback
    if (change < 0) {
        changeDisplay.style.color = '#F27A1D'; // Orange - insufficient
    } else if (change === 0) {
        changeDisplay.style.color = '#00C2FF'; // Cyan - exact
    } else {
        changeDisplay.style.color = '#00C2FF'; // Cyan - change due
    }
}

/**
 * Process payment
 */
async function processPayment() {
    // Validate payment based on method
    if (currentPaymentMethod === 'cash') {
        const cashReceived = parseFloat(document.getElementById('cash-received').value) || 0;
        
        if (cashReceived < paymentTotal) {
            showPaymentNotification('Insufficient cash amount', 'error');
            return;
        }
        
        const change = cashReceived - paymentTotal;
        
        // Complete the sale with payment info
        await completeSaleWithPayment({
            method: 'Cash',
            amountReceived: cashReceived,
            change: change
        });
        
    } else if (currentPaymentMethod === 'card') {
        // Simulate card processing
        showPaymentNotification('Processing card payment...', 'info');
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        await completeSaleWithPayment({
            method: 'Card',
            amountReceived: paymentTotal,
            change: 0
        });
        
    } else if (currentPaymentMethod === 'mobile') {
        // Simulate mobile payment
        showPaymentNotification('Processing mobile payment...', 'info');
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        await completeSaleWithPayment({
            method: 'Mobile Pay',
            amountReceived: paymentTotal,
            change: 0
        });
    }
}

/**
 * Complete sale with payment information
 */
async function completeSaleWithPayment(paymentInfo) {
    const user = getCurrentUser ? getCurrentUser() : null;
    
    const saleData = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            quantity: item.quantity,
            icon: item.icon
        })),
        subtotal: paymentSubtotal,
        tax: paymentTax,
        total: paymentTotal,
        payment: {
            method: paymentInfo.method,
            amountReceived: paymentInfo.amountReceived,
            change: paymentInfo.change
        },
        user: user ? {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role
        } : null
    };
    
    // Save to database
    const saleId = await saveSale(saleData);
    
    // Get customer info from payment modal
    const customerName = document.getElementById('customer-name')?.value.trim();
    const customerPhone = document.getElementById('customer-phone')?.value.trim();
    
    // Save customer if provided
    if (customerName || customerPhone) {
        await saveCustomerWithSale({
            name: customerName,
            phone: customerPhone
        }, { ...saleData, id: saleId });
        
        // Clear customer fields
        if (document.getElementById('customer-name')) {
            document.getElementById('customer-name').value = '';
        }
        if (document.getElementById('customer-phone')) {
            document.getElementById('customer-phone').value = '';
        }
    }
    
    // Deduct stock
    if (typeof deductStockAfterSale === 'function') {
        await deductStockAfterSale(saleData.items);
    }
    
    // Log activity
    if (typeof logActivity === 'function') {
        const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        await logActivity('sale', `Completed sale: ${itemsCount} items, $${paymentTotal.toFixed(2)} (${paymentInfo.method})`);
    }
    
    // Clean up paid order if it was from unpaid orders
    if (typeof cleanupPaidOrder === 'function') {
        await cleanupPaidOrder();
    }
    
    // Close payment modal
    closePaymentModal();
    
    // Show receipt with payment info
    showReceipt(saleData);
    
    // Clear cart
    cart = [];
    updateCart();
    saveCartToStorage();
    
    // Clear customer display
    if (typeof clearCustomerDisplay === 'function') {
        clearCustomerDisplay();
    }
    
    console.log('Sale completed:', saleData);
}

/**
 * Show payment notification
 */
function showPaymentNotification(message, type = 'success') {
    const existing = document.querySelector('.payment-notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `payment-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
