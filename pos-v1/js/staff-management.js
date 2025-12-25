// ===================================
// AYN BEIRUT POS - STAFF MANAGEMENT
// Employee payroll and attendance tracking
// ===================================

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
        console.log('💰 Calculating salary for staff', staffId, 'from', periodStart, 'to', periodEnd);
        
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) throw new Error('Staff member not found');
        
        console.log('💰 Staff member:', staff.firstName, staff.lastName, '- Payment type:', staff.paymentType);
        
        // Get attendance for period - removed approvalStatus requirement
        const query = `
            SELECT SUM(totalHours) as totalHours, SUM(overtimeHours) as overtimeHours
            FROM staff_attendance
            WHERE staffId = ${staffId}
            AND attendanceDate >= '${periodStart}'
            AND attendanceDate <= '${periodEnd}'
            AND status != 'absent'
        `;
        
        console.log('💰 Query:', query);
        const result = db.exec(query);
        
        const totalHours = result && result[0] && result[0].values[0] ? (parseFloat(result[0].values[0][0]) || 0) : 0;
        const overtimeHours = result && result[0] && result[0].values[0] ? (parseFloat(result[0].values[0][1]) || 0) : 0;
        const regularHours = totalHours - overtimeHours;
        
        console.log('💰 Hours found - Total:', totalHours, 'Regular:', regularHours, 'Overtime:', overtimeHours);
        
        let baseAmount = 0;
        let overtimeAmount = 0;
        
        switch (staff.paymentType) {
            case 'monthly':
                // Fixed monthly salary regardless of hours
                baseAmount = parseFloat(staff.monthlySalary) || 0;
                overtimeAmount = overtimeHours * (parseFloat(staff.overtimeRate) || 0);
                console.log('💰 Monthly: Base=', baseAmount, 'OT=', overtimeAmount);
                break;
            case 'daily':
                // Count working days - removed approvalStatus requirement
                const daysQuery = `
                    SELECT COUNT(*) as days
                    FROM staff_attendance
                    WHERE staffId = ${staffId}
                    AND attendanceDate >= '${periodStart}'
                    AND attendanceDate <= '${periodEnd}'
                    AND status NOT IN ('absent', 'holiday')
                `;
                const days = db.exec(daysQuery);
                const workingDays = days && days[0] && days[0].values[0] ? (parseFloat(days[0].values[0][0]) || 0) : 0;
                baseAmount = workingDays * (parseFloat(staff.dailyRate) || 0);
                overtimeAmount = overtimeHours * (parseFloat(staff.overtimeRate) || 0);
                console.log('💰 Daily: Days=', workingDays, 'Rate=', staff.dailyRate, 'Base=', baseAmount, 'OT=', overtimeAmount);
                break;
            case 'hourly':
                const hourlyRate = parseFloat(staff.hourlyRate) || 0;
                const otRate = parseFloat(staff.overtimeRate) || (hourlyRate * 1.5);
                baseAmount = regularHours * hourlyRate;
                overtimeAmount = overtimeHours * otRate;
                console.log('💰 Hourly: Rate=', hourlyRate, 'OT Rate=', otRate, 'Base=', baseAmount, 'OT=', overtimeAmount);
                break;
        }
        
        const totalAmount = baseAmount + overtimeAmount;
        console.log('💰 Final calculation - Base:', baseAmount, 'OT:', overtimeAmount, 'Total:', totalAmount);
        
        return {
            baseAmount,
            overtimeAmount,
            totalAmount,
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
        console.log('%c STAFF BUTTON CLICKED! ', 'background: green; color: white; font-size: 20px; padding: 10px;');
        console.log('👥👥👥 Opening Staff Management 👥👥👥');
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

// ===================================
// DAILY ATTENDANCE OVERVIEW
// ===================================

function openDailyAttendance() {
    console.log('📅 Opening daily attendance overview...');
    const section = document.getElementById('daily-attendance-section');
    const staffListSection = document.getElementById('staff-list');
    
    if (section && staffListSection) {
        // Show attendance view
        section.style.display = 'block';
        staffListSection.style.display = 'none';
        
        // Set today's date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('attendance-overview-date').value = today;
        
        loadDailyAttendance();
    }
}

function closeDailyAttendance() {
    const section = document.getElementById('daily-attendance-section');
    const staffListSection = document.getElementById('staff-list');
    
    if (section && staffListSection) {
        section.style.display = 'none';
        staffListSection.style.display = 'block';
    }
}

async function loadDailyAttendance() {
    const dateInput = document.getElementById('attendance-overview-date');
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    
    console.log('📅 Loading attendance for date:', selectedDate);
    
    try {
        // Load staff directly from database to ensure we have current data
        const activeStaff = await loadAllStaff();
        const activeStaffFiltered = activeStaff.filter(s => s.isActive);
        
        console.log('📅 Found', activeStaffFiltered.length, 'active staff members');
        
        if (activeStaffFiltered.length === 0) {
            const container = document.getElementById('daily-attendance-list');
            if (container) {
                container.innerHTML = '<div class="empty-state">No staff members found. Please add staff first by clicking "← Back to Staff List" then "➕ Add New Staff".</div>';
            }
            return;
        }
        
        // Get attendance records for the selected date
        const attendanceQuery = `
            SELECT * FROM staff_attendance 
            WHERE attendanceDate = '${selectedDate}'
        `;
        
        const result = db.exec(attendanceQuery);
        const attendanceRecords = [];
        
        if (result && result[0]) {
            const columns = result[0].columns;
            result[0].values.forEach(row => {
                const record = {};
                columns.forEach((col, index) => {
                    record[col] = row[index];
                });
                attendanceRecords.push(record);
            });
        }
        
        console.log('📅 Found', attendanceRecords.length, 'attendance records');
        
        renderDailyAttendanceList(activeStaffFiltered, attendanceRecords, selectedDate);
        renderAttendanceSummary(activeStaffFiltered, attendanceRecords);
        
    } catch (error) {
        console.error('Failed to load daily attendance:', error);
        showNotification('Failed to load attendance data', 'error');
    }
}

function renderDailyAttendanceList(staff, attendanceRecords, selectedDate) {
    const container = document.getElementById('daily-attendance-list');
    if (!container) return;
    
    if (staff.length === 0) {
        container.innerHTML = '<div class="empty-state">No staff members found. Please add staff first.</div>';
        return;
    }
    
    // Create map of staff ID to attendance record
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
        attendanceMap[record.staffId] = record;
    });
    
    // Remove duplicates by using both name and employee code
    const uniqueStaff = [];
    const seenKeys = new Set();
    
    staff.forEach(member => {
        // Create unique key using name (case insensitive) to catch duplicates
        const key = `${member.firstName}_${member.lastName}`.toLowerCase().trim();
        
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueStaff.push(member);
        }
    });
    
    console.log('📅 Original staff count:', staff.length, 'Unique staff count:', uniqueStaff.length);
    
    container.innerHTML = uniqueStaff.map(member => {
        const attendance = attendanceMap[member.id];
        const isPresent = attendance && attendance.checkInTime;
        const isCheckedOut = attendance && attendance.checkOutTime;
        const checkInTime = attendance && attendance.checkInTime ? attendance.checkInTime.substring(0, 5) : null;
        const checkOutTime = attendance && attendance.checkOutTime ? attendance.checkOutTime.substring(0, 5) : null;
        const totalHours = attendance ? (parseFloat(attendance.totalHours) || 0).toFixed(2) : '0.00';
        
        // Calculate earnings based on payment type
        let earnings = 0;
        if (attendance && parseFloat(totalHours) > 0) {
            if (member.paymentType === 'hourly') {
                earnings = parseFloat(totalHours) * (parseFloat(member.hourlyRate) || 0);
            } else if (member.paymentType === 'daily') {
                earnings = parseFloat(member.dailyRate) || 0;
            } else if (member.paymentType === 'monthly') {
                earnings = (parseFloat(member.monthlySalary) || 0) / 22;
            }
        }
        
        return `
            <div class="simple-attendance-row" data-staff-id="${member.id}">
                <div class="staff-info-simple">
                    <div class="staff-name-simple">${member.firstName} ${member.lastName}</div>
                    <div class="staff-position-simple">${member.position} • ${member.paymentType === 'hourly' ? '$'+member.hourlyRate+'/hr' : member.paymentType === 'daily' ? '$'+member.dailyRate+'/day' : '$'+member.monthlySalary+'/mo'}</div>
                </div>
                <div class="attendance-status-simple">
                    ${!isPresent ? `
                        <button onclick="quickCheckInSimple(${member.id}, '${selectedDate}')" class="btn-check-in" title="Check In">
                            ✓ Check In
                        </button>
                    ` : isCheckedOut ? `
                        <div class="status-badge completed">✓ Completed</div>
                        <div class="time-info">${checkInTime} - ${checkOutTime} (${totalHours}h)</div>
                        <div class="earnings-info">$${earnings.toFixed(2)}</div>
                    ` : `
                        <div class="status-badge checked-in">⏱️ Working</div>
                        <div class="time-info">In: ${checkInTime}</div>
                        <button onclick="quickCheckOut(${member.id}, '${selectedDate}')" class="btn-check-out" title="Check Out">
                            ⏱️ Check Out
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function renderAttendanceSummary(staff, attendanceRecords) {
    const container = document.getElementById('attendance-summary');
    if (!container) return;
    
    console.log('📊 Rendering summary for:', staff.length, 'staff members');
    console.log('📊 Attendance records:', attendanceRecords.length);
    console.log('📊 Record statuses:', attendanceRecords.map(r => r.status));
    
    const total = staff.length;
    // Handle both uppercase and lowercase status values
    const present = attendanceRecords.filter(r => r.status && r.status.toLowerCase() === 'present').length;
    const late = attendanceRecords.filter(r => r.status && r.status.toLowerCase() === 'late').length;
    const absent = attendanceRecords.filter(r => r.status && r.status.toLowerCase() === 'absent').length;
    const onLeave = attendanceRecords.filter(r => r.status && (r.status.toLowerCase() === 'on-leave' || r.status.toLowerCase() === 'leave')).length;
    const notRecorded = total - attendanceRecords.length;
    
    const totalHours = attendanceRecords.reduce((sum, r) => sum + (parseFloat(r.totalHours) || 0), 0);
    const avgHours = attendanceRecords.length > 0 ? (totalHours / attendanceRecords.length).toFixed(2) : '0.00';
    
    // Calculate total earnings for the day
    let totalEarnings = 0;
    attendanceRecords.forEach(record => {
        const member = staff.find(s => s.id === record.staffId);
        if (member && parseFloat(record.totalHours) > 0) {
            if (member.paymentType === 'hourly') {
                const regularRate = parseFloat(member.hourlyRate) || 0;
                const overtimeRate = parseFloat(member.overtimeRate) || regularRate * 1.5;
                const regularHours = Math.min(parseFloat(record.totalHours), 8);
                const overtimeHours = Math.max(0, parseFloat(record.totalHours) - 8);
                totalEarnings += (regularHours * regularRate) + (overtimeHours * overtimeRate);
            } else if (member.paymentType === 'daily') {
                totalEarnings += parseFloat(member.dailyRate) || 0;
            } else if (member.paymentType === 'monthly') {
                totalEarnings += (parseFloat(member.monthlySalary) || 0) / 22;
            }
        }
    });
    
    console.log('📊 Summary counts - Total:', total, 'Present:', present, 'Late:', late, 'Absent:', absent, 'Leave:', onLeave, 'Not Recorded:', notRecorded);
    console.log('💰 Total Earnings:', totalEarnings.toFixed(2));
    
    container.innerHTML = `
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-label">Total Staff</div>
                <div class="summary-value">${total}</div>
            </div>
            <div class="summary-card summary-present">
                <div class="summary-label">Present</div>
                <div class="summary-value">${present}</div>
            </div>
            <div class="summary-card summary-late">
                <div class="summary-label">Late</div>
                <div class="summary-value">${late}</div>
            </div>
            <div class="summary-card summary-absent">
                <div class="summary-label">Absent</div>
                <div class="summary-value">${absent}</div>
            </div>
            <div class="summary-card summary-leave">
                <div class="summary-label">On Leave</div>
                <div class="summary-value">${onLeave}</div>
            </div>
            <div class="summary-card summary-pending">
                <div class="summary-label">Not Recorded</div>
                <div class="summary-value">${notRecorded}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Hours</div>
                <div class="summary-value">${totalHours.toFixed(2)}h</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Avg Hours</div>
                <div class="summary-value">${avgHours}h</div>
            </div>
            <div class="summary-card summary-earnings">
                <div class="summary-label">💰 Total Earnings</div>
                <div class="summary-value">$${totalEarnings.toFixed(2)}</div>
            </div>
        </div>
    `;
}

async function quickCheckIn(staffId, date) {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) {
        showNotification('Staff member not found', 'error');
        return;
    }
    
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM format
    
    const attendanceData = {
        staffId: staffId,
        date: date,
        status: 'present',
        checkInTime: currentTime,
        checkOutTime: null,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        notes: 'Quick check-in'
    };
    
    const success = await saveAttendance(attendanceData);
    if (success) {
        showNotification(`${staff.firstName} ${staff.lastName} checked in at ${currentTime}`, 'success');
        loadDailyAttendance(); // Refresh the list
    }
}

async function quickCheckInSimple(staffId, date) {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) {
        showNotification('Staff member not found', 'error');
        return;
    }
    
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 8); // HH:MM:SS format
    
    const attendanceData = {
        staffId: staffId,
        date: date,
        status: 'present',
        checkInTime: currentTime,
        checkOutTime: null,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        notes: 'Check in'
    };
    
    const success = await saveAttendance(attendanceData);
    if (success) {
        showNotification(`✓ ${staff.firstName} checked in`, 'success');
        loadDailyAttendance();
    }
}

