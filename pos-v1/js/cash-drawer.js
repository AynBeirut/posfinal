/**
 * Cash Drawer Management Module
 * Handles cashier shifts, cash counting, reconciliation, and bank transfers
 */

let currentShift = null;
let shiftHistory = [];

/**
 * Initialize cash drawer management
 */
async function initCashDrawer() {
    try {
        // Check for open shift
        await loadCurrentShift();
        updateCashDrawerBadge();
        
        console.log('✅ Cash drawer system initialized');
    } catch (error) {
        console.error('❌ Failed to initialize cash drawer:', error);
    }
}

/**
 * Load current open shift
 */
async function loadCurrentShift() {
    try {
        const shifts = runQuery(`
            SELECT * FROM cash_shifts 
            WHERE status = 'open' AND cashierId = ?
            ORDER BY openTime DESC LIMIT 1
        `, [getCashierId()]);
        
        if (shifts && shifts.length > 0) {
            currentShift = shifts[0];
            console.log('📂 Open shift found:', currentShift.id);
        } else {
            currentShift = null;
            console.log('📂 No open shift');
        }
        
        return currentShift;
    } catch (error) {
        console.error('❌ Failed to load current shift:', error);
        return null;
    }
}

/**
 * Get last closed shift's closing cash (for auto-loading opening cash)
 */
function getLastClosedShiftCash() {
    try {
        const lastShift = runQuery(`
            SELECT closingCash FROM cash_shifts 
            WHERE status = 'closed' 
            ORDER BY closeTime DESC LIMIT 1
        `);
        
        if (lastShift && lastShift.length > 0 && lastShift[0].closingCash) {
            return parseFloat(lastShift[0].closingCash);
        }
        
        return 0;
    } catch (error) {
        console.error('❌ Failed to get last shift cash:', error);
        return 0;
    }
}

/**
 * Open new cash shift
 */
async function openCashShift(openingCash, notes = '') {
    try {
        // Check if shift already open
        const existing = await loadCurrentShift();
        if (existing) {
            alert('⚠️ You already have an open shift. Please close it first.');
            return false;
        }
        
        const user = getCurrentUser();
        if (!user) {
            alert('❌ User not logged in');
            return false;
        }
        
        const shiftData = {
            cashierId: user.id || getCashierId(),
            cashierName: user.name || user.username,
            openTime: Date.now(),
            openingCash: parseFloat(openingCash),
            status: 'open',
            notes: notes
        };
        
        const result = await runExec(`
            INSERT INTO cash_shifts (cashierId, cashierName, openTime, openingCash, status, notes, synced)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        `, [shiftData.cashierId, shiftData.cashierName, shiftData.openTime, shiftData.openingCash, shiftData.status, shiftData.notes]);
        
        const shiftId = result;
        console.log('✅ Cash shift opened:', shiftId);
        
        await loadCurrentShift();
        updateCashDrawerBadge();
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('cash_shift', `Opened cash shift with $${openingCash.toFixed(2)}`);
        }
        
        return shiftId;
    } catch (error) {
        console.error('❌ Failed to open cash shift:', error);
        throw error;
    }
}

/**
 * Close current cash shift
 */
async function closeCashShift(closingCashData) {
    try {
        if (!currentShift) {
            alert('❌ No open shift to close');
            return false;
        }
        
        const {
            closingCash,
            totalCash,
            totalCard,
            totalMobile,
            cashRefunds,
            cashExpenses,
            notes
        } = closingCashData;
        
        // Calculate expected cash
        const expectedCash = currentShift.openingCash + totalCash - cashRefunds - cashExpenses;
        const difference = closingCash - expectedCash;
        
        // Get total sales from this shift
        const salesResult = runQuery(`
            SELECT COALESCE(SUM(json_extract(totals, '$.total')), 0) as total
            FROM sales
            WHERE timestamp >= ? AND timestamp <= ?
        `, [currentShift.openTime, Date.now()]);
        
        const totalSales = salesResult[0]?.total || 0;
        
        // Update shift record
        await runExec(`
            UPDATE cash_shifts
            SET closeTime = ?,
                closingCash = ?,
                expectedCash = ?,
                difference = ?,
                totalSales = ?,
                totalCash = ?,
                totalCard = ?,
                totalMobile = ?,
                cashRefunds = ?,
                cashExpenses = ?,
                status = 'closed',
                notes = ?,
                synced = 0
            WHERE id = ?
        `, [
            Date.now(),
            closingCash,
            expectedCash,
            difference,
            totalSales,
            totalCash,
            totalCard,
            totalMobile,
            cashRefunds || 0,
            cashExpenses || 0,
            notes || currentShift.notes,
            currentShift.id
        ]);
        
        console.log('✅ Cash shift closed:', currentShift.id);
        console.log('💰 Difference:', difference);
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('cash_shift', `Closed shift: Expected $${expectedCash.toFixed(2)}, Actual $${closingCash.toFixed(2)}, Diff: $${difference.toFixed(2)}`);
        }
        
        const closedShift = { ...currentShift, ...closingCashData, difference, expectedCash, totalSales };
        currentShift = null;
        updateCashDrawerBadge();
        
        return closedShift;
    } catch (error) {
        console.error('❌ Failed to close cash shift:', error);
        throw error;
    }
}

