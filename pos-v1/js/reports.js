/**
 * Sales Reports & Analytics Module
 * Displays sales statistics, charts, and transaction history
 */

let currentPeriod = 'today';

/**
 * Initialize the reports module
 */
function initReports() {
    const reportsBtn = document.getElementById('reports-btn');
    const reportsModal = document.getElementById('reports-modal');
    const closeBtn = reportsModal.querySelector('.modal-close');
    const periodBtns = document.querySelectorAll('.period-btn');
    const exportBtn = document.getElementById('export-sales');
    
    // Open reports modal
    reportsBtn.addEventListener('click', () => {
        reportsModal.classList.add('active');
        loadReportsData(currentPeriod);
    });
    
    // Close modal
    closeBtn.addEventListener('click', () => {
        reportsModal.classList.remove('active');
    });
    
    // Click outside to close
    reportsModal.addEventListener('click', (e) => {
        if (e.target === reportsModal) {
            reportsModal.classList.remove('active');
        }
    });
    
    // Period selector buttons
    periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            periodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Load data for selected period
            currentPeriod = btn.dataset.period;
            loadReportsData(currentPeriod);
        });
    });
    
    // Export sales to CSV
    exportBtn.addEventListener('click', exportSalesToCSV);
}

/**
 * Load and display reports data for the selected period
 */
async function loadReportsData(period) {
    try {
        // Check if database is ready
        if (!db) {
            console.log('Database not ready, initializing...');
            await initDatabase();
        }
        
        console.log('🔍 DEBUG: Getting sales for period:', period);
        const sales = await getSalesForPeriod(period);
        console.log('🔍 DEBUG: Retrieved sales:', sales);
        console.log(`📊 Loaded ${sales.length} sales for period: ${period}`);
        
        // If no sales data, show empty state
        if (sales.length === 0) {
            console.warn('⚠️ No sales data found for period:', period);
            showEmptyReportsState();
            return;
        }
        
        // Calculate statistics
        const stats = calculateStats(sales);
        console.log('📈 Calculated stats:', stats);
        updateStatsCards(stats);
        
        // Render charts
        renderTopProductsChart(sales);
        renderCategoryChart(sales);
        
        // Display recent sales
        renderRecentSales(sales);
        
    } catch (error) {
        console.error('Error loading reports:', error);
        showEmptyReportsState();
    }
}

/**
 * Show empty state when no sales data
 */
function showEmptyReportsState() {
    // Update stats to zero
    updateStatsCards({
        totalRevenue: 0,
        totalSales: 0,
        totalItems: 0,
        averageSale: 0
    });
    
    // Show empty message
    const topProductsChart = document.getElementById('top-products-chart');
    const categoryChart = document.getElementById('category-chart');
    const salesList = document.getElementById('recent-sales-table');
    
    if (topProductsChart) {
        topProductsChart.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No sales data yet. Complete a transaction to see reports.</p>';
    }
    
    if (categoryChart) {
        categoryChart.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No category data available.</p>';
    }
    
    if (salesList) {
        salesList.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">No recent sales.</p>';
    }
}

/**
 * Get sales for the selected period
 */
