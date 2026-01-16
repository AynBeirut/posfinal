// ===================================
// PURCHASES UI MODULE
// Handles all UI interactions for purchases, suppliers, deliveries, and payments
// ===================================

let deliveryItemsCounter = 0;
let purchasesInitialized = false;

// Record a payment to a supplier
async function recordSupplierPayment(paymentData) {
    try {
        const { supplierId, amount, paymentMethod, reference, notes, paidBy } = paymentData;
        
        if (!supplierId) {
            throw new Error('Supplier is required');
        }
        
        if (!amount || amount <= 0) {
            throw new Error('Payment amount must be greater than 0');
        }
        
        const now = Date.now();
        
        // Insert payment record and get ID
        const result = await runExec(
            `INSERT INTO supplier_payments (supplierId, amount, paymentMethod, reference, notes, paidBy, paidAt, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                supplierId,
                amount,
                paymentMethod || 'Cash',
                reference || '',
                notes || '',
                paidBy || '',
                now,
                now
            ]
        );
        
        const paymentId = result || 0;
        
        // Invalidate supplier balance cache to force recalculation
        if (typeof invalidateSupplierBalanceCache === 'function') {
            await invalidateSupplierBalanceCache(supplierId);
        }
        
        // Update balance immediately instead of queuing
        if (typeof updateSupplierBalance === 'function') {
            await updateSupplierBalance(supplierId);
        } else if (typeof queueSupplierBalanceUpdate === 'function') {
            queueSupplierBalanceUpdate(supplierId);
        }
        
        await saveDatabase();
        
        console.log('✅ Supplier payment recorded successfully');
        return true;
    } catch (error) {
        console.error('❌ Error recording supplier payment:', error);
        throw error;
    }
}

// Initialize Purchases Module
function initPurchases() {
    if (purchasesInitialized) {
        console.log('⚠️ Purchases module already initialized, skipping');
        return;
    }
    
    console.log('📦 Initializing Purchases Module...');
    
    // Set up Purchases button
    const purchasesBtn = document.getElementById('purchases-btn');
    if (purchasesBtn) {
        purchasesBtn.addEventListener('click', openPurchasesModal);
        console.log('✅ Purchases button listener attached');
    } else {
        console.warn('⚠️ Purchases button not found');
    }
    
    // Set up modal close buttons (only for purchases modals)
    setupPurchasesModalCloseButtons();
    
    // Set up tab navigation
    setupTabNavigation();
    
    // Set today's date as default
    const deliveryDateInput = document.getElementById('delivery-date');
    if (deliveryDateInput) {
        deliveryDateInput.valueAsDate = new Date();
    }
    
    // Update supplier debt badge (only if database is ready)
    if (typeof getTotalSupplierDebt === 'function' && typeof db !== 'undefined' && db) {
        updateSupplierDebtBadge().catch(err => {
            console.warn('Could not update supplier debt badge:', err);
        });
    }
    
    purchasesInitialized = true;
    console.log('✅ Purchases Module initialized');
}

// Open Purchases Modal
async function openPurchasesModal() {
    const modal = document.getElementById('purchases-modal');
    if (modal) {
        modal.style.display = 'block';
        
        console.log('📦 Opening Purchases Modal...');
        
        try {
            // Load required modules first
            console.log('📦 Loading required modules...');
            
            // Ensure suppliers module is loaded
            if (typeof loadSuppliers !== 'function') {
                console.log('Loading suppliers module...');
                await loadModuleOnDemand('suppliers');
            }
            
            // Ensure deliveries module is loaded
            if (typeof getDeliveryHistory !== 'function') {
                console.log('Loading deliveries module...');
                await loadModuleOnDemand('deliveries');
            }
            
            console.log('✅ All required modules loaded');
            
            // Load data for all tabs with error handling
            console.log('Loading supplier dropdowns...');
            await loadSupplierDropdowns();
            
            console.log('Loading suppliers table...');
            await loadSuppliersTable();
            
            console.log('Loading delivery history...');
            await loadDeliveryHistory();
            
            console.log('Loading payment history...');
            await loadPaymentHistory();
            
            console.log('Loading purchase returns...');
            await loadPurchaseReturnsTable();
            
            console.log('✅ All purchases data loaded successfully');
            
            // Add first delivery item row
            const deliveryItemsBody = document.getElementById('delivery-items-body');
            if (deliveryItemsBody && deliveryItemsBody.children.length === 0) {
                addDeliveryItemRow();
            }
        } catch (error) {
            console.error('❌ Error loading purchases data:', error);
            showNotification('Error loading purchases data: ' + error.message, 'error');
        }
    }
}

// Set up modal close buttons (only for purchases-related modals)
function setupPurchasesModalCloseButtons() {
    // Only set up close buttons for purchases modals
    const purchasesModals = [
        'purchases-modal',
        'quick-add-supplier-modal',
        'supplier-form-modal',
        'make-payment-modal',
        'delivery-details-modal'
    ];
    
    purchasesModals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            }
            
            // Close when clicking outside (only for this modal)
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    });
}

// Setup tab navigation
function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    const targetPane = document.getElementById(`${tabName}-tab`);
    if (targetPane) {
        targetPane.classList.add('active');
    }
    
    // Load data for specific tabs
    if (tabName === 'payments' && typeof loadSupplierBalances === 'function') {
        loadSupplierBalances();
    }
    if (tabName === 'statements' && typeof populateStatementSuppliers === 'function') {
        populateStatementSuppliers();
    }
    // Load purchase-returns module for delivery history tab
    if (tabName === 'deliveries') {
        loadModuleOnDemand('purchase-returns').catch(err => {
            console.warn('⚠️ Failed to load purchase-returns module:', err);
        });
    }
}

// Load suppliers into dropdowns
async function loadSupplierDropdowns() {
    try {
        console.log('🔄 Loading supplier dropdowns...');
        
        // Ensure suppliers module is loaded
        if (typeof loadSuppliers !== 'function') {
            console.log('📦 Loading suppliers module...');
            await loadModuleOnDemand('suppliers');
        }
        
        const suppliers = await loadSuppliers();
        console.log(`👥 Found ${suppliers.length} suppliers for dropdowns`);
        
        // Delivery supplier dropdown
        const deliverySupplier = document.getElementById('delivery-supplier');
        if (deliverySupplier) {
            deliverySupplier.innerHTML = '<option value="">Select Supplier...</option>';
            suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.textContent = supplier.name;
                deliverySupplier.appendChild(option);
            });
        }
        
        // Filter dropdowns
        ['filter-supplier', 'payment-filter-supplier', 'returns-filter-supplier', 'statement-supplier'].forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">All Suppliers</option>';
                suppliers.forEach(supplier => {
                    const option = document.createElement('option');
                    option.value = supplier.id;
                    option.textContent = supplier.name;
                    select.appendChild(option);
                });
                select.value = currentValue;
            }
        });
    } catch (error) {
        console.error('❌ Error loading supplier dropdowns:', error);
        showNotification('Error loading suppliers: ' + error.message, 'error');
    }
}

// Add delivery item row
function addDeliveryItemRow() {
    const tbody = document.getElementById('delivery-items-body');
    const rowId = ++deliveryItemsCounter;
    
    const row = document.createElement('tr');
    row.id = `delivery-item-${rowId}`;
    row.innerHTML = `
        <td>
            <select class="form-control delivery-item-product" data-row="${rowId}" onchange="updateDeliveryLineTotal(${rowId});" required>
                <option value="">Select Product...</option>
            </select>
        </td>
        <td>
            <input type="number" class="form-control delivery-item-qty" data-row="${rowId}" min="1" step="1" value="1" onchange="updateDeliveryLineTotal(${rowId});" required>
        </td>
        <td>
            <input type="number" class="form-control delivery-item-cost" data-row="${rowId}" min="0" step="0.01" value="0" onchange="updateDeliveryLineTotal(${rowId});" required>
        </td>
        <td>
            <span class="delivery-item-total" data-row="${rowId}">$0.00</span>
        </td>
        <td>
            <button type="button" class="btn-icon-danger" onclick="removeDeliveryItemRow(${rowId});" title="Remove">✖</button>
        </td>
    `;
    
    tbody.appendChild(row);
    
    // Load products into dropdown
    loadProductsIntoRow(rowId);
}

// Load products into delivery item row
async function loadProductsIntoRow(rowId) {
    const products = await loadProductsFromDB();
    const select = document.querySelector(`.delivery-item-product[data-row="${rowId}"]`);
    
    if (select) {
        // Only show items (not services) since services don't have stock
        products.filter(p => p.type !== 'service').forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.icon} ${product.name} (Stock: ${product.stock || 0})`;
            select.appendChild(option);
        });
    }
}

