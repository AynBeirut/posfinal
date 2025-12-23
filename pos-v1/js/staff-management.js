// ===================================
// AYN BEIRUT POS - STAFF MANAGEMENT
// Employee payroll and attendance tracking
// ===================================

console.log('👥👥👥 STAFF-MANAGEMENT.JS FILE LOADED 👥👥👥');
console.log('%c STAFF MANAGEMENT SCRIPT IS LOADING! ', 'background: #4CAF50; color: white; font-size: 20px; padding: 10px;');

let staffList = [];
let attendanceRecords = [];
let currentStaffMember = null;

// ===================================
// INITIALIZATION
// ===================================

async function initStaffManagement() {
    try {
        console.log('👥 Initializing staff management...');
        
        // Check access permissions
        const user = getCurrentUser ? getCurrentUser() : null;
        console.log('👥 Current user:', user);
        
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            console.warn('⚠️ Access denied: Staff management requires admin or manager role');
            return;
        }
        
        // Load staff data
        staffList = await loadAllStaff();
        console.log('👥 Loaded staff list:', staffList.length, 'employees');
        
        // Setup UI event listeners with multiple retries to ensure DOM is ready
        let retries = 0;
        const maxRetries = 5;
        
        const trySetup = () => {
            const staffBtn = document.getElementById('staff-btn');
            console.log(`👥 Attempt ${retries + 1}: Staff button element:`, staffBtn);
            
            if (staffBtn) {
                setupStaffUI();
                console.log('✅ Staff button found and listener attached');
            } else if (retries < maxRetries) {
                retries++;
                console.warn(`⚠️ Staff button not found, retrying... (${retries}/${maxRetries})`);
                setTimeout(trySetup, 200);
            } else {
                console.error('❌ Staff button not found in DOM after all retries');
            }
        };
        
        setTimeout(trySetup, 100);
        
        console.log(`✅ Staff management initialized with ${staffList.length} employees`);
    } catch (error) {
        console.error('❌ Failed to initialize staff management:', error);
    }
}

// ===================================
// DATABASE OPERATIONS
// ===================================

async function loadAllStaff() {
    try {
        const result = db.exec('SELECT * FROM staff ORDER BY firstName, lastName');
        if (!result || !result[0]) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(row => {
            const staff = {};
            columns.forEach((col, index) => {
                staff[col] = row[index];
            });
            return staff;
        });
    } catch (error) {
        console.error('Failed to load staff:', error);
        return [];
    }
}

