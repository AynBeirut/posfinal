// ===================================
// PURCHASES UI MODULE
// Handles all UI interactions for purchases, suppliers, deliveries, and payments
// ===================================

let deliveryItemsCounter = 0;
let purchasesInitialized = false;

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
        
        // Load data for all tabs
        await loadSupplierDropdowns();
        await loadSuppliersTable();
        await loadDeliveryHistory();
        await loadPaymentHistory();
        
        // Add first delivery item row
        const deliveryItemsBody = document.getElementById('delivery-items-body');
        if (deliveryItemsBody && deliveryItemsBody.children.length === 0) {
            addDeliveryItemRow();
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
}

// Load suppliers into dropdowns
async function loadSupplierDropdowns() {
    const suppliers = await loadSuppliers();
    
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
    ['filter-supplier', 'payment-filter-supplier'].forEach(id => {
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
            paymentTerms: document.getElementById('supplier-payment-terms').value.trim(),
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
    if (!tbody) return;
    
    const suppliers = await loadSuppliers();
    
    tbody.innerHTML = '';
    
    if (suppliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No suppliers found. Add your first supplier!</td></tr>';
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
        
        // Reload data
        await loadSuppliersTable();
        await loadPaymentHistory();
        await updateSupplierDebtBadge();
        
    } catch (error) {
        console.error('Error recording payment:', error);
        alert(`❌ Failed to record payment: ${error.message}`);
    }
}

// Load delivery history
async function loadDeliveryHistory() {
    const tbody = document.getElementById('delivery-history-list');
    if (!tbody) return;
    
    const deliveries = await getDeliveryHistory();
    
    tbody.innerHTML = '';
    
    if (deliveries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No deliveries found</td></tr>';
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
            </td>
        `;
        tbody.appendChild(row);
    });
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
    if (!tbody) return;
    
    const payments = await getPaymentHistory();
    
    tbody.innerHTML = '';
    
    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No payments found</td></tr>';
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPurchases);
} else {
    initPurchases();
}

console.log('✅ Purchases UI module loaded');