async function quickCheckOut(staffId, date) {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) {
        showNotification('Staff member not found', 'error');
        return;
    }
    
    // Get existing attendance record
    try {
        const query = `
            SELECT * FROM staff_attendance 
            WHERE staffId = ${staffId} AND attendanceDate = '${date}'
        `;
        
        const result = db.exec(query);
        
        if (!result || !result[0] || result[0].values.length === 0) {
            showNotification('No check-in record found', 'error');
            return;
        }
        
        const columns = result[0].columns;
        const row = result[0].values[0];
        const attendance = {};
        columns.forEach((col, index) => {
            attendance[col] = row[index];
        });
        
        if (attendance.checkOutTime) {
            showNotification('Already checked out', 'warning');
            return;
        }
        
        // Calculate hours worked
        const now = new Date();
        const currentTime = now.toTimeString().substring(0, 8); // HH:MM:SS format
        
        const checkInParts = attendance.checkInTime.split(':');
        const checkOutParts = currentTime.split(':');
        
        const checkInMinutes = parseInt(checkInParts[0]) * 60 + parseInt(checkInParts[1]);
        const checkOutMinutes = parseInt(checkOutParts[0]) * 60 + parseInt(checkOutParts[1]);
        
        let totalMinutes = checkOutMinutes - checkInMinutes;
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        
        const totalHours = totalMinutes / 60;
        const regularHours = Math.min(totalHours, 8);
        const overtimeHours = Math.max(0, totalHours - 8);
        
        // Update attendance
        const attendanceData = {
            staffId: staffId,
            date: date,
            status: 'present',
            checkInTime: attendance.checkInTime,
            checkOutTime: currentTime,
            totalHours: totalHours,
            regularHours: regularHours,
            overtimeHours: overtimeHours,
            notes: attendance.notes || 'Check out'
        };
        
        const success = await saveAttendance(attendanceData);
        if (success) {
            showNotification(`✓ ${staff.firstName} checked out - ${totalHours.toFixed(2)} hours worked`, 'success');
            loadDailyAttendance();
        }
        
    } catch (error) {
        console.error('Check out error:', error);
        showNotification('Failed to check out', 'error');
    }
}

