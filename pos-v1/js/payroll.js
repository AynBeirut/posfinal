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
    if (modal) modal.style.display = 'block';
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
    if (modal) modal.style.display = 'none';
}

// ===================================
// PAYMENT MANAGEMENT
// ===================================

function openPaymentsManagement() {
    loadPendingPayments();
    const modal = document.getElementById('payments-modal');
    if (modal) modal.style.display = 'block';
}

function closePaymentsManagement() {
    const modal = document.getElementById('payments-modal');
    if (modal) modal.style.display = 'none';
}

async function loadPendingPayments() {
    try {
        console.log('💰 Loading pending payments...');
        
        // Load formal payment records
        const paymentsResult = db.exec(`
            SELECT p.*, s.firstName, s.lastName, s.employeeCode
            FROM staff_payments p
            JOIN staff s ON p.staffId = s.id
            WHERE p.status IN ('pending', 'approved')
            ORDER BY p.periodEnd DESC
        `);
        
        let formalPayments = [];
        if (paymentsResult && paymentsResult[0]) {
            const columns = paymentsResult[0].columns;
            formalPayments = paymentsResult[0].values.map(row => {
                const payment = {};
                columns.forEach((col, index) => {
                    payment[col] = row[index];
                });
                return payment;
            });
        }
        console.log('💰 Formal payments found:', formalPayments.length);
        
        // First, check if isPaid column exists, if not add it
        try {
            const tableInfo = db.exec("PRAGMA table_info(staff_attendance)");
            const columns = tableInfo[0] ? tableInfo[0].values.map(row => row[1]) : [];
            
            if (!columns.includes('isPaid')) {
                console.log('⚠️ isPaid column missing, adding it...');
                db.exec("ALTER TABLE staff_attendance ADD COLUMN isPaid INTEGER DEFAULT 0");
                db.exec("ALTER TABLE staff_attendance ADD COLUMN paidAt INTEGER");
                db.exec("ALTER TABLE staff_attendance ADD COLUMN paidBy INTEGER");
                await saveDatabase();
                console.log('✅ Added isPaid column to staff_attendance table');
            }
        } catch (alterError) {
            console.log('ℹ️ Column check/add:', alterError.message);
        }
        
        // Load unpaid attendance earnings
        console.log('💰 Querying unpaid attendance...');
        const attendanceResult = db.exec(`
            SELECT 
                s.id as staffId,
                s.firstName,
                s.lastName,
                s.employeeCode,
                s.paymentType,
                s.hourlyRate,
                s.dailyRate,
                s.monthlySalary,
                SUM(a.totalHours) as totalHours,
                SUM(a.regularHours) as regularHours,
                SUM(a.overtimeHours) as overtimeHours,
                MIN(a.checkInTime) as firstCheckIn,
                MAX(a.checkOutTime) as lastCheckOut
            FROM staff s
            LEFT JOIN staff_attendance a ON s.id = a.staffId 
                AND a.status = 'present'
                AND a.checkOutTime IS NOT NULL
                AND (a.isPaid IS NULL OR a.isPaid = 0)
            WHERE s.isActive = 1
            GROUP BY s.id, s.firstName, s.lastName, s.employeeCode, 
                     s.paymentType, s.hourlyRate, s.dailyRate, s.monthlySalary
            HAVING totalHours > 0
        `);
        
        console.log('💰 Attendance query result:', attendanceResult);
        
        let unpaidAttendance = [];
        if (attendanceResult && attendanceResult[0]) {
            const columns = attendanceResult[0].columns;
            console.log('💰 Attendance columns:', columns);
            console.log('💰 Attendance rows:', attendanceResult[0].values.length);
            
            unpaidAttendance = attendanceResult[0].values.map(row => {
                const record = {};
                columns.forEach((col, index) => {
                    record[col] = row[index];
                });
                
                console.log('💰 Processing staff:', record.firstName, record.lastName, 'Hours:', record.totalHours);
                
                // Calculate earnings based on payment type
                let baseAmount = 0;
                let overtimeAmount = 0;
                const totalHours = parseFloat(record.totalHours) || 0;
                const regularHours = parseFloat(record.regularHours) || 0;
                const overtimeHours = parseFloat(record.overtimeHours) || 0;
                
                if (record.paymentType === 'hourly') {
                    const hourlyRate = parseFloat(record.hourlyRate) || 0;
                    baseAmount = regularHours * hourlyRate;
                    overtimeAmount = overtimeHours * hourlyRate * 1.5;
                } else if (record.paymentType === 'daily') {
                    const dailyRate = parseFloat(record.dailyRate) || 0;
                    const daysWorked = Math.ceil(totalHours / 8);
                    baseAmount = daysWorked * dailyRate;
                } else if (record.paymentType === 'monthly') {
                    const monthlySalary = parseFloat(record.monthlySalary) || 0;
                    const daysWorked = Math.ceil(totalHours / 8);
                    baseAmount = (monthlySalary / 22) * daysWorked;
                }
                
                const netAmount = baseAmount + overtimeAmount;
                
                console.log('💰 Calculated:', record.firstName, 'Base:', baseAmount, 'OT:', overtimeAmount, 'Net:', netAmount);
                
                // Get date range
                const firstDate = record.firstCheckIn ? new Date(record.firstCheckIn).toLocaleDateString() : 'N/A';
                const lastDate = record.lastCheckOut ? new Date(record.lastCheckOut).toLocaleDateString() : 'N/A';
                
                return {
                    id: `unpaid_${record.staffId}`,
                    staffId: record.staffId,
                    firstName: record.firstName,
                    lastName: record.lastName,
                    employeeCode: record.employeeCode,
                    paymentPeriod: `${firstDate} to ${lastDate}`,
                    baseAmount: baseAmount,
                    overtimeAmount: overtimeAmount,
                    bonusAmount: 0,
                    deductions: 0,
                    netAmount: netAmount,
                    status: 'unpaid',
                    totalHours: totalHours,
                    isAttendancePayment: true
                };
            });
        }
        
        console.log('💰 Unpaid attendance found:', unpaidAttendance.length);
        
        // Combine both lists
        const allPayments = [...unpaidAttendance, ...formalPayments];
        console.log('💰 Total payments to display:', allPayments.length);
        renderPaymentsList(allPayments);
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
                    ${payment.totalHours ? `<div>Hours: ${parseFloat(payment.totalHours).toFixed(2)}h</div>` : ''}
                    <div class="net-amount"><strong>Net: $${payment.netAmount.toFixed(2)}</strong></div>
                </div>
                <div class="payment-status status-${payment.status}">${payment.status.toUpperCase()}</div>
            </div>
            <div class="payment-actions">
                ${payment.status === 'unpaid' && payment.isAttendancePayment ? `
                    <button onclick="markAttendancePaid(${payment.staffId})" class="btn-primary">Mark as Paid</button>
                ` : ''}
                ${payment.status === 'pending' ? `
                    <button onclick="approvePayment(${payment.id})" class="btn-success">Approve</button>
                ` : ''}
                ${payment.status === 'approved' ? `
                    <button onclick="markPaymentPaid(${payment.id})" class="btn-primary">Mark as Paid</button>
                ` : ''}
                <button onclick="viewPaymentDetails('${payment.id}')" class="btn-secondary">Details</button>
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

async function markAttendancePaid(staffId) {
    try {
        const user = getCurrentUser ? getCurrentUser() : null;
        if (!user || user.role !== 'admin') {
            showNotification('Only admins can mark payments as paid', 'error');
            return;
        }
        
        // Update all unpaid attendance records for this staff member
        await runExec(`
            UPDATE staff_attendance SET
                isPaid = 1,
                paidAt = ?,
                paidBy = ?
            WHERE staffId = ? 
                AND status = 'present' 
                AND checkOutTime IS NOT NULL
                AND (isPaid IS NULL OR isPaid = 0)
        `, [Date.now(), user.id, staffId]);
        
        await saveDatabase();
        showNotification('Attendance marked as paid', 'success');
        loadPendingPayments();
        
        // Refresh balance if it's open
        if (typeof refreshBalanceDashboard === 'function') {
            refreshBalanceDashboard();
        }
    } catch (error) {
        console.error('Failed to mark attendance as paid:', error);
        showNotification('Failed to mark attendance as paid', 'error');
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
window.markAttendancePaid = markAttendancePaid;
window.viewPaymentDetails = viewPaymentDetails;
