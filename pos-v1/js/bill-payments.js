/**
 * Bill Payments Management Module
 * Handles utility bill payments (electricity, water, phone, etc.)
 * with receipt generation using company info
 */

// ========================================
// Load Bill Payment Interface
// ========================================
async function loadBillPayments() {
    try {
        const startDate = document.getElementById('bill-date-from')?.value || new Date().toISOString().split('T')[0];
        const endDate = document.getElementById('bill-date-to')?.value || new Date().toISOString().split('T')[0];
        const billTypeFilter = document.getElementById('bill-type-filter')?.value || 'all';

        let query = `
            SELECT bp.*, bt.name as billTypeName, bt.icon as billTypeIcon
            FROM bill_payments bp
            LEFT JOIN bill_types bt ON bp.billType = bt.id
            WHERE DATE(bp.timestamp/1000, 'unixepoch') BETWEEN ? AND ?
        `;
        const params = [startDate, endDate];

        if (billTypeFilter !== 'all') {
            query += ` AND bp.billType = ?`;
            params.push(billTypeFilter);
        }

        query += ` ORDER BY bp.timestamp DESC LIMIT 100`;

        const payments = await runQuery(query, params);
        renderBillPaymentsList(payments);
        await loadBillPaymentsStats(startDate, endDate);
    } catch (error) {
        console.error('Error loading bill payments:', error);
        showNotification('Failed to load bill payments', 'error');
    }
}

