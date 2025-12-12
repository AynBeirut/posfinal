// ===================================
// SUPPLIER PAYMENTS MODULE
// Handles payments to suppliers and payment tracking
// ===================================

// Record a payment to a supplier
async function recordSupplierPayment(paymentData) {
    try {
        const { supplierId, amount, paymentMethod, reference, notes, paidBy } = paymentData;
        
        if (!supplierId) {
            throw new Error('Supplier is required');
        }
        
        if (!amount || amount <= 0) {
            throw new Error('Payment amount must be greater than 0');
        }
        
        const now = Date.now();
        
        // Insert payment record
        await runExec(
            `INSERT INTO supplier_payments (supplierId, amount, paymentMethod, reference, notes, paidBy, paidAt, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                supplierId,
                amount,
                paymentMethod || 'Cash',
                reference || '',
                notes || '',
                paidBy || '',
                now,
                now
            ]
        );
        
        // Get the newly created payment ID
        const result = await runQuery('SELECT last_insert_rowid() as id');
        const paymentId = result[0].id;
        
        // Update supplier balance (payment reduces debt - adds to balance)
        await updateSupplierBalance(supplierId, amount, `Payment #${paymentId}`);
        
        await saveDatabase();
        
        // Log activity
        if (typeof logActivity === 'function') {
            const supplier = await getSupplierById(supplierId);
            const supplierName = supplier ? supplier.name : `ID ${supplierId}`;
            await logActivity('supplier_payment', 
                `Payment to ${supplierName}: $${amount.toFixed(2)} via ${paymentMethod || 'Cash'}`);
        }
        
        console.log(`✅ Payment recorded: $${amount.toFixed(2)} to supplier ID ${supplierId}`);
        return paymentId;
        
    } catch (error) {
        console.error('Error recording supplier payment:', error);
        throw error;
    }
}

// Get all payment history with optional filters
async function getPaymentHistory(filters = {}) {
    try {
        let query = `
            SELECT sp.*, s.name as supplierName
            FROM supplier_payments sp
            LEFT JOIN suppliers s ON sp.supplierId = s.id
        `;
        const params = [];
        const conditions = [];
        
        // Filter by supplier
        if (filters.supplierId) {
            conditions.push('sp.supplierId = ?');
            params.push(filters.supplierId);
        }
        
        // Filter by payment method
        if (filters.paymentMethod) {
            conditions.push('sp.paymentMethod = ?');
            params.push(filters.paymentMethod);
        }
        
        // Filter by date range
        if (filters.startDate) {
            conditions.push('sp.paidAt >= ?');
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            conditions.push('sp.paidAt <= ?');
            params.push(filters.endDate);
        }
        
        // Add WHERE clause if there are conditions
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY sp.paidAt DESC';
        
        const results = await runQuery(query, params);
        return results || [];
        
    } catch (error) {
        console.error('Error getting payment history:', error);
        return [];
    }
}

// Get payments for a specific supplier
async function getPaymentsBySupplier(supplierId) {
    try {
        return await getPaymentHistory({ supplierId });
    } catch (error) {
        console.error('Error getting payments by supplier:', error);
        return [];
    }
}

// Get unpaid balance for a supplier (negative balance means we owe them)
async function getUnpaidBalance(supplierId) {
    try {
        const balance = await getSupplierBalance(supplierId);
        // Return absolute value if negative (we owe them), otherwise 0
        return balance < 0 ? Math.abs(balance) : 0;
    } catch (error) {
        console.error('Error getting unpaid balance:', error);
        return 0;
    }
}

// Get total payments for a date range
async function getPaymentTotals(startDate, endDate) {
    try {
        let query = 'SELECT SUM(amount) as total, COUNT(*) as count FROM supplier_payments';
        const params = [];
        const conditions = [];
        
        if (startDate) {
            conditions.push('paidAt >= ?');
            params.push(startDate);
        }
        if (endDate) {
            conditions.push('paidAt <= ?');
            params.push(endDate);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        const results = await runQuery(query, params);
        return {
            total: results && results[0].total ? results[0].total : 0,
            count: results && results[0].count ? results[0].count : 0
        };
        
    } catch (error) {
        console.error('Error getting payment totals:', error);
        return { total: 0, count: 0 };
    }
}

// Get payment by ID
async function getPaymentById(paymentId) {
    try {
        const results = await runQuery(
            `SELECT sp.*, s.name as supplierName, s.phone as supplierPhone
             FROM supplier_payments sp
             LEFT JOIN suppliers s ON sp.supplierId = s.id
             WHERE sp.id = ?`,
            [paymentId]
        );
        
        return results && results.length > 0 ? results[0] : null;
        
    } catch (error) {
        console.error('Error getting payment by ID:', error);
        return null;
    }
}

// Delete a payment (use with caution - should reverse balance)
async function deleteSupplierPayment(paymentId) {
    try {
        // Get payment details first
        const payment = await getPaymentById(paymentId);
        
        if (!payment) {
            throw new Error('Payment not found');
        }
        
        // Delete the payment
        await runExec('DELETE FROM supplier_payments WHERE id = ?', [paymentId]);
        
        // Reverse the balance update (subtract the payment amount)
        await updateSupplierBalance(payment.supplierId, -payment.amount, `Deleted payment #${paymentId}`);
        
        await saveDatabase();
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('payment_delete', 
                `Deleted payment #${paymentId}: $${payment.amount.toFixed(2)} to ${payment.supplierName}`);
        }
        
        console.log(`✅ Payment deleted: #${paymentId}`);
        return true;
        
    } catch (error) {
        console.error('Error deleting payment:', error);
        throw error;
    }
}

console.log('✅ Supplier Payments module loaded');
