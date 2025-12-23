// ===================================
// AYN BEIRUT POS - PAYROLL MANAGEMENT
// Salary calculations and payment tracking
// ===================================

// ===================================
// PAYROLL GENERATION
// ===================================

function openPayrollForm(staffId) {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) {
        showNotification('Staff member not found', 'error');
        return;
    }
    
    // Set current month as default period
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    document.getElementById('payroll-staff-id').value = staff.id;
    document.getElementById('payroll-staff-name').textContent = `${staff.firstName} ${staff.lastName}`;
    document.getElementById('payroll-period-start').valueAsDate = firstDay;
    document.getElementById('payroll-period-end').valueAsDate = lastDay;
    document.getElementById('payroll-bonus').value = '0';
    document.getElementById('payroll-deductions').value = '0';
    
    // Calculate initial values
    calculatePayrollPreview();
    
    const modal = document.getElementById('payroll-form-modal');
    if (modal) modal.classList.add('show');
}

async function calculatePayrollPreview() {
    const staffId = parseInt(document.getElementById('payroll-staff-id').value);
    const periodStart = document.getElementById('payroll-period-start').value;
    const periodEnd = document.getElementById('payroll-period-end').value;
    const bonus = parseFloat(document.getElementById('payroll-bonus').value) || 0;
    const deductions = parseFloat(document.getElementById('payroll-deductions').value) || 0;
    
    if (!staffId || !periodStart || !periodEnd) return;
    
    const salary = await calculateSalaryForPeriod(staffId, periodStart, periodEnd);
    
    document.getElementById('payroll-base-amount').textContent = salary.baseAmount.toFixed(2);
    document.getElementById('payroll-overtime-amount').textContent = salary.overtimeAmount.toFixed(2);
    document.getElementById('payroll-total-hours').textContent = salary.hours.total.toFixed(2);
    document.getElementById('payroll-regular-hours').textContent = salary.hours.regular.toFixed(2);
    document.getElementById('payroll-overtime-hours').textContent = salary.hours.overtime.toFixed(2);
    
    const netAmount = salary.baseAmount + salary.overtimeAmount + bonus - deductions;
    document.getElementById('payroll-net-amount').textContent = netAmount.toFixed(2);
}

async function handlePayrollSubmit(e) {
    e.preventDefault();
    
    const staffId = parseInt(document.getElementById('payroll-staff-id').value);
    const periodStart = document.getElementById('payroll-period-start').value;
    const periodEnd = document.getElementById('payroll-period-end').value;
    const bonus = parseFloat(document.getElementById('payroll-bonus').value) || 0;
    const deductions = parseFloat(document.getElementById('payroll-deductions').value) || 0;
    
    if (!staffId || !periodStart || !periodEnd) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const success = await generatePayroll(staffId, periodStart, periodEnd, bonus, deductions);
    if (success) {
        closePayrollForm();
        openPaymentsManagement();
    }
}

function closePayrollForm() {
    const modal = document.getElementById('payroll-form-modal');
    if (modal) modal.classList.remove('show');
}

// ===================================
// PAYMENT MANAGEMENT
// ===================================

function openPaymentsManagement() {
    loadPendingPayments();
    const modal = document.getElementById('payments-modal');
    if (modal) modal.classList.add('show');
}

function closePaymentsManagement() {
    const modal = document.getElementById('payments-modal');
    if (modal) modal.classList.remove('show');
}

async function loadPendingPayments() {
    try {
        const result = db.exec(`
            SELECT p.*, s.firstName, s.lastName, s.employeeCode
            FROM staff_payments p
            JOIN staff s ON p.staffId = s.id
            WHERE p.status IN ('pending', 'approved')
            ORDER BY p.periodEnd DESC
        `);
        
        if (!result || !result[0]) {
            renderPaymentsList([]);
            return;
        }
        
        const columns = result[0].columns;
        const payments = result[0].values.map(row => {
            const payment = {};
            columns.forEach((col, index) => {
                payment[col] = row[index];
            });
            return payment;
        });
        
        renderPaymentsList(payments);
    } catch (error) {
        console.error('Failed to load pending payments:', error);
        renderPaymentsList([]);
    }
}

