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
    container.innerHTML = `
        <div class="cash-drawer-form">
            <h3>💵 Open Cash Shift</h3>
            <p>Start your shift by counting the opening cash amount</p>
            
            <div class="form-group">
                <label for="opening-cash">Opening Cash Amount *</label>
                <input type="number" id="opening-cash" step="0.01" min="0" placeholder="0.00" required autofocus>
            </div>
            
            <div class="form-group">
                <label for="shift-notes">Notes (Optional)</label>
                <textarea id="shift-notes" rows="2" placeholder="Any notes about this shift..."></textarea>
            </div>
            
            <button onclick="submitOpenShift()" class="btn-primary">✅ Open Shift</button>
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
            </div>
            
            <button onclick="showCloseShiftForm()" class="btn-primary" style="margin-top: 20px;">🔒 Close Shift</button>
            <button onclick="showShiftHistory()" class="btn-secondary" style="margin-top: 10px;">📋 View History</button>
        </div>
    `;
}

/**
 * Submit open shift
 */
async function submitOpenShift() {
    const openingCash = parseFloat(document.getElementById('opening-cash').value);
    const notes = document.getElementById('shift-notes').value;
    
    if (isNaN(openingCash) || openingCash < 0) {
        alert('❌ Please enter a valid opening cash amount');
        return;
    }
    
    try {
        await openCashShift(openingCash, notes);
        showNotification('Shift Opened', `Cash shift started with $${openingCash.toFixed(2)}`, 'success');
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
            <button onclick="renderOpenShiftForm()" class="btn-primary" style="margin-bottom: 20px;">← Back to Current Shift</button>
            
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
window.getShiftReport = getShiftReport;
window.getAllShifts = getAllShifts;
window.showCashDrawerModal = showCashDrawerModal;
window.closeCashDrawerModal = closeCashDrawerModal;
window.submitOpenShift = submitOpenShift;
window.submitCloseShift = submitCloseShift;
window.showCloseShiftForm = showCloseShiftForm;
window.showShiftHistory = showShiftHistory;