async function saveStaff(staffData) {
    try {
        console.log('💾 Saving staff member:', staffData);
        
        const timestamp = Date.now();
        
        if (staffData.id) {
            // Update existing
            await runExec(`
                UPDATE staff SET
                    firstName = ?,
                    lastName = ?,
                    phone = ?,
                    email = ?,
                    position = ?,
                    department = ?,
                    paymentType = ?,
                    monthlySalary = ?,
                    dailyRate = ?,
                    hourlyRate = ?,
                    overtimeRate = ?,
                    bankAccount = ?,
                    nationalId = ?,
                    address = ?,
                    emergencyContact = ?,
                    emergencyPhone = ?,
                    updatedAt = ?,
                    notes = ?
                WHERE id = ?
            `, [
                staffData.firstName,
                staffData.lastName,
                staffData.phone || null,
                staffData.email || null,
                staffData.position,
                staffData.department || null,
                staffData.paymentType,
                staffData.monthlySalary || 0,
                staffData.dailyRate || 0,
                staffData.hourlyRate || 0,
                staffData.overtimeRate || 0,
                staffData.bankAccount || null,
                staffData.nationalId || null,
                staffData.address || null,
                staffData.emergencyContact || null,
                staffData.emergencyPhone || null,
                timestamp,
                staffData.notes || null,
                staffData.id
            ]);
        } else {
            // Insert new
            const employeeCode = await generateEmployeeCode();
            await runExec(`
                INSERT INTO staff (
                    employeeCode, firstName, lastName, phone, email,
                    position, department, hireDate, paymentType,
                    monthlySalary, dailyRate, hourlyRate, overtimeRate,
                    bankAccount, nationalId, address, emergencyContact,
                    emergencyPhone, isActive, createdAt, updatedAt, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                employeeCode,
                staffData.firstName,
                staffData.lastName,
                staffData.phone || null,
                staffData.email || null,
                staffData.position,
                staffData.department || null,
                timestamp,
                staffData.paymentType,
                staffData.monthlySalary || 0,
                staffData.dailyRate || 0,
                staffData.hourlyRate || 0,
                staffData.overtimeRate || 0,
                staffData.bankAccount || null,
                staffData.nationalId || null,
                staffData.address || null,
                staffData.emergencyContact || null,
                staffData.emergencyPhone || null,
                1, // isActive
                timestamp,
                timestamp,
                staffData.notes || null
            ]);
        }
        
        await saveDatabase();
        staffList = await loadAllStaff();
        
        showNotification(staffData.id ? 'Staff member updated successfully' : 'Staff member added successfully', 'success');
        return true;
    } catch (error) {
        console.error('Failed to save staff:', error);
        showNotification('Failed to save staff member: ' + error.message, 'error');
        return false;
    }
}

async function generateEmployeeCode() {
    const result = db.exec('SELECT COUNT(*) as count FROM staff');
    const count = result[0]?.values[0]?.[0] || 0;
    return `EMP${String(count + 1).padStart(4, '0')}`;
}

async function saveAttendance(attendanceData) {
    try {
        console.log('📅 Saving attendance:', attendanceData);
        
        const timestamp = Date.now();
        
        // Check if attendance already exists for this staff member on this date
        const existing = db.exec(`
            SELECT id FROM staff_attendance 
            WHERE staffId = ${attendanceData.staffId} 
            AND attendanceDate = '${attendanceData.date}'
        `);
        
        if (existing && existing[0] && existing[0].values.length > 0) {
            // Update existing
            await runExec(`
                UPDATE staff_attendance SET
                    checkInTime = ?,
                    checkOutTime = ?,
                    totalHours = ?,
                    regularHours = ?,
                    overtimeHours = ?,
                    status = ?,
                    approvalStatus = ?,
                    approvedBy = ?,
                    approvedAt = ?,
                    notes = ?
                WHERE staffId = ? AND attendanceDate = ?
            `, [
                attendanceData.checkInTime || null,
                attendanceData.checkOutTime || null,
                attendanceData.totalHours || 0,
                attendanceData.regularHours || 0,
                attendanceData.overtimeHours || 0,
                attendanceData.status,
                attendanceData.approvalStatus || 'approved',
                attendanceData.approvedBy || null,
                attendanceData.approvedAt || timestamp,
                attendanceData.notes || null,
                attendanceData.staffId,
                attendanceData.date
            ]);
        } else {
            // Insert new
            await runExec(`
                INSERT INTO staff_attendance (
                    staffId, attendanceDate, checkInTime, checkOutTime,
                    totalHours, regularHours, overtimeHours, status,
                    approvalStatus, approvedBy, approvedAt, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                attendanceData.staffId,
                attendanceData.date,
                attendanceData.checkInTime || null,
                attendanceData.checkOutTime || null,
                attendanceData.totalHours || 0,
                attendanceData.regularHours || 0,
                attendanceData.overtimeHours || 0,
                attendanceData.status,
                attendanceData.approvalStatus || 'approved',
                attendanceData.approvedBy || null,
                attendanceData.approvedAt || timestamp,
                attendanceData.notes || null
            ]);
        }
        
        await saveDatabase();
        showNotification('Attendance recorded successfully', 'success');
        return true;
    } catch (error) {
        console.error('Failed to save attendance:', error);
        showNotification('Failed to save attendance: ' + error.message, 'error');
        return false;
    }
}

// ===================================
// SALARY CALCULATIONS
// ===================================