function renderPaymentsList(payments) {
    const container = document.getElementById('payments-list');
    if (!container) return;
    
    if (payments.length === 0) {
        container.innerHTML = '<div class="empty-state">No pending payments</div>';
        return;
    }
    
    container.innerHTML = payments.map(payment => `
        <div class="payment-card" data-id="${payment.id}">
            <div class="payment-info">
                <div class="payment-staff">
                    <strong>${payment.firstName} ${payment.lastName}</strong>
                    <span class="employee-code">${payment.employeeCode}</span>
                </div>
                <div class="payment-period">${payment.paymentPeriod}</div>
                <div class="payment-amounts">
                    <div>Base: $${payment.baseAmount.toFixed(2)}</div>
                    ${payment.overtimeAmount > 0 ? `<div>Overtime: $${payment.overtimeAmount.toFixed(2)}</div>` : ''}
                    ${payment.bonusAmount > 0 ? `<div>Bonus: $${payment.bonusAmount.toFixed(2)}</div>` : ''}
                    ${payment.deductions > 0 ? `<div>Deductions: -$${payment.deductions.toFixed(2)}</div>` : ''}
                    <div class="net-amount"><strong>Net: $${payment.netAmount.toFixed(2)}</strong></div>
                </div>
                <div class="payment-status status-${payment.status}">${payment.status}</div>
            </div>
            <div class="payment-actions">
                ${payment.status === 'pending' ? `
                    <button onclick="approvePayment(${payment.id})" class="btn-success">Approve</button>
                ` : ''}
                ${payment.status === 'approved' ? `
                    <button onclick="markPaymentPaid(${payment.id})" class="btn-primary">Mark as Paid</button>
                ` : ''}
                <button onclick="viewPaymentDetails(${payment.id})" class="btn-secondary">Details</button>
            </div>
        </div>
    `).join('');
}

async function approvePayment(paymentId) {
    try {
        const user = getCurrentUser ? getCurrentUser() : null;
        if (!user || user.role !== 'admin') {
            showNotification('Only admins can approve payments', 'error');
            return;
        }
        
        await runExec(`
            UPDATE staff_payments SET
                status = 'approved',
                approvedBy = ?,
                approvedAt = ?
            WHERE id = ?
        `, [user.id, Date.now(), paymentId]);
        
        await saveDatabase();
        showNotification('Payment approved', 'success');
        loadPendingPayments();
    } catch (error) {
        console.error('Failed to approve payment:', error);
        showNotification('Failed to approve payment', 'error');
    }
}

async function markPaymentPaid(paymentId) {
    try {
        const user = getCurrentUser ? getCurrentUser() : null;
        if (!user || user.role !== 'admin') {
            showNotification('Only admins can mark payments as paid', 'error');
            return;
        }
        
        // Get payment details for recording the transaction
        const result = db.exec(`SELECT * FROM staff_payments WHERE id = ${paymentId}`);
        if (!result || !result[0] || !result[0].values.length) {
            showNotification('Payment not found', 'error');
            return;
        }
        
        const columns = result[0].columns;
        const payment = {};
        columns.forEach((col, index) => {
            payment[col] = result[0].values[0][index];
        });
        
        await runExec(`
            UPDATE staff_payments SET
                status = 'paid',
                paidAt = ?,
                paidBy = ?
            WHERE id = ?
        `, [Date.now(), user.id, paymentId]);
        
        await saveDatabase();
        showNotification('Payment marked as paid', 'success');
        loadPendingPayments();
        
        // Refresh balance if it's open
        if (typeof refreshBalanceDashboard === 'function') {
            refreshBalanceDashboard();
        }
    } catch (error) {
        console.error('Failed to mark payment as paid:', error);
        showNotification('Failed to mark payment as paid', 'error');
    }
}

async function viewPaymentDetails(paymentId) {
    // TODO: Show detailed payment information in a modal
    console.log('Viewing payment details:', paymentId);
}

// ===================================
// SALARY REPORTS
// ===================================

async function generateSalaryReport(startDate, endDate) {
    try {
        const result = db.exec(`
            SELECT 
                s.employeeCode,
                s.firstName,
                s.lastName,
                s.position,
                p.paymentPeriod,
                p.baseAmount,
                p.overtimeAmount,
                p.bonusAmount,
                p.deductions,
                p.netAmount,
                p.status
            FROM staff_payments p
            JOIN staff s ON p.staffId = s.id
            WHERE p.periodStart >= ${new Date(startDate).getTime()}
            AND p.periodEnd <= ${new Date(endDate).getTime()}
            ORDER BY s.employeeCode, p.periodEnd
        `);
        
        if (!result || !result[0]) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(row => {
            const record = {};
            columns.forEach((col, index) => {
                record[col] = row[index];
            });
            return record;
        });
    } catch (error) {
        console.error('Failed to generate salary report:', error);
        return [];
    }
}

// Export functions
window.openPayrollForm = openPayrollForm;
window.closePayrollForm = closePayrollForm;
window.calculatePayrollPreview = calculatePayrollPreview;
window.handlePayrollSubmit = handlePayrollSubmit;
window.openPaymentsManagement = openPaymentsManagement;
window.closePaymentsManagement = closePaymentsManagement;
window.approvePayment = approvePayment;
window.markPaymentPaid = markPaymentPaid;
window.viewPaymentDetails = viewPaymentDetails;