/**
 * Transfer cash to bank (Admin only)
 */
async function transferCashToBank(transferData) {
    try {
        const user = getCurrentUser();
        if (!user || user.role !== 'admin') {
            alert('❌ Admin access required for bank transfers');
            return false;
        }
        
        const {
            amount,
            bankAccount,
            reference,
            notes
        } = transferData;
        
        // Check if there's enough cash in current shift
        if (currentShift) {
            const availableCash = currentShift.openingCash + (currentShift.totalCash || 0);
            if (amount > availableCash) {
                alert(`❌ Insufficient cash. Available: $${availableCash.toFixed(2)}`);
                return false;
            }
        }
        
        // Record bank transfer
        const result = await runExec(`
            INSERT INTO bank_transfers (shiftId, amount, bankAccount, reference, transferredBy, transferredByRole, timestamp, notes, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [
            currentShift?.id || null,
            amount,
            bankAccount,
            reference || '',
            user.username,
            user.role,
            Date.now(),
            notes || ''
        ]);
        
        const transferId = result;
        console.log('✅ Bank transfer recorded:', transferId);
        
        // Update shift if open
        if (currentShift) {
            await runExec(`
                UPDATE cash_shifts
                SET cashExpenses = cashExpenses + ?,
                    synced = 0
                WHERE id = ?
            `, [amount, currentShift.id]);
            
            await loadCurrentShift();
        }
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('bank_transfer', `Transferred $${amount.toFixed(2)} to ${bankAccount} - Ref: ${reference}`);
        }
        
        return transferId;
    } catch (error) {
        console.error('❌ Failed to transfer cash to bank:', error);
        throw error;
    }
}

/**
 * Adjust cash drawer amount (Admin only - for bank deposits)
 */
async function adjustCashDrawer(adjustmentData) {
    try {
        const user = getCurrentUser();
        if (!user || user.role !== 'admin') {
            alert('❌ Admin access required to adjust cash drawer');
            return false;
        }
        
        if (!currentShift) {
            alert('❌ No active shift to adjust');
            return false;
        }
        
        const {
            amount,
            reason,
            type // 'bank_deposit', 'withdrawal', 'correction'
        } = adjustmentData;
        
        // Update shift expenses/deposits
        const field = type === 'bank_deposit' ? 'cashExpenses' : 'cashExpenses';
        const adjustmentAmount = type === 'bank_deposit' ? amount : -amount;
        
        await runExec(`
            UPDATE cash_shifts
            SET cashExpenses = cashExpenses + ?,
                notes = COALESCE(notes, '') || ?,
                synced = 0
            WHERE id = ?
        `, [
            adjustmentAmount,
            `\n[${type.toUpperCase()}] $${amount.toFixed(2)} - ${reason} (by ${user.username})`,
            currentShift.id
        ]);
        
        await loadCurrentShift();
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('cash_adjustment', `${type}: $${amount.toFixed(2)} - ${reason}`);
        }
        
        console.log('✅ Cash drawer adjusted:', type, amount);
        return true;
    } catch (error) {
        console.error('❌ Failed to adjust cash drawer:', error);
        throw error;
    }
}

/**
 * Get shift report
 */
function getShiftReport(shiftId) {
    try {
        const shift = runQuery('SELECT * FROM cash_shifts WHERE id = ?', [shiftId]);
        if (!shift || shift.length === 0) return null;
        
        // Get sales during shift
        const sales = runQuery(`
            SELECT * FROM sales
            WHERE timestamp >= ? AND timestamp <= ?
            ORDER BY timestamp DESC
        `, [shift[0].openTime, shift[0].closeTime || Date.now()]);
        
        // Get bank transfers during shift
        const transfers = runQuery(`
            SELECT * FROM bank_transfers
            WHERE shiftId = ?
            ORDER BY timestamp DESC
        `, [shiftId]);
        
        return {
            shift: shift[0],
            sales: sales || [],
            transfers: transfers || []
        };
    } catch (error) {
        console.error('❌ Failed to get shift report:', error);
        return null;
    }
}

/**
 * Get all shifts (with optional filters)
 */
function getAllShifts(filters = {}) {
    try {
        let query = 'SELECT * FROM cash_shifts WHERE 1=1';
        const params = [];
        
        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }
        
        if (filters.cashierId) {
            query += ' AND cashierId = ?';
            params.push(filters.cashierId);
        }
        
        if (filters.startDate) {
            query += ' AND openTime >= ?';
            params.push(new Date(filters.startDate).getTime());
        }
        
        if (filters.endDate) {
            query += ' AND openTime <= ?';
            params.push(new Date(filters.endDate).getTime());
        }
        
        query += ' ORDER BY openTime DESC';
        
        return runQuery(query, params) || [];
    } catch (error) {
        console.error('❌ Failed to get shifts:', error);
        return [];
    }
}

/**
 * Update cash drawer badge
 */
function updateCashDrawerBadge() {
    const badge = document.getElementById('cash-drawer-badge');
    if (!badge) return;
    
    if (currentShift) {
        badge.style.display = 'block';
        badge.textContent = '●';
        badge.title = 'Shift Open';
    } else {
        badge.style.display = 'none';
    }
}

/**
 * Show cash drawer modal
 */
function showCashDrawerModal() {
    const modal = document.getElementById('cash-drawer-modal');
    if (!modal) {
        console.error('❌ Cash drawer modal not found');
        return;
    }
    
    renderCashDrawerContent();
    modal.classList.add('active');
    modal.style.display = 'block';
}

/**
 * Close cash drawer modal
 */
function closeCashDrawerModal() {
    const modal = document.getElementById('cash-drawer-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

/**
 * Render cash drawer content
 */
function renderCashDrawerContent() {
    const content = document.getElementById('cash-drawer-content');
    if (!content) return;
    
    if (currentShift) {
        renderOpenShift(content);
    } else {
        renderOpenShiftForm(content);
    }
}

/**
 * Render open shift form
 */
function renderOpenShiftForm(container) {
    const expectedCash = getLastClosedShiftCash();
    const hasExpectedCash = expectedCash > 0;
    
    container.innerHTML = `
        <div class="cash-drawer-form">
            <h3>💵 Open Cash Shift</h3>
            <p>Start your shift by counting the opening cash amount</p>
            
            ${hasExpectedCash ? `
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <span style="font-size: 20px;">💰</span>
                        <strong style="color: #1976d2;">Expected Cash from Last Shift</strong>
                    </div>
                    <div style="font-size: 28px; font-weight: bold; color: #1565c0;">
                        $${expectedCash.toFixed(2)}
                    </div>
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">
                        This is the closing cash amount from the previous shift
                    </div>
                </div>
            ` : ''}
            
            <div class="form-group">
                <label for="opening-cash">Actual Cash Count *</label>
                <input type="number" id="opening-cash" step="0.01" min="0" 
                    value="${hasExpectedCash ? expectedCash.toFixed(2) : ''}" 
                    placeholder="0.00" required autofocus>
                <small style="color: #666;">Count the physical cash in the drawer and confirm the amount</small>
            </div>
            
            <div class="form-group">
                <label for="shift-notes">Notes (Optional)</label>
                <textarea id="shift-notes" rows="2" placeholder="Any discrepancies or notes about this shift..."></textarea>
                <small style="color: #666;">If the actual count differs from expected, please explain why</small>
            </div>
            
            <button onclick="submitOpenShift(${expectedCash})" class="btn-primary">✅ Open Shift</button>
        </div>
    `;
}

/**
 * Render open shift details
 */
function renderOpenShift(container) {
    const duration = Math.floor((Date.now() - currentShift.openTime) / 1000 / 60); // minutes
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    const user = getCurrentUser();
    const isAdmin = user && user.role === 'admin';
    
    container.innerHTML = `
        <div class="shift-details">
            <h3>📂 Current Shift</h3>
            <div class="shift-info">
                <div class="info-row">
                    <span>Cashier:</span>
                    <strong>${currentShift.cashierName}</strong>
                </div>
                <div class="info-row">
                    <span>Opened:</span>
                    <strong>${new Date(currentShift.openTime).toLocaleString()}</strong>
                </div>
                <div class="info-row">
                    <span>Duration:</span>
                    <strong>${hours}h ${minutes}m</strong>
                </div>
                <div class="info-row">
                    <span>Opening Cash:</span>
                    <strong>$${currentShift.openingCash.toFixed(2)}</strong>
                </div>
                ${currentShift.notes ? `
                <div class="info-row">
                    <span>Notes:</span>
                    <strong style="color: #666;">${currentShift.notes}</strong>
                </div>
                ` : ''}
            </div>
            
            <button onclick="showCloseShiftForm()" class="btn-primary" style="margin-top: 20px;">🔒 Close Shift</button>
            ${isAdmin ? `
                <button onclick="showBankTransferForm()" class="btn-secondary" style="margin-top: 10px; background: #ff9800;">🏦 Bank Transfer (Admin)</button>
            ` : ''}
            <button onclick="showShiftHistory()" class="btn-secondary" style="margin-top: 10px;">📋 View History</button>
        </div>
    `;
}

/**
 * Submit open shift
 */
async function submitOpenShift(expectedCash = 0) {
    const actualCash = parseFloat(document.getElementById('opening-cash').value);
    const notes = document.getElementById('shift-notes').value;
    
    if (isNaN(actualCash) || actualCash < 0) {
        alert('❌ Please enter a valid opening cash amount');
        return;
    }
    
    // Check for discrepancy
    let finalNotes = notes;
    if (expectedCash > 0 && Math.abs(actualCash - expectedCash) > 0.01) {
        const difference = actualCash - expectedCash;
        const discrepancyNote = `\n[DISCREPANCY] Expected: $${expectedCash.toFixed(2)}, Actual: $${actualCash.toFixed(2)}, Diff: ${difference >= 0 ? '+' : ''}$${difference.toFixed(2)}`;
        finalNotes = (notes ? notes + discrepancyNote : discrepancyNote.trim());
        
        const confirmMsg = difference > 0 
            ? `⚠️ Cash is OVER by $${Math.abs(difference).toFixed(2)}\n\nExpected: $${expectedCash.toFixed(2)}\nActual: $${actualCash.toFixed(2)}\n\nDo you want to continue?`
            : `⚠️ Cash is SHORT by $${Math.abs(difference).toFixed(2)}\n\nExpected: $${expectedCash.toFixed(2)}\nActual: $${actualCash.toFixed(2)}\n\nDo you want to continue?`;
        
        if (!confirm(confirmMsg)) {
            return;
        }
    }
    
    try {
        await openCashShift(actualCash, finalNotes);
        showNotification('Shift Opened', `Cash shift started with $${actualCash.toFixed(2)}`, 'success');
        renderCashDrawerContent();
    } catch (error) {
        alert('❌ Failed to open shift: ' + error.message);
    }
}

/**
 * Show close shift form
 */
function showCloseShiftForm() {
    const content = document.getElementById('cash-drawer-content');
    if (!content) return;
    
    content.innerHTML = `
        <div class="cash-drawer-form">
            <h3>🔒 Close Cash Shift</h3>
            <p>Count all cash and sales to close your shift</p>
            
            <div class="form-group">
                <label for="closing-cash">Actual Cash in Drawer *</label>
                <input type="number" id="closing-cash" step="0.01" min="0" placeholder="0.00" required autofocus>
            </div>
            
            <div class="form-group">
                <label for="total-cash-sales">Total Cash Sales *</label>
                <input type="number" id="total-cash-sales" step="0.01" min="0" placeholder="0.00" required>
            </div>
            
            <div class="form-group">
                <label for="total-card-sales">Total Card Sales *</label>
                <input type="number" id="total-card-sales" step="0.01" min="0" placeholder="0.00" required>
            </div>
            
            <div class="form-group">
                <label for="total-mobile-sales">Total Mobile Payments *</label>
                <input type="number" id="total-mobile-sales" step="0.01" min="0" placeholder="0.00" required>
            </div>
            
            <div class="form-group">
                <label for="cash-refunds">Cash Refunds</label>
                <input type="number" id="cash-refunds" step="0.01" min="0" placeholder="0.00" value="0">
            </div>
            
            <div class="form-group">
                <label for="cash-expenses">Cash Paid Out</label>
                <input type="number" id="cash-expenses" step="0.01" min="0" placeholder="0.00" value="0">
            </div>
            
            <div class="form-group">
                <label for="close-notes">Notes (Optional)</label>
                <textarea id="close-notes" rows="2" placeholder="Any discrepancies or notes..."></textarea>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="submitCloseShift()" class="btn-primary">✅ Close Shift</button>
                <button onclick="renderCashDrawerContent()" class="btn-secondary">Cancel</button>
            </div>
        </div>
    `;
}

/**
 * Submit close shift
 */
async function submitCloseShift() {
    const closingData = {
        closingCash: parseFloat(document.getElementById('closing-cash').value),
        totalCash: parseFloat(document.getElementById('total-cash-sales').value),
        totalCard: parseFloat(document.getElementById('total-card-sales').value),
        totalMobile: parseFloat(document.getElementById('total-mobile-sales').value),
        cashRefunds: parseFloat(document.getElementById('cash-refunds').value) || 0,
        cashExpenses: parseFloat(document.getElementById('cash-expenses').value) || 0,
        notes: document.getElementById('close-notes').value
    };
    
    // Validation
    if (Object.values(closingData).some(v => typeof v === 'number' && isNaN(v))) {
        alert('❌ Please enter valid amounts for all fields');
        return;
    }
    
    try {
        const closedShift = await closeCashShift(closingData);
        
        // Show summary
        const message = closedShift.difference === 0 
            ? '✅ Perfect! Cash matches expected amount.'
            : closedShift.difference > 0
            ? `💰 Cash over by $${Math.abs(closedShift.difference).toFixed(2)}`
            : `⚠️ Cash short by $${Math.abs(closedShift.difference).toFixed(2)}`;
        
        alert(`Shift Closed\n\n${message}\n\nExpected: $${closedShift.expectedCash.toFixed(2)}\nActual: $${closingData.closingCash.toFixed(2)}`);
        
        closeCashDrawerModal();
    } catch (error) {
        alert('❌ Failed to close shift: ' + error.message);
    }
}

/**
 * Show bank transfer form (Admin only)
 */
function showBankTransferForm() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        alert('❌ Admin access required for bank transfers');
        return;
    }
    
    if (!currentShift) {
        alert('❌ No active shift');
        return;
    }
    
    const content = document.getElementById('cash-drawer-content');
    if (!content) return;
    
    const availableCash = currentShift.openingCash + (currentShift.totalCash || 0) - (currentShift.cashExpenses || 0);
    
    content.innerHTML = `
        <div class="cash-drawer-form">
            <h3>🏦 Bank Transfer (Admin Only)</h3>
            <p>Transfer cash from drawer to bank account</p>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span style="font-size: 20px;">💰</span>
                    <strong style="color: #856404;">Available Cash in Drawer</strong>
                </div>
                <div style="font-size: 28px; font-weight: bold; color: #856404;">
                    $${availableCash.toFixed(2)}
                </div>
            </div>
            
            <div class="form-group">
                <label for="transfer-amount">Transfer Amount *</label>
                <input type="number" id="transfer-amount" step="0.01" min="0" max="${availableCash}" placeholder="0.00" required autofocus>
            </div>
            
            <div class="form-group">
                <label for="bank-account">Bank Account *</label>
                <input type="text" id="bank-account" placeholder="Account name or number" required>
            </div>
            
            <div class="form-group">
                <label for="transfer-reference">Reference Number</label>
                <input type="text" id="transfer-reference" placeholder="Transaction reference (optional)">
            </div>
            
            <div class="form-group">
                <label for="transfer-notes">Notes</label>
                <textarea id="transfer-notes" rows="2" placeholder="Additional notes about this transfer..."></textarea>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="submitBankTransfer()" class="btn-primary">✅ Transfer to Bank</button>
                <button onclick="renderCashDrawerContent()" class="btn-secondary">Cancel</button>
            </div>
        </div>
    `;
}

/**
 * Submit bank transfer
 */
async function submitBankTransfer() {
    const amount = parseFloat(document.getElementById('transfer-amount').value);
    const bankAccount = document.getElementById('bank-account').value.trim();
    const reference = document.getElementById('transfer-reference').value.trim();
    const notes = document.getElementById('transfer-notes').value.trim();
    
    if (isNaN(amount) || amount <= 0) {
        alert('❌ Please enter a valid transfer amount');
        return;
    }
    
    if (!bankAccount) {
        alert('❌ Please enter bank account');
        return;
    }
    
    if (!confirm(`Transfer $${amount.toFixed(2)} to ${bankAccount}?`)) {
        return;
    }
    
    try {
        await transferCashToBank({
            amount,
            bankAccount,
            reference,
            notes
        });
        
        showNotification('Bank Transfer', `$${amount.toFixed(2)} transferred to ${bankAccount}`, 'success');
        renderCashDrawerContent();
    } catch (error) {
        alert('❌ Failed to transfer: ' + error.message);
    }
}

// Export functions
/**
 * Show shift history
 */
function showShiftHistory() {
    const content = document.getElementById('cash-drawer-content');
    if (!content) return;
    
    const shifts = getAllShifts({ limit: 50 });
    
    content.innerHTML = `
        <div class="shift-history">
            <h3>📊 Shift History</h3>
            <button onclick="renderCashDrawerContent()" class="btn-primary" style="margin-bottom: 20px;">← Back</button>
            
            ${shifts.length === 0 ? '<p style="text-align: center; color: #888;">No shift history</p>' : `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f5f5f5; text-align: left;">
                            <th style="padding: 12px; border-bottom: 2px solid #ddd;">Shift ID</th>
                            <th style="padding: 12px; border-bottom: 2px solid #ddd;">Cashier</th>
                            <th style="padding: 12px; border-bottom: 2px solid #ddd;">Date</th>
                            <th style="padding: 12px; border-bottom: 2px solid #ddd;">Duration</th>
                            <th style="padding: 12px; border-bottom: 2px solid #ddd;">Opening</th>
                            <th style="padding: 12px; border-bottom: 2px solid #ddd;">Closing</th>
                            <th style="padding: 12px; border-bottom: 2px solid #ddd;">Difference</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${shifts.map(shift => {
                            const openDate = new Date(shift.openTime);
                            const duration = shift.closeTime ? 
                                Math.round((shift.closeTime - shift.openTime) / 1000 / 60) + ' min' : 
                                'Open';
                            const diffColor = !shift.difference ? '#666' : 
                                shift.difference > 0 ? '#28a745' : '#dc3545';
                            
                            return `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 12px;">#${shift.id}</td>
                                    <td style="padding: 12px;">${shift.cashierName}</td>
                                    <td style="padding: 12px;">${openDate.toLocaleDateString()}</td>
                                    <td style="padding: 12px;">${duration}</td>
                                    <td style="padding: 12px;">$${shift.openingCash.toFixed(2)}</td>
                                    <td style="padding: 12px;">${shift.closingCash ? '$' + shift.closingCash.toFixed(2) : '-'}</td>
                                    <td style="padding: 12px; color: ${diffColor}; font-weight: bold;">
                                        ${shift.difference !== null && shift.difference !== undefined ? 
                                            (shift.difference >= 0 ? '+' : '') + '$' + shift.difference.toFixed(2) : 
                                            '-'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `}
        </div>
    `;
}

window.initCashDrawer = initCashDrawer;
window.openCashShift = openCashShift;
window.closeCashShift = closeCashShift;
window.transferCashToBank = transferCashToBank;
window.adjustCashDrawer = adjustCashDrawer;
window.getShiftReport = getShiftReport;
window.getAllShifts = getAllShifts;
window.getLastClosedShiftCash = getLastClosedShiftCash;
window.showCashDrawerModal = showCashDrawerModal;
window.closeCashDrawerModal = closeCashDrawerModal;
window.submitOpenShift = submitOpenShift;
window.submitCloseShift = submitCloseShift;
window.showCloseShiftForm = showCloseShiftForm;
window.showBankTransferForm = showBankTransferForm;
window.submitBankTransfer = submitBankTransfer;
window.showShiftHistory = showShiftHistory;