function openAttendanceForm(staffId, date = null) {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) {
        showNotification('Staff member not found', 'error');
        return;
    }
    
    const modal = document.getElementById('attendance-form-modal');
    const form = document.getElementById('attendance-form');
    
    if (!modal || !form) {
        console.error('Attendance form modal not found');
        return;
    }
    
    // Set staff info
    document.getElementById('attendance-staff-id').value = staffId;
    document.getElementById('attendance-staff-name').textContent = `${staff.firstName} ${staff.lastName} - ${staff.position}`;
    
    // Set date (today by default or provided date)
    const attendanceDate = date || new Date().toISOString().split('T')[0];
    document.getElementById('attendance-date').value = attendanceDate;
    
    // Try to load existing attendance for this date
    loadExistingAttendance(staffId, attendanceDate);
    
    modal.style.display = 'block';
}

async function loadExistingAttendance(staffId, date) {
    try {
        const query = `
            SELECT * FROM staff_attendance 
            WHERE staffId = ${staffId} AND attendanceDate = '${date}'
        `;
        
        const result = db.exec(query);
        
        if (result && result[0] && result[0].values.length > 0) {
            const columns = result[0].columns;
            const row = result[0].values[0];
            const attendance = {};
            columns.forEach((col, index) => {
                attendance[col] = row[index];
            });
            
            // Fill form with existing data
            document.getElementById('attendance-status').value = attendance.status || 'present';
            document.getElementById('attendance-check-in').value = attendance.checkInTime || '';
            document.getElementById('attendance-check-out').value = attendance.checkOutTime || '';
            document.getElementById('attendance-total-hours').value = attendance.totalHours || 0;
            document.getElementById('attendance-regular-hours').value = attendance.regularHours || 0;
            document.getElementById('attendance-overtime-hours').value = attendance.overtimeHours || 0;
            document.getElementById('attendance-notes').value = attendance.notes || '';
        } else {
            // Clear form for new entry
            document.getElementById('attendance-form').reset();
            document.getElementById('attendance-staff-id').value = staffId;
            document.getElementById('attendance-date').value = date;
        }
    } catch (error) {
        console.error('Failed to load existing attendance:', error);
    }
}