// Remove delivery item row
function removeDeliveryItemRow(rowId) {
    const row = document.getElementById(`delivery-item-${rowId}`);
    if (row) {
        row.remove();
        updateDeliveryTotal();
    }
}

// Update delivery line total
function updateDeliveryLineTotal(rowId) {
    const qty = parseFloat(document.querySelector(`.delivery-item-qty[data-row="${rowId}"]`).value) || 0;
    const cost = parseFloat(document.querySelector(`.delivery-item-cost[data-row="${rowId}"]`).value) || 0;
    const lineTotal = qty * cost;
    
    const totalSpan = document.querySelector(`.delivery-item-total[data-row="${rowId}"]`);
    if (totalSpan) {
        totalSpan.textContent = `$${lineTotal.toFixed(2)}`;
    }
    
    updateDeliveryTotal();
}

// Update delivery total
function updateDeliveryTotal() {
    let total = 0;
    document.querySelectorAll('.delivery-item-total').forEach(span => {
        const value = parseFloat(span.textContent.replace('$', '')) || 0;
        total += value;
    });
    
    const totalDiv = document.getElementById('delivery-total');
    if (totalDiv) {
        totalDiv.textContent = `$${total.toFixed(2)}`;
    }
}

// Submit delivery
async function submitDelivery() {
    try {
        const supplierId = parseInt(document.getElementById('delivery-supplier').value);
        const deliveryDate = new Date(document.getElementById('delivery-date').value).getTime();
        const deliveryRef = document.getElementById('delivery-ref').value.trim();
        const invoiceNumber = document.getElementById('delivery-invoice').value.trim();
        const notes = document.getElementById('delivery-notes').value.trim();
        
        if (!supplierId) {
            alert('⚠️ Please select a supplier');
            return;
        }
        
        // Collect delivery items
        const items = [];
        const rows = document.querySelectorAll('#delivery-items-body tr');
        
        if (rows.length === 0) {
            alert('⚠️ Please add at least one product');
            return;
        }
        
        rows.forEach(row => {
            const rowId = row.id.split('-')[2];
            const productId = parseInt(document.querySelector(`.delivery-item-product[data-row="${rowId}"]`).value);
            const quantity = parseInt(document.querySelector(`.delivery-item-qty[data-row="${rowId}"]`).value);
            const unitCost = parseFloat(document.querySelector(`.delivery-item-cost[data-row="${rowId}"]`).value);
            
            if (productId && quantity > 0 && unitCost >= 0) {
                items.push({ productId, quantity, unitCost });
            }
        });
        
        if (items.length === 0) {
            alert('⚠️ Please fill in all product details');
            return;
        }
        
        // Get current user
        const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        const receivedBy = currentUser ? currentUser.name : 'Unknown';
        
        // Create delivery
        const deliveryData = {
            supplierId,
            deliveryRef,
            invoiceNumber,
            deliveryDate,
            items,
            notes,
            receivedBy
        };
        
        const deliveryId = await createDelivery(deliveryData);
        
        alert(`✅ Delivery received successfully!\nDelivery ID: ${deliveryId}`);
        
        // Clear form
        clearDeliveryForm();
        
        // Reload data
        await loadDeliveryHistory();
        await loadSuppliersTable();
        await updateSupplierDebtBadge();
        
        // Reload inventory if open
        if (typeof loadInventoryData === 'function') {
            loadInventoryData();
        }
        
    } catch (error) {
        console.error('Error submitting delivery:', error);
        alert(`❌ Failed to receive delivery: ${error.message}`);
    }
}

// Clear delivery form
function clearDeliveryForm() {
    document.getElementById('delivery-supplier').value = '';
    document.getElementById('delivery-date').valueAsDate = new Date();
    document.getElementById('delivery-ref').value = '';
    document.getElementById('delivery-invoice').value = '';
    document.getElementById('delivery-notes').value = '';
    
    // Clear all delivery items
    document.getElementById('delivery-items-body').innerHTML = '';
    deliveryItemsCounter = 0;
    
    // Add first row
    addDeliveryItemRow();
    
    updateDeliveryTotal();
}

// Show quick add supplier
function showQuickAddSupplier() {
    const modal = document.getElementById('quick-add-supplier-modal');
    if (modal) {
        document.getElementById('quick-supplier-form').reset();
        modal.style.display = 'block';
    }
}