// ========================================
// Render Bill Payments List
// ========================================
function renderBillPaymentsList(payments) {
    const container = document.getElementById('bill-payments-list');
    if (!container) return;

    if (!payments || payments.length === 0) {
        container.innerHTML = '<div class="empty-state">No bill payments found</div>';
        return;
    }

    let html = '<div class="bill-payments-grid">';
    
    payments.forEach(payment => {
        const timestamp = new Date(payment.timestamp);
        const formattedDate = timestamp.toLocaleDateString();
        const formattedTime = timestamp.toLocaleTimeString();

        html += `
            <div class="bill-payment-card">
                <div class="bill-header">
                    <span class="bill-icon">${payment.billTypeIcon || '📄'}</span>
                    <span class="bill-type-name">${payment.billTypeName || 'Other'}</span>
                    <span class="bill-amount">$${payment.amount.toFixed(2)}</span>
                </div>
                <div class="bill-details">
                    <div class="bill-row">
                        <span class="label">Bill Number:</span>
                        <span class="value">${payment.billNumber}</span>
                    </div>
                    <div class="bill-row">
                        <span class="label">Customer:</span>
                        <span class="value">${payment.customerName}</span>
                    </div>
                    ${payment.customerPhone ? `
                    <div class="bill-row">
                        <span class="label">Phone:</span>
                        <span class="value">${payment.customerPhone}</span>
                    </div>
                    ` : ''}
                    <div class="bill-row">
                        <span class="label">Payment Method:</span>
                        <span class="value">${payment.paymentMethod}</span>
                    </div>
                    <div class="bill-row">
                        <span class="label">Date:</span>
                        <span class="value">${formattedDate} ${formattedTime}</span>
                    </div>
                    <div class="bill-row">
                        <span class="label">Receipt #:</span>
                        <span class="value">${payment.receiptNumber}</span>
                    </div>
                    ${payment.notes ? `
                    <div class="bill-row">
                        <span class="label">Notes:</span>
                        <span class="value">${payment.notes}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="bill-actions">
                    <button onclick="printBillReceipt(${payment.id})" class="btn-icon" title="Print Receipt">
                        🖨️
                    </button>
                    <button onclick="viewBillDetails(${payment.id})" class="btn-icon" title="View Details">
                        👁️
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// ========================================
// Load Bill Payments Statistics
// ========================================
async function loadBillPaymentsStats(startDate, endDate) {
    try {
        const query = `
            SELECT 
                COUNT(*) as totalPayments,
                SUM(amount) as totalAmount,
                bt.name as billTypeName,
                bt.icon as billTypeIcon,
                COUNT(*) as count,
                SUM(bp.amount) as sum
            FROM bill_payments bp
            LEFT JOIN bill_types bt ON bp.billType = bt.id
            WHERE DATE(bp.timestamp/1000, 'unixepoch') BETWEEN ? AND ?
            GROUP BY bp.billType
            ORDER BY sum DESC
        `;
        
        const stats = await runQuery(query, [startDate, endDate]);
        
        const totalPaymentsEl = document.getElementById('total-bill-payments');
        const totalAmountEl = document.getElementById('total-bill-amount');
        
        if (totalPaymentsEl && stats.length > 0) {
            const totalPayments = stats.reduce((sum, s) => sum + s.count, 0);
            const totalAmount = stats.reduce((sum, s) => sum + s.sum, 0);
            totalPaymentsEl.textContent = totalPayments;
            totalAmountEl.textContent = `$${totalAmount.toFixed(2)}`;
        }

        // Render breakdown by type
        renderBillTypesBreakdown(stats);
    } catch (error) {
        console.error('Error loading bill stats:', error);
    }
}

// ========================================
// Render Bill Types Breakdown
// ========================================
function renderBillTypesBreakdown(stats) {
    const container = document.getElementById('bill-types-breakdown');
    if (!container) return;

    if (!stats || stats.length === 0) {
        container.innerHTML = '<div class="empty-state">No data</div>';
        return;
    }

    let html = '<div class="breakdown-list">';
    
    stats.forEach(stat => {
        if (stat.billTypeName) {
            html += `
                <div class="breakdown-item">
                    <span class="breakdown-icon">${stat.billTypeIcon || '📄'}</span>
                    <span class="breakdown-name">${stat.billTypeName}</span>
                    <span class="breakdown-count">${stat.count} payments</span>
                    <span class="breakdown-amount">$${stat.sum.toFixed(2)}</span>
                </div>
            `;
        }
    });

    html += '</div>';
    container.innerHTML = html;
}

// ========================================
// Open New Bill Payment Form
// ========================================
function openNewBillPayment() {
    document.getElementById('bill-payment-form-title').textContent = 'New Bill Payment';
    document.getElementById('bill-payment-id').value = '';
    document.getElementById('bill-payment-form').reset();
    
    // Load bill types dropdown
    loadBillTypesDropdown();
    
    // Set current date/time
    const now = new Date();
    document.getElementById('bill-payment-date').value = now.toISOString().split('T')[0];
    document.getElementById('bill-payment-time').value = now.toTimeString().slice(0, 5);
    
    const modal = document.getElementById('bill-payment-modal');
    modal.style.display = 'block';
    modal.style.zIndex = '10000'; // Ensure it appears on top
}

// ========================================
// Load Bill Types Dropdown
// ========================================
// ========================================
// Load Bill Types Dropdown (DEPRECATED - now uses free text input)
// ========================================
async function loadBillTypesDropdown() {
    // Bill types are now entered as free text by the user
    // This function is kept for compatibility but does nothing
    console.log('Bill types dropdown deprecated - users enter custom expense types');
}

// ========================================
// Search Phonebook for Customer
// ========================================
async function searchPhonebookForBill() {
    const searchTerm = document.getElementById('bill-customer-search')?.value || '';
    
    if (searchTerm.length < 2) {
        document.getElementById('customer-results').style.display = 'none';
        return;
    }

    try {
        const results = await runQuery(`
            SELECT * FROM phonebook 
            WHERE name LIKE ? OR phone LIKE ?
            LIMIT 10
        `, [`%${searchTerm}%`, `%${searchTerm}%`]);

        renderCustomerResults(results);
    } catch (error) {
        console.error('Error searching phonebook:', error);
    }
}

// ========================================
// Render Customer Search Results
// ========================================
function renderCustomerResults(results) {
    const container = document.getElementById('customer-results');
    if (!container) return;

    if (!results || results.length === 0) {
        container.style.display = 'none';
        return;
    }

    let html = '<div class="results-list">';
    
    results.forEach(customer => {
        html += `
            <div class="result-item" onclick="selectBillCustomer(${customer.id}, '${customer.name}', '${customer.phone || ''}')">
                <div class="result-name">${customer.name}</div>
                <div class="result-phone">${customer.phone || 'No phone'}</div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
    container.style.display = 'block';
}

// ========================================
// Select Customer from Phonebook
// ========================================
function selectBillCustomer(id, name, phone) {
    document.getElementById('bill-customer-id').value = id;
    document.getElementById('bill-customer-name').value = name;
    document.getElementById('bill-customer-phone').value = phone;
    document.getElementById('bill-customer-search').value = name;
    document.getElementById('customer-results').style.display = 'none';
}

// ========================================
// Save Bill Payment
// ========================================
async function saveBillPayment(event) {
    event.preventDefault();

    try {
        const billType = document.getElementById('bill-type-select').value.trim(); // Now a text input
        const billNumber = document.getElementById('bill-number').value.trim();
        const customerName = document.getElementById('bill-customer-search').value.trim() || document.getElementById('bill-customer-name').value.trim();
        const customerPhone = document.getElementById('bill-customer-phone').value.trim();
        const amount = parseFloat(document.getElementById('bill-amount').value);
        const paymentMethod = document.querySelector('input[name="bill-payment-method"]:checked')?.value;
        const notes = document.getElementById('bill-notes').value.trim();
        const paymentDate = document.getElementById('bill-payment-date').value;
        const paymentTime = document.getElementById('bill-payment-time').value;

        // Validation
        if (!billType) {
            showNotification('Please enter expense category / bill type', 'error');
            return;
        }
        if (!billNumber) {
            showNotification('Please enter bill number', 'error');
            return;
        }
        if (!customerName) {
            showNotification('Please enter service provider name (e.g., EDL, Ogero)', 'error');
            return;
        }
        if (!amount || amount <= 0) {
            showNotification('Please enter a valid amount', 'error');
            return;
        }
        if (!paymentMethod) {
            showNotification('Please select payment method', 'error');
            return;
        }

        const timestamp = new Date(`${paymentDate} ${paymentTime}`).getTime();
        const receiptNumber = `BILL-${Date.now()}`;
        const currentUser = getCurrentUser();
        const cashierId = typeof getCashierId === 'function' ? getCashierId() : 'unknown';

        await runExec(`
            INSERT INTO bill_payments (
                billType, billNumber, customerName, customerPhone,
                amount, paymentMethod, timestamp, receiptNumber,
                cashierId, notes, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [
            billType, billNumber, customerName, customerPhone,
            amount, paymentMethod, timestamp, receiptNumber,
            cashierId, notes
        ]);

        // Add to sync queue
        await addToSyncQueue('INSERT', 'bill_payments', {
            receiptNumber,
            billType,
            billNumber,
            customerName,
            customerPhone,
            amount,
            paymentMethod,
            timestamp,
            cashierId,
            notes
        });

        showNotification('Expense/Bill payment recorded successfully', 'success');
        document.getElementById('bill-payment-modal').style.display = 'none';
        
        // Ask if user wants to print receipt
        if (confirm('Payment recorded. Print receipt?')) {
            await printBillReceiptByNumber(receiptNumber);
        }

        await loadBillPayments();
    } catch (error) {
        console.error('Error saving bill payment:', error);
        showNotification('Failed to save bill payment', 'error');
    }
}

// ========================================
// Print Bill Receipt
// ========================================
async function printBillReceipt(paymentId) {
    try {
        const payment = await runQuery(`
            SELECT bp.*, bt.name as billTypeName, bt.icon as billTypeIcon
            FROM bill_payments bp
            LEFT JOIN bill_types bt ON bp.billType = bt.id
            WHERE bp.id = ?
        `, [paymentId]);

        if (!payment || payment.length === 0) {
            showNotification('Payment not found', 'error');
            return;
        }

        await generateBillReceipt(payment[0]);
    } catch (error) {
        console.error('Error printing receipt:', error);
        showNotification('Failed to print receipt', 'error');
    }
}

// ========================================
// Print Receipt by Receipt Number
// ========================================
async function printBillReceiptByNumber(receiptNumber) {
    try {
        const payment = await runQuery(`
            SELECT bp.*, bt.name as billTypeName, bt.icon as billTypeIcon
            FROM bill_payments bp
            LEFT JOIN bill_types bt ON bp.billType = bt.id
            WHERE bp.receiptNumber = ?
        `, [receiptNumber]);

        if (!payment || payment.length === 0) {
            showNotification('Payment not found', 'error');
            return;
        }

        await generateBillReceipt(payment[0]);
    } catch (error) {
        console.error('Error printing receipt:', error);
        showNotification('Failed to print receipt', 'error');
    }
}

// ========================================
// Generate Bill Receipt HTML
// ========================================
async function generateBillReceipt(payment) {
    try {
        // Get company info
        const companyInfo = await runQuery('SELECT * FROM company_info WHERE id = 1');
        const company = companyInfo && companyInfo.length > 0 ? companyInfo[0] : {};

        const timestamp = new Date(payment.timestamp);
        
        let receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Bill Payment Receipt - ${payment.receiptNumber}</title>
                <style>
                    @media print {
                        body { margin: 0; }
                        @page { size: 80mm auto; margin: 0; }
                    }
                    body {
                        font-family: 'Courier New', monospace;
                        width: 80mm;
                        margin: 0 auto;
                        padding: 10px;
                        font-size: 12px;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px dashed #000;
                        padding-bottom: 10px;
                        margin-bottom: 15px;
                    }
                    .company-name {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .company-details {
                        font-size: 10px;
                        line-height: 1.4;
                    }
                    .receipt-title {
                        font-size: 16px;
                        font-weight: bold;
                        text-align: center;
                        margin: 15px 0;
                    }
                    .bill-icon {
                        font-size: 24px;
                        text-align: center;
                        margin: 10px 0;
                    }
                    .row {
                        display: flex;
                        justify-content: space-between;
                        margin: 5px 0;
                    }
                    .label {
                        font-weight: bold;
                    }
                    .amount-section {
                        border-top: 2px solid #000;
                        border-bottom: 2px solid #000;
                        padding: 10px 0;
                        margin: 15px 0;
                    }
                    .total {
                        font-size: 16px;
                        font-weight: bold;
                    }
                    .footer {
                        text-align: center;
                        border-top: 2px dashed #000;
                        padding-top: 10px;
                        margin-top: 15px;
                        font-size: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">${company.companyName || 'Ayn Beirut POS'}</div>
                    <div class="company-details">
                        ${company.phone ? `Tel: ${company.phone}<br>` : ''}
                        ${company.email ? `Email: ${company.email}<br>` : ''}
                        ${company.website ? `Web: ${company.website}<br>` : ''}
                        ${company.address ? `${company.address}<br>` : ''}
                        ${company.taxId ? `Tax ID: ${company.taxId}` : ''}
                    </div>
                </div>

                <div class="receipt-title">BILL PAYMENT RECEIPT</div>
                
                <div class="bill-icon">${payment.billTypeIcon || '📄'}</div>

                <div class="row">
                    <span class="label">Receipt #:</span>
                    <span>${payment.receiptNumber}</span>
                </div>
                <div class="row">
                    <span class="label">Date:</span>
                    <span>${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}</span>
                </div>
                <div class="row">
                    <span class="label">Bill Type:</span>
                    <span>${payment.billTypeName || 'Other'}</span>
                </div>
                <div class="row">
                    <span class="label">Bill Number:</span>
                    <span>${payment.billNumber}</span>
                </div>

                <div style="margin: 15px 0; border-top: 1px dashed #000; padding-top: 10px;">
                    <div class="row">
                        <span class="label">Customer:</span>
                        <span>${payment.customerName}</span>
                    </div>
                    ${payment.customerPhone ? `
                    <div class="row">
                        <span class="label">Phone:</span>
                        <span>${payment.customerPhone}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="amount-section">
                    <div class="row total">
                        <span>AMOUNT PAID:</span>
                        <span>$${payment.amount.toFixed(2)}</span>
                    </div>
                    <div class="row">
                        <span class="label">Payment Method:</span>
                        <span>${payment.paymentMethod}</span>
                    </div>
                </div>

                ${payment.notes ? `
                <div style="margin: 10px 0;">
                    <div class="label">Notes:</div>
                    <div>${payment.notes}</div>
                </div>
                ` : ''}

                <div class="footer">
                    <div>Thank you for your payment!</div>
                    <div style="margin-top: 5px;">Powered by Ayn Beirut POS</div>
                </div>
            </body>
            </html>
        `;

        // Check if running in Electron
        if (window.electronAPI && window.electronAPI.print) {
            // Use Electron's native print
            window.electronAPI.print(receiptHTML);
        } else {
            // Fallback to browser print for non-Electron environments
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(receiptHTML);
                printWindow.document.close();
                printWindow.onload = function() {
                    printWindow.print();
                };
            } else {
                alert('Please allow pop-ups to print receipts');
            }
        }
    } catch (error) {
        console.error('Error generating receipt:', error);
        showNotification('Failed to generate receipt', 'error');
    }
}

// ========================================
// View Bill Payment Details
// ========================================
async function viewBillDetails(paymentId) {
    try {
        const payment = await runQuery(`
            SELECT bp.*, bt.name as billTypeName, bt.icon as billTypeIcon
            FROM bill_payments bp
            LEFT JOIN bill_types bt ON bp.billType = bt.id
            WHERE bp.id = ?
        `, [paymentId]);

        if (!payment || payment.length === 0) {
            showNotification('Payment not found', 'error');
            return;
        }

        const p = payment[0];
        const timestamp = new Date(p.timestamp);

        alert(`Bill Payment Details
        
Receipt #: ${p.receiptNumber}
Bill Type: ${p.billTypeIcon || '📄'} ${p.billTypeName}
Bill Number: ${p.billNumber}

Customer: ${p.customerName}
Phone: ${p.customerPhone || 'N/A'}

Amount: $${p.amount.toFixed(2)}
Payment Method: ${p.paymentMethod}

Date: ${timestamp.toLocaleDateString()}
Time: ${timestamp.toLocaleTimeString()}

${p.notes ? `Notes: ${p.notes}` : ''}
        `);
    } catch (error) {
        console.error('Error viewing bill details:', error);
        showNotification('Failed to load bill details', 'error');
    }
}

// ========================================
// Export Bill Payments to CSV
// ========================================
async function exportBillPaymentsCSV() {
    try {
        const startDate = document.getElementById('bill-date-from')?.value || '';
        const endDate = document.getElementById('bill-date-to')?.value || '';

        const payments = await runQuery(`
            SELECT bp.*, bt.name as billTypeName
            FROM bill_payments bp
            LEFT JOIN bill_types bt ON bp.billType = bt.id
            WHERE DATE(bp.timestamp/1000, 'unixepoch') BETWEEN ? AND ?
            ORDER BY bp.timestamp DESC
        `, [startDate, endDate]);

        if (!payments || payments.length === 0) {
            showNotification('No data to export', 'warning');
            return;
        }

        let csv = 'Receipt Number,Date,Time,Bill Type,Bill Number,Service Provider,Contact Phone,Amount,Payment Method,Notes\n';
        
        payments.forEach(p => {
            const timestamp = new Date(p.timestamp);
            const date = timestamp.toLocaleDateString();
            const time = timestamp.toLocaleTimeString();
            
            csv += `"${p.receiptNumber}","${date}","${time}","${p.billTypeName || 'Other'}","${p.billNumber}","${p.customerName}","${p.customerPhone || ''}",${p.amount},"${p.paymentMethod}","${p.notes || ''}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bill-payments-${startDate}-${endDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        showNotification('Bill payments exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting bill payments:', error);
        showNotification('Failed to export bill payments', 'error');
    }
}

// ========================================
// Add to Sync Queue
// ========================================
async function addToSyncQueue(operation, tableName, data) {
    try {
        await runExec(`
            INSERT INTO sync_queue (operation, table_name, data, timestamp, synced)
            VALUES (?, ?, ?, ?, 0)
        `, [operation, tableName, JSON.stringify(data), Date.now()]);
    } catch (error) {
        console.error('Error adding to sync queue:', error);
    }
}

// ========================================
// Initialize Bill Payments Module
// ========================================
function initBillPayments() {
    console.log('Bill Payments module initialized');

    // Set up form submit handler
    const form = document.getElementById('bill-payment-form');
    if (form) {
        form.addEventListener('submit', saveBillPayment);
    }

    // Set up customer search with debounce
    const customerSearch = document.getElementById('bill-customer-search');
    if (customerSearch) {
        let searchTimeout;
        customerSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(searchPhonebookForBill, 300);
        });
    }

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.customer-search-container')) {
            const results = document.getElementById('customer-results');
            if (results) results.style.display = 'none';
        }
    });
}

// Export functions to window scope
window.loadBillPayments = loadBillPayments;
window.openNewBillPayment = openNewBillPayment;
window.saveBillPayment = saveBillPayment;
window.printBillReceipt = printBillReceipt;
window.viewBillDetails = viewBillDetails;
window.exportBillPaymentsCSV = exportBillPaymentsCSV;
window.selectBillCustomer = selectBillCustomer;
window.initBillPayments = initBillPayments;
