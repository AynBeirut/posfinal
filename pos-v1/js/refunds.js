/**
 * Refunds Module
 * Handle refund processing with user authentication and stock restoration
 */

/**
 * Show refund modal
 */
function showRefundModal() {
    const modal = document.getElementById('refund-modal');
    if (!modal) {
        console.error('❌ Refund modal not found');
        return;
    }
    
    renderRefundSearchForm();
    modal.classList.add('active');
    modal.style.display = 'block';
}

/**
 * Close refund modal
 */
function closeRefundModal() {
    const modal = document.getElementById('refund-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

/**
 * Render refund search form
 */
function renderRefundSearchForm() {
    const content = document.getElementById('refund-content');
    if (!content) return;
    
    content.innerHTML = `
        <div class="refund-search">
            <h3>↩️ Process Refund</h3>
            <p>Search for the sale to refund</p>
            
            <div class="form-group">
                <label for="refund-search-receipt">Receipt Number</label>
                <input type="text" id="refund-search-receipt" placeholder="Enter receipt number..." autofocus>
            </div>
            
            <div class="form-group">
                <label for="refund-search-phone">Customer Phone</label>
                <input type="tel" id="refund-search-phone" placeholder="Customer phone number...">
            </div>
            
            <div class="form-group">
                <label for="refund-search-date">Sale Date</label>
                <input type="date" id="refund-search-date" value="${new Date().toISOString().split('T')[0]}">
            </div>
            
            <button onclick="searchSalesForRefund()" class="btn-primary">🔍 Search Sales</button>
            
            <div id="refund-search-results" style="margin-top: 20px;"></div>
        </div>
    `;
}

/**
 * Search sales for refund
 */
async function searchSalesForRefund() {
    try {
        const receipt = document.getElementById('refund-search-receipt').value.trim();
        const phone = document.getElementById('refund-search-phone').value.trim();
        const date = document.getElementById('refund-search-date').value;
        
        let query = 'SELECT * FROM sales WHERE 1=1';
        const params = [];
        
        if (receipt) {
            query += ' AND receiptNumber LIKE ?';
            params.push(`%${receipt}%`);
        }
        
        if (phone) {
            query += ' AND customerPhone LIKE ?';
            params.push(`%${phone}%`);
        }
        
        if (date) {
            query += ' AND date = ?';
            params.push(new Date(date).toLocaleDateString());
        }
        
        query += ' ORDER BY timestamp DESC LIMIT 20';
        
        const sales = runQuery(query, params);
        
        const resultsDiv = document.getElementById('refund-search-results');
        if (!sales || sales.length === 0) {
            resultsDiv.innerHTML = '<p style="text-align: center; color: #888;">No sales found</p>';
            return;
        }
        
        resultsDiv.innerHTML = `
            <h4>Search Results (${sales.length})</h4>
            <div class="sales-list">
                ${sales.map(sale => {
                    const totals = typeof sale.totals === 'string' ? JSON.parse(sale.totals) : sale.totals;
                    const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
                    
                    return `
                        <div class="sale-card" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div>
                                    <strong>Receipt: ${sale.receiptNumber || sale.id}</strong>
                                    <div style="font-size: 13px; color: #666; margin-top: 4px;">
                                        ${new Date(sale.timestamp).toLocaleString()}
                                    </div>
                                    <div style="font-size: 13px; margin-top: 4px;">
                                        ${sale.customerName || 'Walk-in'} ${sale.customerPhone ? `• ${sale.customerPhone}` : ''}
                                    </div>
                                    <div style="font-size: 13px; margin-top: 4px;">
                                        ${items.length} item(s) • ${sale.paymentMethod || 'Cash'}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 18px; font-weight: bold; color: #28a745;">
                                        $${totals.total.toFixed(2)}
                                    </div>
                                    <button onclick="selectSaleForRefund(${sale.id})" class="btn-sm btn-primary" style="margin-top: 8px;">
                                        Select
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (error) {
        console.error('❌ Search failed:', error);
        alert('Search failed: ' + error.message);
    }
}

/**
 * Select sale for refund and authenticate user
 */
async function selectSaleForRefund(saleId) {
    try {
        const sale = runQuery('SELECT * FROM sales WHERE id = ?', [saleId]);
        if (!sale || sale.length === 0) {
            alert('❌ Sale not found');
            return;
        }
        
        // Show authentication modal
        showRefundAuthModal(sale[0]);
    } catch (error) {
        console.error('❌ Failed to select sale:', error);
        alert('Error: ' + error.message);
    }
}

/**
 * Show refund authentication modal
 */
function showRefundAuthModal(sale) {
    const content = document.getElementById('refund-content');
    if (!content) return;
    
    const totals = typeof sale.totals === 'string' ? JSON.parse(sale.totals) : sale.totals;
    const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
    
    content.innerHTML = `
        <div class="refund-auth">
            <h3>🔐 Manager Approval Required</h3>
            <p>Please enter manager credentials to process refund</p>
            
            <div class="sale-summary" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4>Sale Details</h4>
                <div><strong>Receipt:</strong> ${sale.receiptNumber || sale.id}</div>
                <div><strong>Date:</strong> ${new Date(sale.timestamp).toLocaleString()}</div>
                <div><strong>Customer:</strong> ${sale.customerName || 'Walk-in'}</div>
                <div><strong>Total:</strong> $${totals.total.toFixed(2)}</div>
                <div style="margin-top: 10px;">
                    <strong>Items:</strong>
                    ${items.map(item => `<div>• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</div>`).join('')}
                </div>
            </div>
            
            <div class="form-group">
                <label for="refund-auth-username">Username *</label>
                <input type="text" id="refund-auth-username" placeholder="Manager/Admin username" required autofocus>
            </div>
            
            <div class="form-group">
                <label for="refund-auth-password">Password *</label>
                <input type="password" id="refund-auth-password" placeholder="Password" required>
            </div>
            
            <div class="form-group">
                <label for="refund-reason">Reason for Refund *</label>
                <textarea id="refund-reason" rows="3" placeholder="Explain why this refund is being issued..." required></textarea>
            </div>
            
            <div class="form-group">
                <label for="refund-type">Refund Type *</label>
                <select id="refund-type" required>
                    <option value="full">Full Refund - $${totals.total.toFixed(2)}</option>
                    <option value="partial">Partial Refund (Select Items)</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button onclick="authenticateAndProcessRefund(${sale.id})" class="btn-primary">✅ Approve & Process Refund</button>
                <button onclick="renderRefundSearchForm()" class="btn-secondary">Cancel</button>
            </div>
        </div>
    `;
}

/**
 * Authenticate and process refund
 */
async function authenticateAndProcessRefund(saleId) {
    try {
        const username = document.getElementById('refund-auth-username').value.trim();
        const password = document.getElementById('refund-auth-password').value;
        const reason = document.getElementById('refund-reason').value.trim();
        const refundType = document.getElementById('refund-type').value;
        
        if (!username || !password || !reason) {
            alert('❌ Please fill in all required fields');
            return;
        }
        
        // Authenticate user
        const users = runQuery('SELECT * FROM users WHERE username = ?', [username]);
        if (!users || users.length === 0) {
            alert('❌ User not found');
            return;
        }
        
        const user = users[0];
        
        // Verify role (only admin or manager can approve refunds)
        if (user.role !== 'admin' && user.role !== 'manager') {
            alert('❌ Only managers and administrators can approve refunds');
            return;
        }
        
        // Verify password (simple check - in production use proper hashing)
        if (user.password !== password) {
            alert('❌ Incorrect password');
            return;
        }
        
        // Get sale details
        const sale = runQuery('SELECT * FROM sales WHERE id = ?', [saleId])[0];
        if (!sale) {
            alert('❌ Sale not found');
            return;
        }
        
        const totals = typeof sale.totals === 'string' ? JSON.parse(sale.totals) : sale.totals;
        const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
        
        // Process refund
        const refundData = {
            saleId: sale.id,
            originalSaleDate: sale.date,
            refundAmount: totals.total,
            refundType: refundType,
            refundItems: JSON.stringify(items),
            reason: reason,
            approvedBy: user.id,
            approverUsername: user.username,
            approverRole: user.role,
            processedBy: getCurrentUser()?.username || 'System',
            timestamp: Date.now(),
            receiptNumber: 'REF-' + Date.now(),
            paymentMethod: sale.paymentMethod,
            notes: `Refund for receipt ${sale.receiptNumber || sale.id}`
        };
        
        // Save refund record
        await runExec(`
            INSERT INTO refunds (saleId, originalSaleDate, refundAmount, refundType, refundItems, reason, 
                                 approvedBy, approverUsername, approverRole, processedBy, timestamp, 
                                 receiptNumber, paymentMethod, notes, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [
            refundData.saleId,
            refundData.originalSaleDate,
            refundData.refundAmount,
            refundData.refundType,
            refundData.refundItems,
            refundData.reason,
            refundData.approvedBy,
            refundData.approverUsername,
            refundData.approverRole,
            refundData.processedBy,
            refundData.timestamp,
            refundData.receiptNumber,
            refundData.paymentMethod,
            refundData.notes
        ]);
        
        // Restore stock for refunded items (only for physical products)
        for (const item of items) {
            if (item.type !== 'service') {
                await runExec(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [item.quantity, item.id]
                );
            }
        }
        
        // Create negative sale entry for accounting
        const negativeSale = {
            ...sale,
            id: Date.now(),
            timestamp: Date.now(),
            date: new Date().toLocaleDateString(),
            totals: JSON.stringify({
                ...totals,
                total: -totals.total,
                subtotal: -totals.subtotal,
                tax: -totals.tax
            }),
            paymentMethod: 'REFUND',
            notes: `Refund of receipt ${sale.receiptNumber || sale.id} - Approved by ${user.username}`
        };
        
        await runExec(`
            INSERT INTO sales (timestamp, date, items, totals, paymentMethod, customerInfo, 
                              receiptNumber, cashierName, cashierId, notes, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [
            negativeSale.timestamp,
            negativeSale.date,
            typeof negativeSale.items === 'string' ? negativeSale.items : JSON.stringify(negativeSale.items),
            negativeSale.totals,
            negativeSale.paymentMethod,
            negativeSale.customerInfo || null,
            refundData.receiptNumber,
            negativeSale.cashierName,
            negativeSale.cashierId,
            negativeSale.notes
        ]);
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('refund', `Processed refund $${totals.total.toFixed(2)} - Approved by ${user.username} - ${reason}`);
        }
        
        // Show success and print refund receipt
        alert(`✅ Refund Processed Successfully\n\nAmount: $${totals.total.toFixed(2)}\nReceipt: ${refundData.receiptNumber}\n\nStock has been restored.`);
        
        // Print refund receipt
        printRefundReceipt(refundData, sale);
        
        closeRefundModal();
        
    } catch (error) {
        console.error('❌ Refund failed:', error);
        alert('Refund failed: ' + error.message);
    }
}

/**
 * Print refund receipt
 */
function printRefundReceipt(refundData, originalSale) {
    // Reuse existing receipt printing with negative amounts
    if (typeof showReceipt === 'function') {
        const totals = typeof originalSale.totals === 'string' ? JSON.parse(originalSale.totals) : originalSale.totals;
        const items = typeof originalSale.items === 'string' ? JSON.parse(originalSale.items) : originalSale.items;
        
        const refundReceiptData = {
            ...originalSale,
            receiptNumber: refundData.receiptNumber,
            timestamp: refundData.timestamp,
            items: items,
            totals: {
                subtotal: -totals.subtotal,
                tax: -totals.tax,
                total: -totals.total
            },
            paymentMethod: 'REFUND',
            notes: `REFUND - Original: ${originalSale.receiptNumber || originalSale.id}\nReason: ${refundData.reason}\nApproved by: ${refundData.approverUsername}`
        };
        
        showReceipt(refundReceiptData);
    }
}

// Export functions
window.showRefundModal = showRefundModal;
window.closeRefundModal = closeRefundModal;
window.searchSalesForRefund = searchSalesForRefund;
window.selectSaleForRefund = selectSaleForRefund;
window.authenticateAndProcessRefund = authenticateAndProcessRefund;