function closeAttendanceForm() {
    const modal = document.getElementById('attendance-form-modal');
    if (modal) modal.style.display = 'none';
}

async function handleAttendanceSubmit(event) {
    event.preventDefault();
    
    const attendanceData = {
        staffId: parseInt(document.getElementById('attendance-staff-id').value),
        date: document.getElementById('attendance-date').value,
        status: document.getElementById('attendance-status').value,
        checkInTime: document.getElementById('attendance-check-in').value || null,
        checkOutTime: document.getElementById('attendance-check-out').value || null,
        totalHours: parseFloat(document.getElementById('attendance-total-hours').value) || 0,
        regularHours: parseFloat(document.getElementById('attendance-regular-hours').value) || 0,
        overtimeHours: parseFloat(document.getElementById('attendance-overtime-hours').value) || 0,
        notes: document.getElementById('attendance-notes').value.trim()
    };
    
    const success = await saveAttendance(attendanceData);
    if (success) {
        closeAttendanceForm();
        // Refresh daily attendance if that view is open
        const dailySection = document.getElementById('daily-attendance-section');
        if (dailySection && dailySection.style.display !== 'none') {
            loadDailyAttendance();
        }
    }
}

function calculateAttendanceHours() {
    const status = document.getElementById('attendance-status').value;
    const checkIn = document.getElementById('attendance-check-in').value;
    const checkOut = document.getElementById('attendance-check-out').value;
    
    if (status !== 'present' && status !== 'late') {
        document.getElementById('attendance-total-hours').value = 0;
        document.getElementById('attendance-regular-hours').value = 0;
        document.getElementById('attendance-overtime-hours').value = 0;
        return;
    }
    
    if (!checkIn || !checkOut) return;
    
    // Parse times
    const [inHour, inMin] = checkIn.split(':').map(Number);
    const [outHour, outMin] = checkOut.split(':').map(Number);
    
    const inMinutes = inHour * 60 + inMin;
    const outMinutes = outHour * 60 + outMin;
    
    let totalMinutes = outMinutes - inMinutes;
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight shifts
    
    const totalHours = totalMinutes / 60;
    const regularHours = Math.min(totalHours, 8); // 8 hours is regular
    const overtimeHours = Math.max(0, totalHours - 8);
    
    document.getElementById('attendance-total-hours').value = totalHours.toFixed(2);
    document.getElementById('attendance-regular-hours').value = regularHours.toFixed(2);
    document.getElementById('attendance-overtime-hours').value = overtimeHours.toFixed(2);
}

// Export functions for global access
window.initStaffManagement = initStaffManagement;
window.openStaffManagement = openStaffManagement;
window.closeStaffManagement = closeStaffManagement;
window.openStaffForm = openStaffForm;
window.closeStaffForm = closeStaffForm;
window.updateSalaryFields = updateSalaryFields;
window.openDailyAttendance = openDailyAttendance;
window.closeDailyAttendance = closeDailyAttendance;
window.loadDailyAttendance = loadDailyAttendance;
window.quickCheckIn = quickCheckIn;
window.quickCheckInSimple = quickCheckInSimple;
window.quickCheckOut = quickCheckOut;
window.openAttendanceForm = openAttendanceForm;
window.closeAttendanceForm = closeAttendanceForm;
window.handleAttendanceSubmit = handleAttendanceSubmit;
window.calculateAttendanceHours = calculateAttendanceHours;

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
