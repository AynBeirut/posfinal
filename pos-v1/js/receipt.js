// ===================================
// AYN BEIRUT POS - RECEIPT PRINTING
// Generate and print branded receipts
// ===================================

function showReceipt(saleData) {
    const modal = document.getElementById('receipt-modal');
    const receiptDisplay = document.getElementById('receipt-display');
    
    // Generate receipt HTML
    receiptDisplay.innerHTML = generateReceiptHTML(saleData);
    
    // Show modal
    modal.classList.add('show');
    
    // Setup modal close handlers
    setupReceiptModal();
}

function generateReceiptHTML(saleData) {
    const { items, totals, timestamp } = saleData;
    const date = new Date(timestamp);
    
    let itemsHTML = '';
    items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        itemsHTML += `
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid var(--border-grey);">
                    ${item.name}<br>
                    <small style="color: var(--light-grey);">${item.quantity} × $${item.price.toFixed(2)}</small>
                </td>
                <td style="padding: 8px 0; border-bottom: 1px solid var(--border-grey); text-align: right; font-family: 'Roboto Mono', monospace;">
                    $${itemTotal.toFixed(2)}
                </td>
            </tr>
        `;
    });
    
    return `
        <div style="max-width: 400px; margin: 0 auto; font-family: 'Poppins', sans-serif;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 2px solid var(--electric-cyan);">
                <div style="font-size: 48px; font-weight: 700; background: linear-gradient(135deg, #1C75BC, #00C2FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">
                    A
                </div>
                <h2 style="font-size: 24px; font-weight: 700; letter-spacing: 2px; margin: 0;">AYN BEIRUT</h2>
                <p style="color: var(--light-grey); font-size: 12px; margin: 4px 0 0 0;">Tech made in Beirut, deployed worldwide</p>
            </div>
            
            <!-- Receipt Info -->
            <div style="margin-bottom: 24px; font-size: 14px; color: var(--light-grey);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>Date:</span>
                    <span>${date.toLocaleDateString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Time:</span>
                    <span>${date.toLocaleTimeString()}</span>
                </div>
            </div>
            
            <!-- Items -->
            <table style="width: 100%; margin-bottom: 24px;">
                ${itemsHTML}
            </table>
            
            <!-- Totals -->
            <div style="margin-bottom: 24px; padding-top: 16px; border-top: 2px solid var(--border-grey);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                    <span>Subtotal:</span>
                    <span style="font-family: 'Roboto Mono', monospace;">$${totals.subtotal.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 14px; color: var(--light-grey);">
                    <span>Tax (11%):</span>
                    <span style="font-family: 'Roboto Mono', monospace;">$${totals.tax.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: 700; color: var(--electric-cyan); padding-top: 16px; border-top: 2px solid var(--border-grey);">
                    <span>TOTAL:</span>
                    <span style="font-family: 'Roboto Mono', monospace;">$${totals.total.toFixed(2)}</span>
                </div>
            </div>
            
            <!-- Payment Info -->
            ${saleData.payment ? `
            <div style="margin-bottom: 24px; padding: 16px; background: rgba(0, 194, 255, 0.05); border: 1px solid rgba(0, 194, 255, 0.3); border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                    <span>Payment Method:</span>
                    <span style="font-weight: 600; color: var(--electric-cyan);">${saleData.payment.method}</span>
                </div>
                ${saleData.payment.method === 'Cash' ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                    <span>Amount Received:</span>
                    <span style="font-family: 'Roboto Mono', monospace;">$${saleData.payment.amountReceived.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 14px; color: var(--electric-cyan); font-weight: 600;">
                    <span>Change:</span>
                    <span style="font-family: 'Roboto Mono', monospace;">$${saleData.payment.change.toFixed(2)}</span>
                </div>
                ` : ''}
            </div>
            ` : ''}
            
            <!-- Cashier Info -->
            ${saleData.user ? `
            <div style="margin-bottom: 24px; padding: 12px; background: rgba(28, 117, 188, 0.05); border: 1px solid rgba(28, 117, 188, 0.2); border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--light-grey);">
                    <span>Cashier:</span>
                    <span style="font-weight: 600; color: var(--ayn-blue);">${saleData.user.name}</span>
                </div>
            </div>
            ` : ''}
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 24px; border-top: 1px solid var(--border-grey); color: var(--light-grey); font-size: 12px;">
                <p style="margin: 0 0 8px 0;">Thank you for your purchase!</p>
                <p style="margin: 0;">We build modern digital solutions</p>
            </div>
        </div>
    `;
}

function setupReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    const closeBtn = modal.querySelector('.modal-close');
    const printBtn = document.getElementById('print-receipt');
    const newOrderBtn = document.getElementById('new-order');
    
    // Close button
    closeBtn.onclick = () => {
        modal.classList.remove('show');
    };
    
    // Click outside to close
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    };
    
    // Print button
    printBtn.onclick = () => {
        printReceipt();
    };
    
    // New order button
    newOrderBtn.onclick = () => {
        modal.classList.remove('show');
    };
}

function printReceipt() {
    const receiptContent = document.getElementById('receipt-display').innerHTML;
    
    // Create print window
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - Ayn Beirut POS</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Poppins', sans-serif;
                    padding: 20px;
                    background: white;
                    color: #0A0F1C;
                }
                --electric-cyan: #00C2FF;
                --light-grey: #666;
                --border-grey: #ddd;
                @media print {
                    body {
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            ${receiptContent}
            <script>
                window.onload = () => {
                    window.print();
                    window.onafterprint = () => window.close();
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// Export functions
window.showReceipt = showReceipt;
window.printReceipt = printReceipt;