function calculateHourlyRate(staff) {
    // Convert any salary type to hourly rate for calculations
    switch (staff.paymentType) {
        case 'monthly':
            return staff.monthlySalary / 160; // Assume 160 hours/month
        case 'daily':
            return staff.dailyRate / 8; // Assume 8 hours/day
        case 'hourly':
            return staff.hourlyRate;
        default:
            return 0;
    }
}

async function calculateSalaryForPeriod(staffId, periodStart, periodEnd) {
    try {
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) throw new Error('Staff member not found');
        
        // Get attendance for period
        const result = db.exec(`
            SELECT SUM(totalHours) as totalHours, SUM(overtimeHours) as overtimeHours
            FROM staff_attendance
            WHERE staffId = ${staffId}
            AND attendanceDate >= '${periodStart}'
            AND attendanceDate <= '${periodEnd}'
            AND status != 'absent'
            AND approvalStatus = 'approved'
        `);
        
        const totalHours = result[0]?.values[0]?.[0] || 0;
        const overtimeHours = result[0]?.values[0]?.[1] || 0;
        const regularHours = totalHours - overtimeHours;
        
        let baseAmount = 0;
        let overtimeAmount = 0;
        
        switch (staff.paymentType) {
            case 'monthly':
                // Fixed monthly salary regardless of hours
                baseAmount = staff.monthlySalary;
                overtimeAmount = overtimeHours * staff.overtimeRate;
                break;
            case 'daily':
                // Count working days
                const days = db.exec(`
                    SELECT COUNT(*) as days
                    FROM staff_attendance
                    WHERE staffId = ${staffId}
                    AND attendanceDate >= '${periodStart}'
                    AND attendanceDate <= '${periodEnd}'
                    AND status NOT IN ('absent', 'holiday')
                    AND approvalStatus = 'approved'
                `);
                const workingDays = days[0]?.values[0]?.[0] || 0;
                baseAmount = workingDays * staff.dailyRate;
                overtimeAmount = overtimeHours * staff.overtimeRate;
                break;
            case 'hourly':
                baseAmount = regularHours * staff.hourlyRate;
                overtimeAmount = overtimeHours * staff.overtimeRate;
                break;
        }
        
        return {
            baseAmount,
            overtimeAmount,
            totalAmount: baseAmount + overtimeAmount,
            hours: { total: totalHours, regular: regularHours, overtime: overtimeHours }
        };
    } catch (error) {
        console.error('Failed to calculate salary:', error);
        return { baseAmount: 0, overtimeAmount: 0, totalAmount: 0, hours: { total: 0, regular: 0, overtime: 0 } };
    }
}