// Submit quick supplier
async function submitQuickSupplier(event) {
    event.preventDefault();
    
    try {
        const supplierData = {
            name: document.getElementById('quick-supplier-name').value.trim(),
            contactPerson: document.getElementById('quick-supplier-contact').value.trim(),
            phone: document.getElementById('quick-supplier-phone').value.trim()
        };
        
        const supplierId = await addSupplier(supplierData);
        
        // Close modal
        document.getElementById('quick-add-supplier-modal').style.display = 'none';
        
        // Reload dropdowns
        await loadSupplierDropdowns();
        
        // Select the new supplier
        document.getElementById('delivery-supplier').value = supplierId;
        
        alert(`✅ Supplier "${supplierData.name}" added successfully!`);
        
    } catch (error) {
        console.error('Error adding supplier:', error);
        alert(`❌ Failed to add supplier: ${error.message}`);
    }
}

// Show add supplier form
function showAddSupplierForm() {
    const modal = document.getElementById('supplier-form-modal');
    if (modal) {
        document.getElementById('supplier-form-title').textContent = '➕ Add Supplier';
        document.getElementById('supplier-form').reset();
        document.getElementById('edit-supplier-id').value = '';
        modal.style.display = 'block';
    }
}

// Submit supplier form
async function submitSupplierForm(event) {
    event.preventDefault();
    
    try {
        const supplierId = document.getElementById('edit-supplier-id').value;
        const supplierData = {
            name: document.getElementById('supplier-name').value.trim(),
            contactPerson: document.getElementById('supplier-contact-person').value.trim(),
            phone: document.getElementById('supplier-phone').value.trim(),
            email: document.getElementById('supplier-email').value.trim(),
            address: document.getElementById('supplier-address').value.trim(),
            paymentTerms: document.getElementById('supplier-payment-terms-days')?.value?.trim() || '',
            notes: document.getElementById('supplier-notes').value.trim()
        };
        
        if (supplierId) {
            // Update existing
            await updateSupplier(parseInt(supplierId), supplierData);
            alert(`✅ Supplier "${supplierData.name}" updated successfully!`);
        } else {
            // Add new
            await addSupplier(supplierData);
            alert(`✅ Supplier "${supplierData.name}" added successfully!`);
        }
        
        // Close modal
        document.getElementById('supplier-form-modal').style.display = 'none';
        
        // Reload suppliers table
        await loadSuppliersTable();
        await loadSupplierDropdowns();
        
    } catch (error) {
        console.error('Error saving supplier:', error);
        alert(`❌ Failed to save supplier: ${error.message}`);
    }
}

