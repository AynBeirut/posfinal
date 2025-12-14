/**
 * ===================================
 * AYN BEIRUT POS - ADMIN DASHBOARD
 * Client Admin Level Access
 * ===================================
 */

let currentAdminTab = 'overview';

/**
 * Initialize Admin Dashboard
 */
function initAdminDashboard() {
    console.log('🔧 Initializing Admin Dashboard button');
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            console.log('⚙️ Admin button clicked');
            openAdminDashboard();
        });
        console.log('✅ Admin button listener attached');
    } else {
        console.warn('⚠️ Admin button not found');
    }
}

/**
 * Open Admin Dashboard
 */
function openAdminDashboard() {
    const user = getCurrentUser ? getCurrentUser() : { role: 'admin', username: 'admin', id: 1 };
    
    console.log('🔧 Opening admin dashboard for user:', user.username);
    
    // Show modal FIRST
    const modal = document.getElementById('admin-dashboard-modal');
    if (modal) {
        modal.classList.add('active');
        console.log('✅ Admin dashboard modal opened');
    } else {
        console.error('❌ Admin dashboard modal not found');
        return;
    }
    
    // Wait for modal to render, then load data
    setTimeout(() => {
        // Load appropriate tab based on role
        if (user.role === 'admin') {
            currentAdminTab = 'overview';
        } else {
            currentAdminTab = 'overview';
        }
        
        loadAdminTab(currentAdminTab);
    }, 200);
}

/**
 * Close Admin Dashboard
 */
function closeAdminDashboard() {
    const modal = document.getElementById('admin-dashboard-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Load Admin Tab Content
 */
function loadAdminTab(tabName) {
    // Update active tab button
    const adminModal = document.getElementById('admin-dashboard-modal');
    if (adminModal) {
        adminModal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetBtn = adminModal.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
    }
    
    // Hide all tab contents
    document.querySelectorAll('[id^="admin-tab-"]').forEach(content => {
        content.style.display = 'none';
    });
    
    // Show selected tab
    const tabContent = document.getElementById(`admin-tab-${tabName}`);
    if (tabContent) {
        tabContent.style.display = 'block';
    }
    
    // Load tab-specific data
    switch (tabName) {
        case 'overview':
            loadOverviewData();
            break;
    }
}

/**
 * Load Overview Data
 */
async function loadOverviewData() {
    console.log('📊 Loading overview data...');
    
    // Wait a moment for DOM to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
        // Active users (hardcoded for this version - admin + cashier)
        const usersCount = 2;
        console.log('👥 Users count:', usersCount);
        const usersElement = document.getElementById('overview-users-count');
        console.log('Users element:', usersElement);
        if (usersElement) {
            usersElement.textContent = usersCount;
            console.log('✅ Updated users count');
        } else {
            console.error('❌ Element not found: overview-users-count');
        }
        
        // Phonebook clients count
        try {
            const clients = await getAllCustomers();
            const clientsCount = clients ? clients.length : 0;
            console.log('📞 Clients count:', clientsCount);
            const clientsElement = document.getElementById('overview-clients-count');
            console.log('Clients element:', clientsElement);
            if (clientsElement) {
                clientsElement.textContent = clientsCount;
                console.log('✅ Updated clients count');
            } else {
                console.error('❌ Element not found: overview-clients-count');
            }
        } catch (e) {
            console.error('Error getting customers:', e);
            const clientsElement = document.getElementById('overview-clients-count');
            if (clientsElement) clientsElement.textContent = '0';
        }
        
        // Today's sales total
        try {
            const todaySales = await getTodaySales();
            console.log('💰 Today sales data:', todaySales);
            const salesTotal = todaySales ? todaySales.reduce((sum, sale) => sum + sale.total, 0) : 0;
            console.log('💰 Sales total:', salesTotal);
            const salesElement = document.getElementById('overview-sales-total');
            console.log('Sales element:', salesElement);
            if (salesElement) {
                salesElement.textContent = `$${salesTotal.toFixed(2)}`;
                console.log('✅ Updated sales total');
            } else {
                console.error('❌ Element not found: overview-sales-total');
            }
        } catch (e) {
            console.error('Error getting sales:', e);
            const salesElement = document.getElementById('overview-sales-total');
            if (salesElement) salesElement.textContent = '$0.00';
        }
        
        // Today's bill payments total (not available in this version)
        const billsElement = document.getElementById('overview-bills-total');
        console.log('Bills element:', billsElement);
        if (billsElement) {
            billsElement.textContent = '$0.00';
            console.log('✅ Updated bills total');
        } else {
            console.error('❌ Element not found: overview-bills-total');
        }
        
        // Sync queue (not implemented in this version)
        const queueElement = document.getElementById('overview-sync-queue');
        console.log('Queue element:', queueElement);
        if (queueElement) {
            queueElement.textContent = '0';
            console.log('✅ Updated sync queue');
        } else {
            console.error('❌ Element not found: overview-sync-queue');
        }
        
        // Last sync
        const syncElement = document.getElementById('overview-last-sync');
        console.log('Sync element:', syncElement);
        if (syncElement) {
            syncElement.textContent = 'Never';
            console.log('✅ Updated last sync');
        } else {
            console.error('❌ Element not found: overview-last-sync');
        }
        
        console.log('✅ Overview data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading overview data:', error);
        console.error('Error details:', error.message, error.stack);
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.openAdminDashboard = openAdminDashboard;
    window.closeAdminDashboard = closeAdminDashboard;
    window.loadAdminTab = loadAdminTab;
    window.initAdminDashboard = initAdminDashboard;
}
