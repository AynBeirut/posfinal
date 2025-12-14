/**
 * Refunds Module
 * Handle refund processing with user authentication and stock restoration
 */

console.log('🔄 Loading refunds.js...');

try {

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
            <p>Browse or search for the sale to refund</p>
            
            <div class="filter-tabs" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                <button onclick="filterSalesByPeriod('today')" class="btn-filter active" data-period="today">📅 Today</button>
                <button onclick="filterSalesByPeriod('yesterday')" class="btn-filter" data-period="yesterday">Yesterday</button>
                <button onclick="filterSalesByPeriod('week')" class="btn-filter" data-period="week">📊 Last Week</button>
                <button onclick="filterSalesByPeriod('month')" class="btn-filter" data-period="month">📆 Last Month</button>
                <button onclick="filterSalesByPeriod('year')" class="btn-filter" data-period="year">📈 Last Year</button>
                <button onclick="filterSalesByPeriod('all')" class="btn-filter" data-period="all">🗂️ All Time</button>
            </div>
            
            <div class="search-filters" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div class="form-group">
                        <label for="refund-search-receipt">🧾 Receipt Number</label>
                        <input type="text" id="refund-search-receipt" placeholder="Search by receipt..." onkeyup="searchSalesForRefund()">
                    </div>
                    
                    <div class="form-group">
                        <label for="refund-search-customer">👤 Customer Name</label>
                        <input type="text" id="refund-search-customer" placeholder="Search by name..." onkeyup="searchSalesForRefund()">
                    </div>
                    
                    <div class="form-group">
                        <label for="refund-search-phone">📞 Phone</label>
                        <input type="tel" id="refund-search-phone" placeholder="Phone number..." onkeyup="searchSalesForRefund()">
                    </div>
                    
                    <div class="form-group">
                        <label for="refund-search-date">📅 Specific Date</label>
                        <input type="date" id="refund-search-date" onchange="searchSalesForRefund()">
                    </div>
                </div>
            </div>
            
            <div id="refund-search-results" style="margin-top: 20px;">
                <div style="text-align: center; padding: 20px; color: #666;">
                    <div class="spinner"></div>
                    Loading sales...
                </div>
            </div>
        </div>
        
        <style>
            .btn-filter {
                padding: 8px 16px;
                border: 2px solid #ddd;
                background: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
            }
            .btn-filter:hover {
                background: #f0f0f0;
            }
            .btn-filter.active {
                background: #4CAF50;
                color: white;
                border-color: #4CAF50;
            }
            .spinner {
                border: 3px solid #f3f3f3;
                border-top: 3px solid #4CAF50;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    // Auto-load today's sales
    filterSalesByPeriod('today');
}

let currentPeriod = 'today';
let currentSearchFilters = {};

/**
 * Filter sales by time period
 */
function filterSalesByPeriod(period) {
    currentPeriod = period;
    
    // Update active button
    document.querySelectorAll('.btn-filter').forEach(btn => {
        if (btn.dataset.period === period) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Load sales for this period
    searchSalesForRefund();
}

/**
 * Search sales for refund
 */
async function searchSalesForRefund() {
    try {
        const receipt = document.getElementById('refund-search-receipt')?.value.trim() || '';
        const customer = document.getElementById('refund-search-customer')?.value.trim() || '';
        const phone = document.getElementById('refund-search-phone')?.value.trim() || '';
        const specificDate = document.getElementById('refund-search-date')?.value || '';
        
        let query = 'SELECT * FROM sales WHERE 1=1';
        const params = [];
        
        // Period filter
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (currentPeriod === 'today') {
            const todayStart = today.getTime();
            query += ' AND timestamp >= ?';
            params.push(todayStart);
        } else if (currentPeriod === 'yesterday') {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            query += ' AND timestamp >= ? AND timestamp < ?';
            params.push(yesterday.getTime(), today.getTime());
        } else if (currentPeriod === 'week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            query += ' AND timestamp >= ?';
            params.push(weekAgo.getTime());
        } else if (currentPeriod === 'month') {
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            query += ' AND timestamp >= ?';
            params.push(monthAgo.getTime());
        } else if (currentPeriod === 'year') {
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            query += ' AND timestamp >= ?';
            params.push(yearAgo.getTime());
        }
        // 'all' - no time filter
        
        // Search filters
        if (receipt) {
            query += ' AND (CAST(receiptNumber AS TEXT) LIKE ? OR CAST(id AS TEXT) LIKE ?)';
            params.push(`%${receipt}%`, `%${receipt}%`);
        }
        
        if (customer) {
            query += ' AND customerName LIKE ?';
            params.push(`%${customer}%`);
        }
        
        if (phone) {
            query += ' AND customerPhone LIKE ?';
            params.push(`%${phone}%`);
        }
        
        if (specificDate) {
            const dateStart = new Date(specificDate).setHours(0,0,0,0);
            const dateEnd = new Date(specificDate).setHours(23,59,59,999);
            query += ' AND timestamp >= ? AND timestamp <= ?';
            params.push(dateStart, dateEnd);
        }
        
        query += ' ORDER BY timestamp DESC LIMIT 50';
        
        const sales = runQuery(query, params);
        
        const resultsDiv = document.getElementById('refund-search-results');
        if (!sales || sales.length === 0) {
            resultsDiv.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
                    <h3>No Sales Found</h3>
                    <p>No sales match your search criteria for the selected period.</p>
                </div>
            `;
            return;
        }
        
        // Calculate totals
        let totalSales = 0;
        let totalAmount = 0;
        sales.forEach(sale => {
            const totals = typeof sale.totals === 'string' ? JSON.parse(sale.totals) : sale.totals;
            totalAmount += totals.total || 0;
        });
        totalSales = sales.length;
        
        resultsDiv.innerHTML = `
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="font-size: 18px;">${totalSales} Sales Found</strong>
                    <div style="color: #666; font-size: 14px; margin-top: 4px;">
                        Period: ${getPeriodLabel(currentPeriod)}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 24px; font-weight: bold; color: #2e7d32;">
                        $${totalAmount.toFixed(2)}
                    </div>
                    <div style="color: #666; font-size: 13px;">Total Revenue</div>
                </div>
            </div>
            
            <div class="sales-list">
                ${sales.map(sale => {
                    const totals = typeof sale.totals === 'string' ? JSON.parse(sale.totals) : sale.totals;
                    const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
                    const saleDate = new Date(sale.timestamp);
                    
                    return `
                        <div class="sale-card" style="border: 2px solid #e0e0e0; padding: 15px; margin-bottom: 12px; border-radius: 8px; background: white; transition: all 0.2s;" onmouseover="this.style.borderColor='#4CAF50'" onmouseout="this.style.borderColor='#e0e0e0'">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div style="flex: 1;">
                                    <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 6px;">
                                        🧾 Receipt #${sale.receiptNumber || sale.id}
                                    </div>
                                    <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
                                        📅 ${saleDate.toLocaleDateString()} at ${saleDate.toLocaleTimeString()}
                                    </div>
                                    <div style="font-size: 14px; margin-bottom: 4px;">
                                        👤 ${sale.customerName || 'Walk-in Customer'} ${sale.customerPhone ? `📞 ${sale.customerPhone}` : ''}
                                    </div>
                                    <div style="font-size: 13px; color: #666; margin-top: 8px;">
                                        🛒 ${items.length} item(s) • 💳 ${sale.paymentMethod || 'Cash'}
                                    </div>
                                    <div style="margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 12px;">
                                        ${items.slice(0, 3).map(item => `• ${item.name} x${item.quantity}`).join('<br>')}
                                        ${items.length > 3 ? `<br>• <em>...and ${items.length - 3} more items</em>` : ''}
                                    </div>
                                </div>
                                <div style="text-align: right; margin-left: 20px;">
                                    <div style="font-size: 24px; font-weight: bold; color: #2e7d32; margin-bottom: 10px;">
                                        $${totals.total.toFixed(2)}
                                    </div>
                                    <button onclick="selectSaleForRefund(${sale.id})" class="btn-primary" style="padding: 10px 20px; font-size: 14px; white-space: nowrap;">
                                        ↩️ Refund
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
        const resultsDiv = document.getElementById('refund-search-results');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #d32f2f;">
                    <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
                    <h3>Search Failed</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
}

/**
 * Get period label for display
 */
function getPeriodLabel(period) {
    const labels = {
        'today': 'Today',
        'yesterday': 'Yesterday',
        'week': 'Last 7 Days',
        'month': 'Last 30 Days',
        'year': 'Last 365 Days',
        'all': 'All Time'
    };
    return labels[period] || period;
}

/**
 * Toggle item selection UI for partial refunds
 */
function toggleItemSelection(saleId) {
    const refundType = document.getElementById('refund-type').value;
    const itemsDiv = document.getElementById('refund-items-selection');
    
    if (refundType === 'partial') {
        itemsDiv.style.display = 'block';
    } else {
        itemsDiv.style.display = 'none';
    }
    
    updatePartialRefundTotal(saleId);
}

/**
 * Update partial refund total based on selected items
 */
function updatePartialRefundTotal(saleId) {
    const sale = runQuery('SELECT * FROM sales WHERE id = ?', [saleId])[0];
    if (!sale) return;
    
    const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
    const totals = typeof sale.totals === 'string' ? JSON.parse(sale.totals) : sale.totals;
    
    let subtotal = 0;
    for (let i = 0; i < items.length; i++) {
        const checkbox = document.getElementById(`refund-item-${i}`);
        if (checkbox && checkbox.checked) {
            subtotal += items[i].price * items[i].quantity;
        }
    }
    
    // Apply proportional tax if original sale had tax
    let total = subtotal;
    if (totals.tax > 0) {
        const taxRate = totals.tax / totals.subtotal;
        total = subtotal * (1 + taxRate);
    }
    
    const totalDisplay = document.getElementById('partial-refund-total');
    if (totalDisplay) {
        totalDisplay.textContent = `$${total.toFixed(2)}`;
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
                <select id="refund-type" required onchange="toggleItemSelection(${sale.id})">
                    <option value="full">Full Refund - $${totals.total.toFixed(2)}</option>
                    <option value="partial">Partial Refund (Select Items)</option>
                </select>
            </div>
            
            <div id="refund-items-selection" style="display: none; margin-top: 15px; padding: 15px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px;">
                <h4 style="margin-top: 0;">Select Items to Refund:</h4>
                ${items.map((item, index) => `
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px;">
                        <input type="checkbox" id="refund-item-${index}" value="${index}" checked onchange="updatePartialRefundTotal(${sale.id})">
                        <label for="refund-item-${index}" style="flex: 1; margin: 0; cursor: pointer;">
                            <strong>${item.name}</strong> - 
                            Qty: ${item.quantity} × $${item.price.toFixed(2)} = 
                            <strong>$${(item.price * item.quantity).toFixed(2)}</strong>
                        </label>
                    </div>
                `).join('')}
                <div style="margin-top: 15px; padding: 10px; background: #d1ecf1; border-radius: 4px; text-align: right;">
                    <strong>Partial Refund Total: <span id="partial-refund-total">$${totals.total.toFixed(2)}</span></strong>
                </div>
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
        const allItems = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
        
        // Get selected items for refund
        let itemsToRefund = allItems;
        let refundAmount = totals.total;
        
        if (refundType === 'partial') {
            // Get selected items
            const selectedIndexes = [];
            for (let i = 0; i < allItems.length; i++) {
                const checkbox = document.getElementById(`refund-item-${i}`);
                if (checkbox && checkbox.checked) {
                    selectedIndexes.push(i);
                }
            }
            
            if (selectedIndexes.length === 0) {
                alert('❌ Please select at least one item to refund');
                return;
            }
            
            // Filter items to refund
            itemsToRefund = selectedIndexes.map(i => allItems[i]);
            
            // Calculate refund amount for selected items
            refundAmount = itemsToRefund.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            // Apply proportional tax if original sale had tax
            if (totals.tax > 0) {
                const taxRate = totals.tax / totals.subtotal;
                refundAmount = refundAmount * (1 + taxRate);
            }
        }
        
        // Process refund
        const refundData = {
            saleId: sale.id,
            originalSaleDate: sale.date,
            refundAmount: refundAmount,
            refundType: refundType,
            refundItems: JSON.stringify(itemsToRefund),
            reason: reason,
            approvedBy: user.id,
            approverUsername: user.username,
            approverRole: user.role,
            processedBy: getCurrentUser()?.username || 'System',
            timestamp: Date.now(),
            receiptNumber: await getNextRefundReceiptNumber(),
            paymentMethod: sale.paymentMethod,
            notes: `${refundType === 'partial' ? 'Partial ' : ''}Refund for receipt ${sale.receiptNumber || sale.id}`
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
        for (const item of itemsToRefund) {
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
window.toggleItemSelection = toggleItemSelection;
window.updatePartialRefundTotal = updatePartialRefundTotal;

} catch (error) {
    console.error('❌ Error loading refunds.js:', error);
    console.error('Stack:', error.stack);
}

console.log('✅ Refunds.js loaded successfully');