// Load suppliers table
async function loadSuppliersTable() {
    const tbody = document.getElementById('suppliers-list');
    if (!tbody) {
        console.warn('⚠️ suppliers-list element not found');
        return;
    }
    
    try {
        console.log('🔄 Loading suppliers...');
        const suppliers = await loadSuppliers();
        console.log(`👥 Found ${suppliers.length} suppliers`);
        
        tbody.innerHTML = '';
        
        if (suppliers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">👥 No suppliers found. Click "Add Supplier" to add your first supplier!</td></tr>';
            return;
        }
        
        suppliers.forEach(supplier => {
            const paymentTerms = supplier.payment_terms_days ? `${supplier.payment_terms_days} Days` : (supplier.paymentTerms || '-');
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${escapeHtml(supplier.name)}</strong></td>
                <td>${escapeHtml(supplier.contactPerson || '-')}</td>
                <td>${escapeHtml(supplier.phone || '-')}</td>
                <td>${escapeHtml(supplier.email || '-')}</td>
                <td>${escapeHtml(paymentTerms)}</td>
                <td>
                    <button class="btn-icon-primary" onclick="editSupplier(${supplier.id});" title="Edit">✏️</button>
                    <button class="btn-icon-danger" onclick="deleteSupplierConfirm(${supplier.id});" title="Delete">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('❌ Error loading suppliers:', error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">❌ Error loading suppliers: ${error.message}</td></tr>`;
    }
}

// Edit supplier
async function editSupplier(supplierId) {
    const supplier = await getSupplierById(supplierId);
    if (!supplier) return;
    
    document.getElementById('supplier-form-title').textContent = '✏️ Edit Supplier';
    document.getElementById('edit-supplier-id').value = supplier.id;
    document.getElementById('supplier-name').value = supplier.name;
    document.getElementById('supplier-contact-person').value = supplier.contactPerson || '';
    document.getElementById('supplier-phone').value = supplier.phone || '';
    document.getElementById('supplier-email').value = supplier.email || '';
    document.getElementById('supplier-address').value = supplier.address || '';
    
    // Handle both old and new payment terms field
    const paymentTermsDays = supplier.payment_terms_days || supplier.paymentTerms || '';
    document.getElementById('supplier-payment-terms-days').value = paymentTermsDays;
    
    document.getElementById('supplier-notes').value = supplier.notes || '';
    
    document.getElementById('supplier-form-modal').style.display = 'block';
}

// Delete supplier confirm
async function deleteSupplierConfirm(supplierId) {
    const supplier = await getSupplierById(supplierId);
    if (!supplier) return;
    
    if (!confirm(`Are you sure you want to delete supplier "${supplier.name}"?\n\nThis cannot be undone.`)) {
        return;
    }
    
    try {
        await deleteSupplier(supplierId);
        alert(`✅ Supplier "${supplier.name}" deleted successfully`);
        await loadSuppliersTable();
        await loadSupplierDropdowns();
    } catch (error) {
        alert(`❌ ${error.message}`);
    }
}

// Make payment
async function makePayment(supplierId) {
    const supplier = await getSupplierById(supplierId);
    if (!supplier) return;
    
    const balance = supplier.balance || 0;
    const outstandingAmount = balance < 0 ? Math.abs(balance) : 0;
    
    document.getElementById('payment-supplier-id').value = supplier.id;
    document.getElementById('payment-supplier-name').value = supplier.name;
    document.getElementById('payment-supplier-balance').value = `$${outstandingAmount.toFixed(2)}`;
    document.getElementById('payment-amount').value = outstandingAmount.toFixed(2);
    document.getElementById('payment-method').value = 'Cash';
    document.getElementById('payment-reference').value = '';
    document.getElementById('payment-notes').value = '';
    
    document.getElementById('make-payment-modal').style.display = 'block';
}

// Submit payment
async function submitPayment(event) {
    event.preventDefault();
    
    try {
        const supplierId = parseInt(document.getElementById('payment-supplier-id').value);
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const paymentMethod = document.getElementById('payment-method').value;
        const reference = document.getElementById('payment-reference').value.trim();
        const notes = document.getElementById('payment-notes').value.trim();
        
        const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        const paidBy = currentUser ? currentUser.name : 'Unknown';
        
        const paymentData = {
            supplierId,
            amount,
            paymentMethod,
            reference,
            notes,
            paidBy
        };
        
        await recordSupplierPayment(paymentData);
        
        alert(`✅ Payment of $${amount.toFixed(2)} recorded successfully!`);
        
        // Close modal
        document.getElementById('make-payment-modal').style.display = 'none';
        
        // Wait a moment for cache updates to process
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Reload data
        await loadSuppliersTable();
        await loadPaymentHistory();
        await updateSupplierDebtBadge();
        
        // Refresh supplier balances if on payments tab
        if (typeof loadSupplierBalances === 'function') {
            loadSupplierBalances();
        }
        
    } catch (error) {
        console.error('Error recording payment:', error);
        alert(`❌ Failed to record payment: ${error.message}`);
    }
}

// Wrapper function to handle delivery returns with module loading
async function handleDeliveryReturn(deliveryId) {
    try {
        // Ensure purchase-returns module is loaded
        if (typeof initiateDeliveryReturn !== 'function') {
            console.log('📦 Loading purchase-returns module...');
            await loadModuleOnDemand('purchase-returns');
        }
        
        // Call the actual function
        if (typeof initiateDeliveryReturn === 'function') {
            await initiateDeliveryReturn(deliveryId);
        } else {
            throw new Error('initiateDeliveryReturn function not available');
        }
    } catch (error) {
        console.error('❌ Error handling delivery return:', error);
        alert(`❌ Failed to initiate return: ${error.message}`);
    }
}

// Load delivery history
async function loadDeliveryHistory() {
    const tbody = document.getElementById('delivery-history-list');
    if (!tbody) {
        console.warn('⚠️ delivery-history-list element not found');
        return;
    }
    
    try {
        console.log('🔄 Loading delivery history...');
        const deliveries = await getDeliveryHistory();
        console.log(`📦 Found ${deliveries.length} deliveries`);
        
        tbody.innerHTML = '';
        
        if (deliveries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">📦 No deliveries found. Click "Receive Delivery" to add your first delivery.</td></tr>';
            return;
        }
        
        deliveries.forEach(delivery => {
            const date = new Date(delivery.deliveryDate);
            const dateStr = date.toLocaleDateString();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${dateStr}</td>
                <td>${delivery.supplierName || 'Unknown'}</td>
                <td>${delivery.deliveryRef || '-'}</td>
                <td>${delivery.invoiceNumber || '-'}</td>
                <td><span class="badge">${delivery.items ? delivery.items.length : '-'} items</span></td>
                <td><strong>$${delivery.totalAmount.toFixed(2)}</strong></td>
                <td>${delivery.receivedBy || '-'}</td>
                <td>
                    <button class="btn-icon-primary" onclick="viewDeliveryDetails(${delivery.id});" title="View Details">👁️</button>
                    ${delivery.returnStatus !== 'full' ? `<button class="btn-icon-warning" onclick="handleDeliveryReturn(${delivery.id});" title="Return Items" style="background: #ff9800;">↩️</button>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('❌ Error loading delivery history:', error);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: red;">❌ Error loading deliveries: ${error.message}</td></tr>`;
    }
}

// View delivery details
async function viewDeliveryDetails(deliveryId) {
    const delivery = await getDeliveryById(deliveryId);
    if (!delivery) return;
    
    const date = new Date(delivery.deliveryDate).toLocaleDateString();
    
    let itemsHtml = '';
    if (delivery.items && delivery.items.length > 0) {
        itemsHtml = '<table style="width: 100%; margin-top: 10px;"><thead><tr><th>Product</th><th>Quantity</th><th>Unit Cost</th><th>Total</th></tr></thead><tbody>';
        delivery.items.forEach(item => {
            itemsHtml += `
                <tr>
                    <td>${item.productIcon || ''} ${item.productName}</td>
                    <td>${item.quantity}</td>
                    <td>$${item.unitCost.toFixed(2)}</td>
                    <td>$${item.lineTotal.toFixed(2)}</td>
                </tr>
            `;
        });
        itemsHtml += '</tbody></table>';
    }
    
    const content = document.getElementById('delivery-details-content');
    content.innerHTML = `
        <div style="padding: 20px;">
            <h3>Delivery #${delivery.id}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                <div>
                    <p><strong>Supplier:</strong> ${delivery.supplierName}</p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Reference:</strong> ${delivery.deliveryRef || '-'}</p>
                    <p><strong>Invoice:</strong> ${delivery.invoiceNumber || '-'}</p>
                </div>
                <div>
                    <p><strong>Received By:</strong> ${delivery.receivedBy || '-'}</p>
                    <p><strong>Total Amount:</strong> $${delivery.totalAmount.toFixed(2)}</p>
                    <p><strong>Notes:</strong> ${delivery.notes || '-'}</p>
                </div>
            </div>
            <h4>Products Received</h4>
            ${itemsHtml}
        </div>
    `;
    
    document.getElementById('delivery-details-modal').style.display = 'block';
}

// Load filtered deliveries
async function loadFilteredDeliveries() {
    const supplierId = document.getElementById('filter-supplier').value;
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;
    
    const filters = {};
    if (supplierId) filters.supplierId = parseInt(supplierId);
    if (startDate) filters.startDate = new Date(startDate).getTime();
    if (endDate) filters.endDate = new Date(endDate).getTime();
    
    const deliveries = await getDeliveryHistory(filters);
    
    // Update table (similar to loadDeliveryHistory but with filtered results)
    const tbody = document.getElementById('delivery-history-list');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (deliveries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No deliveries found matching your filters</td></tr>';
        return;
    }
    
    deliveries.forEach(delivery => {
        const date = new Date(delivery.deliveryDate).toLocaleDateString();
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td>${delivery.supplierName || 'Unknown'}</td>
            <td>${delivery.deliveryRef || '-'}</td>
            <td>${delivery.invoiceNumber || '-'}</td>
            <td><span class="badge">-</span></td>
            <td><strong>$${delivery.totalAmount.toFixed(2)}</strong></td>
            <td>${delivery.receivedBy || '-'}</td>
            <td>
                <button class="btn-icon-primary" onclick="viewDeliveryDetails(${delivery.id});" title="View Details">👁️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Clear delivery filters
function clearDeliveryFilters() {
    document.getElementById('filter-supplier').value = '';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    loadDeliveryHistory();
}

// Load payment history
async function loadPaymentHistory() {
    const tbody = document.getElementById('payment-history-list');
    if (!tbody) {
        console.warn('⚠️ payment-history-list element not found');
        return;
    }
    
    try {
        console.log('🔄 Loading payment history...');
        const payments = await getPaymentHistory();
        console.log(`💵 Found ${payments.length} payments`);
        
        tbody.innerHTML = '';
        
        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">💵 No payments found. Click "Make Payment" to record a payment.</td></tr>';
            return;
        }
        
        payments.forEach(payment => {
            const date = new Date(payment.paidAt).toLocaleDateString();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${date}</td>
                <td>${payment.supplierName || 'Unknown'}</td>
                <td><strong>$${payment.amount.toFixed(2)}</strong></td>
                <td>${payment.paymentMethod || '-'}</td>
                <td>${payment.reference || '-'}</td>
                <td>${payment.paidBy || '-'}</td>
                <td>${payment.notes || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('❌ Error loading payment history:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: red;">❌ Error loading payments: ${error.message}</td></tr>`;
    }
}

// Load filtered payments
async function loadFilteredPayments() {
    const supplierId = document.getElementById('payment-filter-supplier').value;
    const startDate = document.getElementById('payment-filter-start-date').value;
    const endDate = document.getElementById('payment-filter-end-date').value;
    
    const filters = {};
    if (supplierId) filters.supplierId = parseInt(supplierId);
    if (startDate) filters.startDate = new Date(startDate).getTime();
    if (endDate) filters.endDate = new Date(endDate).getTime();
    
    const payments = await getPaymentHistory(filters);
    
    const tbody = document.getElementById('payment-history-list');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No payments found matching your filters</td></tr>';
        return;
    }
    
    payments.forEach(payment => {
        const date = new Date(payment.paidAt).toLocaleDateString();
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td>${payment.supplierName || 'Unknown'}</td>
            <td><strong>$${payment.amount.toFixed(2)}</strong></td>
            <td>${payment.paymentMethod || '-'}</td>
            <td>${payment.reference || '-'}</td>
            <td>${payment.paidBy || '-'}</td>
            <td>${payment.notes || '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Clear payment filters
function clearPaymentFilters() {
    document.getElementById('payment-filter-supplier').value = '';
    document.getElementById('payment-filter-start-date').value = '';
    document.getElementById('payment-filter-end-date').value = '';
    loadPaymentHistory();
}

// Load purchase returns table
async function loadPurchaseReturnsTable() {
    const tbody = document.getElementById('purchase-returns-list');
    if (!tbody) {
        console.warn('⚠️ purchase-returns-list element not found');
        return;
    }
    
    try {
        console.log('🔄 Loading purchase returns...');
        let returns = [];
        try {
            returns = await loadPurchaseReturns();
        } catch (error) {
            // Purchase returns table doesn't exist yet (feature not implemented)
            if (error.message && error.message.includes('no such table')) {
                console.warn('⚠️ Purchase returns feature not yet available');
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">ℹ️ Purchase returns feature coming soon</td></tr>';
                return;
            }
            throw error;
        }
        console.log(`↩️ Found ${returns.length} returns`);
        
        tbody.innerHTML = '';
        
        if (returns.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">↩️ No returns found. Returns will appear here when items are returned to suppliers.</td></tr>';
            return;
        }
        
        const reasonLabels = {
            'bad_items': '🔴 Bad Items',
            'not_needed': '📦 Not Needed',
            'incorrect_items': '⚠️ Incorrect',
            'expired': '⏰ Expired',
            'wrong_specification': '📋 Wrong Spec',
            'other': '❓ Other'
        };
        
        returns.forEach(returnRecord => {
            const date = new Date(returnRecord.timestamp).toLocaleDateString();
            const returnItems = JSON.parse(returnRecord.returnItems || '[]');
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${date}</td>
                <td>${returnRecord.deliveryRef || '-'}</td>
                <td>${returnRecord.supplierName || 'Unknown'}</td>
                <td><span class="badge">${reasonLabels[returnRecord.reason] || returnRecord.reason}</span></td>
                <td><span class="badge">${returnItems.length} items</span></td>
                <td><strong style="color: #f44336;">-$${returnRecord.returnAmount.toFixed(2)}</strong></td>
                <td>${returnRecord.approverUsername}</td>
                <td>
                    <button class="btn-icon-primary" onclick="viewPurchaseReturnDetails(${returnRecord.id});" title="View Details">👁️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('❌ Error loading purchase returns:', error);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: red;">❌ Error loading returns: ${error.message}</td></tr>`;
    }
}

// Load filtered returns
async function loadFilteredReturns() {
    const supplierId = document.getElementById('returns-filter-supplier').value;
    const reason = document.getElementById('returns-filter-reason').value;
    const startDate = document.getElementById('returns-filter-start-date').value;
    const endDate = document.getElementById('returns-filter-end-date').value;
    
    const filters = {};
    if (supplierId) filters.supplierId = parseInt(supplierId);
    if (reason) filters.reason = reason;
    if (startDate) filters.startDate = new Date(startDate).getTime();
    if (endDate) filters.endDate = new Date(endDate).getTime();
    
    const returns = await loadPurchaseReturns(filters);
    
    const tbody = document.getElementById('purchase-returns-list');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (returns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No returns found matching your filters</td></tr>';
        return;
    }
    
    const reasonLabels = {
        'bad_items': '🔴 Bad Items',
        'not_needed': '📦 Not Needed',
        'incorrect_items': '⚠️ Incorrect',
        'expired': '⏰ Expired',
        'wrong_specification': '📋 Wrong Spec',
        'other': '❓ Other'
    };
    
    returns.forEach(returnRecord => {
        const date = new Date(returnRecord.timestamp).toLocaleDateString();
        const returnItems = JSON.parse(returnRecord.returnItems || '[]');
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td>${returnRecord.deliveryRef || '-'}</td>
            <td>${returnRecord.supplierName || 'Unknown'}</td>
            <td><span class="badge">${reasonLabels[returnRecord.reason] || returnRecord.reason}</span></td>
            <td><span class="badge">${returnItems.length} items</span></td>
            <td><strong style="color: #f44336;">-$${returnRecord.returnAmount.toFixed(2)}</strong></td>
            <td>${returnRecord.approverUsername}</td>
            <td>
                <button class="btn-icon-primary" onclick="viewPurchaseReturnDetails(${returnRecord.id});" title="View Details">👁️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Clear returns filters
function clearReturnsFilters() {
    document.getElementById('returns-filter-supplier').value = '';
    document.getElementById('returns-filter-reason').value = '';
    document.getElementById('returns-filter-start-date').value = '';
    document.getElementById('returns-filter-end-date').value = '';
    loadPurchaseReturnsTable();
}

// Update supplier debt badge
async function updateSupplierDebtBadge() {
    const totalDebt = await getTotalSupplierDebt();
    const badge = document.getElementById('purchases-debt-badge');
    
    if (badge) {
        if (totalDebt > 0) {
            badge.textContent = `$${totalDebt.toFixed(0)}`;
            badge.style.display = 'inline-block';
            badge.style.background = '#f44336';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Load and display supplier statement
async function loadAndDisplaySupplierStatement() {
    try {
        // Ensure suppliers module is loaded
        if (typeof loadSuppliers !== 'function' || typeof loadSupplierStatement !== 'function') {
            console.log('📦 Loading suppliers module...');
            await loadModuleOnDemand('suppliers');
        }
        
        const supplierId = document.getElementById('statement-supplier').value;
        
        // If no supplier selected, load all suppliers
        if (!supplierId) {
            console.log('📊 Loading statements for all suppliers');
            const allSuppliers = await loadSuppliers();
            console.log('👥 Found suppliers:', allSuppliers);
            
            if (!allSuppliers || allSuppliers.length === 0) {
                showNotification('⚠️ No suppliers found in database', 'warning');
                return;
            }
            
            displayAllSuppliersStatements(allSuppliers);
            showNotification(`✅ Loaded ${allSuppliers.length} suppliers`, 'success');
            return;
        }
        
        console.log('📊 Loading statement for supplier:', supplierId);
        
        const statement = await loadSupplierStatement(parseInt(supplierId));
        
        if (!statement) {
            showNotification('❌ Failed to load statement', 'error');
            return;
        }
        
        // Display statement in a table or detailed view
        displaySupplierStatement(statement);
        
        showNotification('✅ Statement loaded successfully', 'success');
        
    } catch (error) {
        console.error('❌ Error loading statement:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// Display all suppliers statements overview
function displayAllSuppliersStatements(suppliers) {
    console.log('🖥️ Displaying all suppliers:', suppliers);
    
    const container = document.getElementById('statement-summary');
    if (!container) {
        console.error('❌ Statement summary container not found');
        return;
    }
    
    // Hide the empty message
    const emptyMessage = document.getElementById('statement-empty');
    if (emptyMessage) {
        emptyMessage.style.display = 'none';
    }
    
    // Hide the statement table if it exists
    const statementTable = document.getElementById('statement-table');
    if (statementTable) {
        statementTable.classList.add('d-none');
    }
    
    // Force display to block to override CSS
    container.classList.remove('d-none');
    container.style.display = 'block';
    
    let html = `
        <div class="card">
            <div class="card-header">
                <h5>All Suppliers Overview</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Supplier Name</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Current Balance</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    suppliers.forEach(supplier => {
        // Calculate balance from transactions instead of using stale database field
        const purchases = runQuery(`
            SELECT COALESCE(SUM(totalAmount), 0) as total
            FROM deliveries
            WHERE supplierId = ?
        `, [supplier.id]);
        
        const payments = runQuery(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM supplier_payments
            WHERE supplierId = ?
        `, [supplier.id]);
        
        // Purchase returns feature not yet implemented
        let totalReturns = 0;
        try {
            const returns = runQuery(`
                SELECT COALESCE(SUM(returnAmount), 0) as total
                FROM purchase_returns pr
                JOIN deliveries d ON pr.deliveryId = d.id
                WHERE d.supplierId = ?
            `, [supplier.id]);
            totalReturns = returns[0]?.total || 0;
        } catch (error) {
            // Silently ignore if table doesn't exist
            if (!error.message || !error.message.includes('no such table')) {
                console.error('Error loading purchase returns:', error);
            }
        }
        
        const totalPurchases = purchases[0]?.total || 0;
        const totalPaid = payments[0]?.total || 0;
        const balance = totalPurchases - totalPaid - totalReturns;
        
        const statusClass = balance > 0 ? 'danger' : balance < 0 ? 'success' : 'secondary';
        const statusText = balance > 0 ? 'WE OWE' : balance < 0 ? 'OVERPAID' : 'SETTLED';
        
        html += `
            <tr>
                <td><strong>${supplier.name}</strong></td>
                <td>${supplier.phone || 'N/A'}</td>
                <td>${supplier.email || 'N/A'}</td>
                <td><span class="badge bg-${statusClass}">${formatCurrency(Math.abs(balance))}</span></td>
                <td><span class="badge bg-${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('statement-supplier').value='${supplier.id}'; loadAndDisplaySupplierStatement();">
                        View Details
                    </button>
                </td>
            </tr>
        `;
    });
    
    // Calculate grand totals
    let grandTotalPurchases = 0;
    let grandTotalPaid = 0;
    let grandTotalBalance = 0;
    
    suppliers.forEach(supplier => {
        const purchases = runQuery(`
            SELECT COALESCE(SUM(totalAmount), 0) as total
            FROM deliveries
            WHERE supplierId = ?
        `, [supplier.id]);
        
        const payments = runQuery(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM supplier_payments
            WHERE supplierId = ?
        `, [supplier.id]);
        
        let totalReturns = 0;
        try {
            const returns = runQuery(`
                SELECT COALESCE(SUM(returnAmount), 0) as total
                FROM purchase_returns pr
                JOIN deliveries d ON pr.deliveryId = d.id
                WHERE d.supplierId = ?
            `, [supplier.id]);
            totalReturns = returns[0]?.total || 0;
        } catch (error) {
            console.log('No purchase returns for supplier', supplier.id);
        }
        
        const totalPurchases = purchases[0]?.total || 0;
        const totalPaid = payments[0]?.total || 0;
        const balance = totalPurchases - totalPaid - totalReturns;
        
        grandTotalPurchases += totalPurchases;
        grandTotalPaid += totalPaid;
        grandTotalBalance += balance;
    });
    
    // Add totals row
    html += `
            <tr style="background: #f5f5f5; border-top: 3px solid #333; font-weight: bold; font-size: 1.1em;">
                <td colspan="3" style="text-align: right; padding: 15px;">TOTAL:</td>
                <td><span class="badge bg-${grandTotalBalance > 0 ? 'danger' : grandTotalBalance < 0 ? 'success' : 'secondary'}">${formatCurrency(Math.abs(grandTotalBalance))}</span></td>
                <td><span class="badge bg-${grandTotalBalance > 0 ? 'danger' : grandTotalBalance < 0 ? 'success' : 'secondary'}">${grandTotalBalance > 0 ? 'WE OWE' : grandTotalBalance < 0 ? 'OVERPAID' : 'SETTLED'}</span></td>
                <td></td>
            </tr>
    `;
    
    html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    console.log('📝 Setting innerHTML for statement-summary');
    container.innerHTML = html;
    console.log('✅ Suppliers table displayed');
}

// Display supplier statement in the UI
function displaySupplierStatement(statement) {
    const container = document.getElementById('statement-summary');
    if (!container) {
        console.warn('⚠️ Statement display container not found');
        return;
    }
    
    // Hide the empty message
    const emptyMessage = document.getElementById('statement-empty');
    if (emptyMessage) {
        emptyMessage.style.display = 'none';
    }
    
    // Hide the statement table if it exists
    const statementTable = document.getElementById('statement-table');
    if (statementTable) {
        statementTable.classList.add('d-none');
    }
    
    // Make container visible - force display to override CSS
    container.classList.remove('d-none');
    container.style.display = 'block';
    
    const { supplier, transactions, currentBalance } = statement;
    
    let html = `
        <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #333;">📋 ${supplier.name}</h3>
            <p style="margin: 5px 0; color: #333;"><strong>Contact:</strong> ${supplier.contactPerson || 'N/A'}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Phone:</strong> ${supplier.phone || 'N/A'}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Current Balance:</strong> 
                <span style="color: ${currentBalance < 0 ? '#f44336' : '#4CAF50'}; font-weight: bold; font-size: 1.2em;">
                    $${Math.abs(currentBalance).toFixed(2)} ${currentBalance < 0 ? '(We Owe)' : '(Overpaid)'}
                </span>
            </p>
        </div>
        
        <h4 style="margin: 20px 0 10px 0; color: #333;">📊 Transaction History</h4>
    `;
    
    if (transactions.length === 0) {
        html += '<p style="text-align: center; padding: 20px; color: #999;">No transactions found</p>';
    } else {
        html += `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Reference</th>
                        <th>Debit</th>
                        <th>Credit</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Calculate totals as we iterate
        let totalDebit = 0;
        let totalCredit = 0;
        
        transactions.forEach(txn => {
            const date = new Date(txn.date).toLocaleDateString();
            const isDelivery = txn.type === 'delivery';
            const debitAmount = isDelivery ? txn.amount : 0;
            const creditAmount = !isDelivery ? txn.amount : 0;
            
            totalDebit += debitAmount;
            totalCredit += creditAmount;
            
            html += `
                <tr>
                    <td>${date}</td>
                    <td><span class="badge" style="background: ${isDelivery ? '#ff9800' : '#4CAF50'};">
                        ${isDelivery ? '📦 Delivery' : '💵 Payment'}
                    </span></td>
                    <td>${txn.reference || '-'}</td>
                    <td style="color: #f44336; font-weight: bold;">${isDelivery ? '$' + txn.amount.toFixed(2) : '-'}</td>
                    <td style="color: #4CAF50; font-weight: bold;">${!isDelivery ? '$' + txn.amount.toFixed(2) : '-'}</td>
                    <td>${txn.notes || '-'}</td>
                </tr>
            `;
        });
        
        // Add total row
        const netBalance = totalDebit - totalCredit;
        html += `
                <tr style="background: #f5f5f5; border-top: 2px solid #333;">
                    <td colspan="3" style="text-align: right; font-weight: bold; padding: 12px;">TOTAL:</td>
                    <td style="color: #f44336; font-weight: bold; font-size: 1.1em;">$${totalDebit.toFixed(2)}</td>
                    <td style="color: #4CAF50; font-weight: bold; font-size: 1.1em;">$${totalCredit.toFixed(2)}</td>
                    <td></td>
                </tr>
                <tr style="background: #e8f5e9; border-top: 1px solid #4CAF50;">
                    <td colspan="3" style="text-align: right; font-weight: bold; padding: 12px; font-size: 1.1em;">NET BALANCE:</td>
                    <td colspan="3" style="font-weight: bold; font-size: 1.2em; color: ${netBalance < 0 ? '#4CAF50' : '#f44336'};">
                        $${Math.abs(netBalance).toFixed(2)} ${netBalance < 0 ? '(Overpaid)' : '(We Owe)'}
                    </td>
                </tr>
        `;
        
        html += `
                </tbody>
            </table>
        `;
    }
    
    container.innerHTML = html;
}

// Export supplier statement to PDF
async function exportSupplierStatementPDF() {
    try {
        const supplierId = document.getElementById('statement-supplier').value;
        
        // Check if showing all suppliers or single supplier
        if (!supplierId) {
            // Export all suppliers overview
            const allSuppliers = await loadSuppliers();
            
            if (!allSuppliers || allSuppliers.length === 0) {
                showNotification('❌ No suppliers to export', 'error');
                return;
            }
            
            const pdfData = allSuppliers.map(supplier => ({
                name: supplier.name,
                phone: supplier.phone || 'N/A',
                email: supplier.email || 'N/A',
                balance: supplier.balance || 0,
                status: supplier.balance > 0 ? 'They Owe' : supplier.balance < 0 ? 'We Owe' : 'Settled'
            }));
            
            // Calculate total balance
            const totalBalance = allSuppliers.reduce((sum, supplier) => sum + (supplier.balance || 0), 0);
            
            // Add total row
            pdfData.push({
                name: 'TOTAL',
                phone: '',
                email: '',
                balance: totalBalance,
                status: ''
            });
            
            const columns = [
                {header: 'Supplier Name', dataKey: 'name'},
                {header: 'Phone', dataKey: 'phone'},
                {header: 'Email', dataKey: 'email'},
                {header: 'Balance', dataKey: 'balance'},
                {header: 'Status', dataKey: 'status'}
            ];
            
            const filename = `all-suppliers-${new Date().toISOString().split('T')[0]}`;
            
            await exportToPDF(pdfData, columns, 'All Suppliers Overview', filename);
            showNotification('✅ PDF exported successfully', 'success');
            return;
        }
        
        // Export single supplier statement
        const statement = await loadSupplierStatement(parseInt(supplierId));
        
        if (!statement || !statement.transactions) {
            showNotification('❌ Failed to load statement', 'error');
            return;
        }
        
        // Prepare data for PDF
        const pdfData = statement.transactions.map(txn => {
            const date = new Date(txn.date).toLocaleDateString();
            const isDelivery = txn.type === 'delivery';
            
            return {
                date: date,
                type: isDelivery ? 'Delivery' : 'Payment',
                reference: txn.reference || '-',
                debit: isDelivery ? txn.amount : 0,
                credit: !isDelivery ? txn.amount : 0,
                notes: txn.notes || '-'
            };
        });
        
        const columns = [
            {header: 'Date', dataKey: 'date'},
            {header: 'Type', dataKey: 'type'},
            {header: 'Reference', dataKey: 'reference'},
            {header: 'Debit', dataKey: 'debit'},
            {header: 'Credit', dataKey: 'credit'},
            {header: 'Notes', dataKey: 'notes'}
        ];
        
        const filename = `supplier-statement-${statement.supplier.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
        
        await exportToPDF(pdfData, columns, `Supplier Statement: ${statement.supplier.name}`, filename, {
            subtitle: `Current Balance: ${formatCurrency(statement.currentBalance)}`
        });
        
        showNotification('✅ PDF exported successfully', 'success');
        
    } catch (error) {
        console.error('Error exporting PDF:', error);
        showNotification('Error exporting PDF', 'error');
    }
}

// Export supplier statement to Excel
async function exportSupplierStatementExcel() {
    try {
        const supplierId = document.getElementById('statement-supplier').value;
        
        // Check if showing all suppliers or single supplier
        if (!supplierId) {
            // Export all suppliers overview
            const allSuppliers = await loadSuppliers();
            
            if (!allSuppliers || allSuppliers.length === 0) {
                showNotification('❌ No suppliers to export', 'error');
                return;
            }
            
            const excelData = allSuppliers.map(supplier => ({
                name: supplier.name,
                phone: supplier.phone || 'N/A',
                email: supplier.email || 'N/A',
                balance: supplier.balance || 0,
                status: supplier.balance > 0 ? 'They Owe' : supplier.balance < 0 ? 'We Owe' : 'Settled'
            }));
            
            // Calculate total balance
            const totalBalance = allSuppliers.reduce((sum, supplier) => sum + (supplier.balance || 0), 0);
            
            // Add total row
            excelData.push({
                name: 'TOTAL',
                phone: '',
                email: '',
                balance: totalBalance,
                status: ''
            });
            
            const columns = [
                {header: 'Supplier Name', key: 'name', width: 25},
                {header: 'Phone', key: 'phone', width: 15},
                {header: 'Email', key: 'email', width: 25},
                {header: 'Balance', key: 'balance', width: 15, type: 'currency'},
                {header: 'Status', key: 'status', width: 15}
            ];
            
            const filename = `all-suppliers-${new Date().toISOString().split('T')[0]}`;
            
            await exportToExcel(excelData, columns, filename, 'All Suppliers');
            showNotification('✅ Excel exported successfully', 'success');
            return;
        }
        
        // Export single supplier statement
        const statement = await loadSupplierStatement(parseInt(supplierId));
        
        if (!statement || !statement.transactions) {
            showNotification('❌ Failed to load statement', 'error');
            return;
        }
        
        // Prepare data for Excel
        const excelData = statement.transactions.map(txn => {
            const date = new Date(txn.date).toLocaleDateString();
            const isDelivery = txn.type === 'delivery';
            
            return {
                date: date,
                type: isDelivery ? 'Delivery' : 'Payment',
                reference: txn.reference || '-',
                debit: isDelivery ? txn.amount : 0,
                credit: !isDelivery ? txn.amount : 0,
                notes: txn.notes || '-'
            };
        });
        
        const columns = [
            {header: 'Date', key: 'date', width: 12},
            {header: 'Type', key: 'type', width: 12},
            {header: 'Reference', key: 'reference', width: 15},
            {header: 'Debit', key: 'debit', width: 12, type: 'currency'},
            {header: 'Credit', key: 'credit', width: 12, type: 'currency'},
            {header: 'Notes', key: 'notes', width: 30}
        ];
        
        const filename = `supplier-statement-${statement.supplier.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
        
        await exportToExcel(excelData, columns, filename, `Statement: ${statement.supplier.name}`);
        
        showNotification('✅ Excel exported successfully', 'success');
        
    } catch (error) {
        console.error('Error exporting Excel:', error);
        showNotification('Error exporting Excel', 'error');
    }
}

// Export supplier statement to CSV
async function exportSupplierStatementCSV() {
    try {
        const supplierId = document.getElementById('statement-supplier').value;
        
        // Check if showing all suppliers or single supplier
        if (!supplierId) {
            // Export all suppliers overview
            const allSuppliers = await loadSuppliers();
            
            if (!allSuppliers || allSuppliers.length === 0) {
                showNotification('❌ No suppliers to export', 'error');
                return;
            }
            
            // Build CSV content for all suppliers
            let csv = 'All Suppliers Overview\n';
            csv += 'Supplier Name,Phone,Email,Balance,Status\n';
            
            let totalBalance = 0;
            
            allSuppliers.forEach(supplier => {
                const balance = supplier.balance || 0;
                totalBalance += balance;
                const status = balance > 0 ? 'They Owe' : balance < 0 ? 'We Owe' : 'Settled';
                const name = (supplier.name || '').replace(/,/g, ';');
                const phone = (supplier.phone || 'N/A').replace(/,/g, ';');
                const email = (supplier.email || 'N/A').replace(/,/g, ';');
                
                csv += `"${name}","${phone}","${email}",${Math.abs(balance).toFixed(2)},${status}\n`;
            });
            
            // Add total row
            csv += `"TOTAL","","",${Math.abs(totalBalance).toFixed(2)},\n`;
            
            // Download CSV
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            const date = new Date().toISOString().split('T')[0];
            
            link.setAttribute('href', url);
            link.setAttribute('download', `all-suppliers-${date}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification('✅ CSV exported successfully', 'success');
            return;
        }
        
        // Export single supplier statement
        const statement = await loadSupplierStatement(parseInt(supplierId));
        
        if (!statement) {
            showNotification('❌ Failed to load statement', 'error');
            return;
        }
        
        // Build CSV content
        let csv = 'Supplier Account Statement\n';
        csv += `Supplier,${statement.supplier.name}\n`;
        csv += `Contact,${statement.supplier.contactPerson || 'N/A'}\n`;
        csv += `Phone,${statement.supplier.phone || 'N/A'}\n`;
        csv += `Current Balance,$${Math.abs(statement.currentBalance).toFixed(2)} ${statement.currentBalance < 0 ? '(We Owe)' : '(Overpaid)'}\n`;
        csv += '\nDate,Type,Reference,Debit,Credit,Notes\n';
        
        statement.transactions.forEach(txn => {
            const date = new Date(txn.date).toLocaleDateString();
            const type = txn.type === 'delivery' ? 'Delivery' : 'Payment';
            const debit = txn.type === 'delivery' ? txn.amount.toFixed(2) : '';
            const credit = txn.type === 'payment' ? txn.amount.toFixed(2) : '';
            const notes = (txn.notes || '').replace(/,/g, ';'); // Escape commas
            
            csv += `${date},${type},${txn.reference || ''},${debit},${credit},"${notes}"\n`;
        });
        
        // Download CSV file
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `supplier_statement_${statement.supplier.name}_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('✅ CSV exported successfully', 'success');
        
    } catch (error) {
        console.error('Error exporting CSV:', error);
        showNotification('Error exporting CSV: ' + error.message, 'error');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPurchases);
} else {
    initPurchases();
}

console.log('✅ Purchases UI module loaded');