async function getSalesForPeriod(period) {
    const now = new Date();
    let startDate;
    
    switch (period) {
        case 'today':
            // Start of today (00:00:00)
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            break;
        case 'week':
            // 7 days ago
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            // 30 days ago
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'all':
            // Beginning of time
            startDate = new Date(2020, 0, 1, 0, 0, 0, 0);
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    
    console.log('📊 Getting sales for period:', period);
    const allSales = await getAllSales();
    console.log('📊 Total sales in database:', allSales.length);
    
    if (allSales.length === 0) {
        console.warn('⚠️ No sales found in database');
        return [];
    }
    
    console.log('📊 Start date filter:', startDate.toISOString());
    const startTime = startDate.getTime();
    
    const filtered = allSales.filter(sale => {
        if (!sale.timestamp) {
            console.warn('⚠️ Sale missing timestamp:', sale);
            return false;
        }
        
        // Handle both ISO strings and timestamps
        const saleTime = typeof sale.timestamp === 'string' 
            ? new Date(sale.timestamp).getTime() 
            : sale.timestamp;
        
        const include = saleTime >= startTime;
        
        if (!include) {
            console.log('🔍 Filtered out sale:', new Date(saleTime).toLocaleString());
        }
        
        return include;
    });
    
    console.log('✅ Filtered sales count:', filtered.length);
    return filtered;
}

/**
 * Calculate statistics from sales data
 */
function calculateStats(sales) {
    const totalRevenue = sales.reduce((sum, sale) => {
        const totals = typeof sale.totals === 'string' ? JSON.parse(sale.totals) : sale.totals;
        return sum + (totals?.total || sale.total || 0);
    }, 0);
    
    const totalSales = sales.length;
    
    const totalItems = sales.reduce((sum, sale) => {
        const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
        return sum + items.reduce((s, item) => s + item.quantity, 0);
    }, 0);
    
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    return {
        totalRevenue,
        totalSales,
        totalItems,
        averageSale
    };
}

/**
 * Update statistics cards in the UI
 */
function updateStatsCards(stats) {
    document.getElementById('stat-revenue').textContent = `$${stats.totalRevenue.toFixed(2)}`;
    document.getElementById('stat-sales').textContent = stats.totalSales;
    document.getElementById('stat-items').textContent = stats.totalItems;
    document.getElementById('stat-average').textContent = `$${stats.averageSale.toFixed(2)}`;
}

/**
 * Render top selling products chart
 */
function renderTopProductsChart(sales) {
    const container = document.getElementById('top-products-chart');
    
    // Aggregate products
    const productMap = {};
    sales.forEach(sale => {
        const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
        items.forEach(item => {
            if (!productMap[item.name]) {
                productMap[item.name] = {
                    name: item.name,
                    quantity: 0,
                    revenue: 0
                };
            }
            productMap[item.name].quantity += item.quantity;
            productMap[item.name].revenue += item.price * item.quantity;
        });
    });
    
    // Convert to array and sort by quantity
    const products = Object.values(productMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5); // Top 5
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state">No sales data available</div>';
        return;
    }
    
    // Find max for scaling
    const maxQuantity = Math.max(...products.map(p => p.quantity));
    
    // Render horizontal bar chart
    container.innerHTML = products.map(product => {
        const percentage = (product.quantity / maxQuantity) * 100;
        return `
            <div class="product-bar-item">
                <div class="product-bar-info">
                    <span class="product-bar-name">${product.name}</span>
                    <span class="product-bar-value">${product.quantity} sold • $${product.revenue.toFixed(2)}</span>
                </div>
                <div class="product-bar-container">
                    <div class="product-bar-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render sales by category chart
 */
function renderCategoryChart(sales) {
    const container = document.getElementById('category-chart');
    
    // Aggregate by category
    const categoryMap = {};
    sales.forEach(sale => {
        const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
        items.forEach(item => {
            const category = item.category || 'Uncategorized';
            if (!categoryMap[category]) {
                categoryMap[category] = {
                    category,
                    quantity: 0,
                    revenue: 0
                };
            }
            categoryMap[category].quantity += item.quantity;
            categoryMap[category].revenue += item.price * item.quantity;
        });
    });
    
    const categories = Object.values(categoryMap);
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="empty-state">No sales data available</div>';
        return;
    }
    
    // Calculate total for percentages
    const totalRevenue = categories.reduce((sum, cat) => sum + cat.revenue, 0);
    
    // Category colors (using Ayn Beirut palette)
    const colors = [
        'var(--color-primary)',      // Ayn Blue
        'var(--color-accent)',        // Electric Cyan
        'var(--color-cta)',           // Warm Orange
        'rgba(242, 122, 29, 0.6)',    // Light Orange
        'rgba(28, 117, 188, 0.6)',    // Light Blue
        'rgba(0, 194, 255, 0.6)'      // Light Cyan
    ];
    
    // Render category bars
    container.innerHTML = categories.map((cat, index) => {
        const percentage = (cat.revenue / totalRevenue) * 100;
        const color = colors[index % colors.length];
        return `
            <div class="category-bar-item">
                <div class="category-bar-info">
                    <span class="category-bar-name">${cat.category}</span>
                    <span class="category-bar-value">${percentage.toFixed(1)}% • $${cat.revenue.toFixed(2)}</span>
                </div>
                <div class="category-bar-container">
                    <div class="category-bar-fill" style="width: ${percentage}%; background: ${color}"></div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render recent sales table
 */
function renderRecentSales(sales) {
    const container = document.getElementById('recent-sales-table');
    
    if (sales.length === 0) {
        container.innerHTML = '<div class="empty-state">No transactions found</div>';
        return;
    }
    
    // Sort by date (newest first) and limit to 20
    const recentSales = sales
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);
    
    const tableHTML = `
        <table class="sales-table-grid">
            <thead>
                <tr>
                    <th>Date & Time</th>
                    <th>Items</th>
                    <th>Quantity</th>
                    <th>Subtotal</th>
                    <th>Tax</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${recentSales.map(sale => {
                    const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
                    const totals = typeof sale.totals === 'string' ? JSON.parse(sale.totals) : sale.totals;
                    const date = new Date(sale.timestamp);
                    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    const itemCount = items.length;
                    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
                    
                    return `
                        <tr>
                            <td>
                                <div class="sale-datetime">
                                    <span class="sale-date">${dateStr}</span>
                                    <span class="sale-time">${timeStr}</span>
                                </div>
                            </td>
                            <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                            <td>${totalQty}</td>
                            <td>$${(totals?.subtotal || sale.subtotal || 0).toFixed(2)}</td>
                            <td>$${(totals?.tax || sale.tax || 0).toFixed(2)}</td>
                            <td class="sale-total">$${(totals?.total || sale.total || 0).toFixed(2)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

/**
 * Export sales data to CSV
 */
async function exportSalesToCSV() {
    try {
        const sales = await getSalesForPeriod(currentPeriod);
        
        if (sales.length === 0) {
            showNotification('No sales data to export', 'error');
            return;
        }
        
        // CSV header
        let csv = 'Date,Time,Items,Quantity,Subtotal,Tax,Total\n';
        
        // Add rows
        sales.forEach(sale => {
            const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
            const totals = typeof sale.totals === 'string' ? JSON.parse(sale.totals) : sale.totals;
            const date = new Date(sale.timestamp);
            const dateStr = date.toLocaleDateString('en-US');
            const timeStr = date.toLocaleTimeString('en-US');
            const itemCount = items.length;
            const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
            const subtotal = totals?.subtotal || sale.subtotal || 0;
            const tax = totals?.tax || sale.tax || 0;
            const total = totals?.total || sale.total || 0;
            
            csv += `"${dateStr}","${timeStr}",${itemCount},${totalQty},${subtotal.toFixed(2)},${tax.toFixed(2)},${total.toFixed(2)}\n`;
        });
        
        // Create and download file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${currentPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Sales report exported successfully!');
        
    } catch (error) {
        console.error('Error exporting sales:', error);
        showNotification('Failed to export sales data', 'error');
    }
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existing = document.querySelector('.notification-toast');
    if (existing) {
        existing.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