async function generatePayroll(staffId, periodStart, periodEnd, bonus = 0, deductions = 0) {
    try {
        const user = getCurrentUser ? getCurrentUser() : null;
        const salary = await calculateSalaryForPeriod(staffId, periodStart, periodEnd);
        
        const totalAmount = salary.totalAmount + bonus - deductions;
        
        await runExec(`
            INSERT INTO staff_payments (
                staffId, paymentType, paymentPeriod, periodStart, periodEnd,
                baseAmount, overtimeAmount, bonusAmount, deductions, netAmount,
                status, approvalRequired, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            staffId,
            'salary',
            `${periodStart} to ${periodEnd}`,
            new Date(periodStart).getTime(),
            new Date(periodEnd).getTime(),
            salary.baseAmount,
            salary.overtimeAmount,
            bonus,
            deductions,
            totalAmount,
            'pending',
            1,
            `Calculated: ${salary.hours.total} total hours (${salary.hours.regular} regular + ${salary.hours.overtime} OT)`
        ]);
        
        await saveDatabase();
        showNotification('Payroll generated successfully', 'success');
        return true;
    } catch (error) {
        console.error('Failed to generate payroll:', error);
        showNotification('Failed to generate payroll: ' + error.message, 'error');
        return false;
    }
}

// ===================================
// UI FUNCTIONS
// ===================================

function setupStaffUI() {
    console.log('👥 setupStaffUI() called');
    
    const staffBtn = document.getElementById('staff-btn');
    if (!staffBtn) {
        console.error('❌ Staff button element not found in setupStaffUI');
        return;
    }
    
    console.log('👥 Staff button found:', staffBtn);
    console.log('👥 Staff button visible:', staffBtn.offsetParent !== null);
    console.log('👥 Staff button display:', window.getComputedStyle(staffBtn).display);
    
    // Use simple onclick handler
    staffBtn.onclick = function(e) {
        alert('STAFF BUTTON WAS CLICKED!');
        console.log('%c STAFF BUTTON CLICKED! ', 'background: red; color: white; font-size: 30px; padding: 20px;');
        console.log('👥👥👥 STAFF BUTTON CLICKED! 👥👥👥');
        e.preventDefault();
        e.stopPropagation();
        openStaffManagement();
        return false;
    };
    
    // Test the handler immediately
    console.log('👥 Testing if onclick is set:', typeof staffBtn.onclick);
    console.log('✅ Staff button click handler attached');
    
    // Setup other UI elements
    const addStaffBtn = document.getElementById('add-staff-btn');
    if (addStaffBtn) {
        addStaffBtn.onclick = () => openStaffForm();
        console.log('✅ Add staff button listener attached');
    }
    
    const staffForm = document.getElementById('staff-form');
    if (staffForm) {
        staffForm.onsubmit = handleStaffSubmit;
        console.log('✅ Staff form submit handler attached');
    }
    
    console.log('%c ALL STAFF UI SETUP COMPLETE ', 'background: green; color: white; font-size: 16px; padding: 10px;');
}

function openStaffManagement() {
    console.log('👥 Opening staff management modal...');
    const modal = document.getElementById('staff-modal');
    if (modal) {
        modal.style.display = 'block';
        renderStaffList();
        renderPendingApprovals();
        loadAttendanceSummary();
        console.log('✅ Staff management modal opened');
    } else {
        console.error('❌ staff-modal element not found');
    }
}

function closeStaffManagement() {
    console.log('👥 Closing staff management modal...');
    const modal = document.getElementById('staff-modal');
    if (modal) {
        modal.style.display = 'none';
        console.log('✅ Staff management modal closed');
    }
}

function openStaffForm(staff = null) {
    currentStaffMember = staff;
    const form = document.getElementById('staff-form');
    const modal = document.getElementById('staff-form-modal');
    
    if (staff) {
        // Edit mode
        document.getElementById('staff-id').value = staff.id;
        document.getElementById('staff-first-name').value = staff.firstName;
        document.getElementById('staff-last-name').value = staff.lastName;
        document.getElementById('staff-phone').value = staff.phone || '';
        document.getElementById('staff-email').value = staff.email || '';
        document.getElementById('staff-position').value = staff.position;
        document.getElementById('staff-payment-type').value = staff.paymentType;
        document.getElementById('staff-monthly-salary').value = staff.monthlySalary || '';
        document.getElementById('staff-daily-rate').value = staff.dailyRate || '';
        document.getElementById('staff-hourly-rate').value = staff.hourlyRate || '';
        document.getElementById('staff-overtime-rate').value = staff.overtimeRate || '';
        document.getElementById('staff-notes').value = staff.notes || '';
        
        document.getElementById('staff-form-title').textContent = 'Edit Staff Member';
        document.getElementById('staff-submit-btn').textContent = 'Update Staff';
    } else {
        // Add mode
        form.reset();
        document.getElementById('staff-form-title').textContent = 'Add New Staff Member';
        document.getElementById('staff-submit-btn').textContent = 'Add Staff';
    }
    
    updateSalaryFields();
    if (modal) modal.style.display = 'block';
}

function updateSalaryFields() {
    const paymentType = document.getElementById('staff-payment-type').value;
    document.getElementById('monthly-salary-group').style.display = paymentType === 'monthly' ? 'block' : 'none';
    document.getElementById('daily-rate-group').style.display = paymentType === 'daily' ? 'block' : 'none';
    document.getElementById('hourly-rate-group').style.display = paymentType === 'hourly' ? 'block' : 'none';
}

async function handleStaffSubmit(e) {
    e.preventDefault();
    
    const staffData = {
        id: document.getElementById('staff-id').value || null,
        firstName: document.getElementById('staff-first-name').value.trim(),
        lastName: document.getElementById('staff-last-name').value.trim(),
        phone: document.getElementById('staff-phone').value.trim(),
        email: document.getElementById('staff-email').value.trim(),
        position: document.getElementById('staff-position').value,
        paymentType: document.getElementById('staff-payment-type').value,
        monthlySalary: parseFloat(document.getElementById('staff-monthly-salary').value) || 0,
        dailyRate: parseFloat(document.getElementById('staff-daily-rate').value) || 0,
        hourlyRate: parseFloat(document.getElementById('staff-hourly-rate').value) || 0,
        overtimeRate: parseFloat(document.getElementById('staff-overtime-rate').value) || 0,
        notes: document.getElementById('staff-notes').value.trim()
    };
    
    if (!staffData.firstName || !staffData.lastName) {
        showNotification('First name and last name are required', 'error');
        return;
    }
    
    const success = await saveStaff(staffData);
    if (success) {
        closeStaffForm();
        renderStaffList();
    }
}

function closeStaffForm() {
    const modal = document.getElementById('staff-form-modal');
    if (modal) modal.style.display = 'none';
    currentStaffMember = null;
}

function renderStaffList() {
    const container = document.getElementById('staff-list');
    if (!container) return;
    
    if (staffList.length === 0) {
        container.innerHTML = '<div class="empty-state">No staff members found. Click "Add New Staff" to get started.</div>';
        return;
    }
    
    const activeStaff = staffList.filter(s => s.isActive);
    
    container.innerHTML = activeStaff.map(staff => `
        <div class="staff-card" data-id="${staff.id}">
            <div class="staff-info">
                <div class="staff-name">${staff.firstName} ${staff.lastName}</div>
                <div class="staff-code">${staff.employeeCode}</div>
                <div class="staff-position">${staff.position}</div>
                <div class="staff-salary">
                    ${staff.paymentType === 'monthly' ? `$${staff.monthlySalary}/month` : 
                      staff.paymentType === 'daily' ? `$${staff.dailyRate}/day` : 
                      `$${staff.hourlyRate}/hour`}
                </div>
            </div>
            <div class="staff-actions">
                <button onclick="openAttendanceForm(${staff.id})" class="btn-icon" title="Record Attendance">📅</button>
                <button onclick="openPayrollForm(${staff.id})" class="btn-icon" title="Generate Payroll">💰</button>
                <button onclick="openStaffForm(staffList.find(s => s.id === ${staff.id}))" class="btn-icon" title="Edit">✏️</button>
            </div>
        </div>
    `).join('');
}

function renderPendingApprovals() {
    // TODO: Implement pending attendance approvals list
    console.log('📋 Rendering pending approvals...');
}

function loadAttendanceSummary() {
    // TODO: Implement attendance summary for current period
    console.log('📊 Loading attendance summary...');
}

// Export functions for global access
window.initStaffManagement = initStaffManagement;
window.openStaffManagement = openStaffManagement;
window.closeStaffManagement = closeStaffManagement;
window.openStaffForm = openStaffForm;
window.closeStaffForm = closeStaffForm;
window.updateSalaryFields = updateSalaryFields;

// Add manual test function
window.testStaffButton = function() {
    console.log('=== TESTING STAFF BUTTON ===');
    const btn = document.getElementById('staff-btn');
    console.log('Button exists:', !!btn);
    console.log('Button element:', btn);
    console.log('Button onclick:', btn ? btn.onclick : 'no button');
    console.log('Button visible:', btn ? btn.offsetParent !== null : 'no button');
    console.log('Button display:', btn ? window.getComputedStyle(btn).display : 'no button');
    if (btn) {
        console.log('Manually triggering click...');
        btn.click();
    }
};

console.log('%c testStaffButton() function is available! Call it from console. ', 'background: blue; color: white; padding: 10px;');
