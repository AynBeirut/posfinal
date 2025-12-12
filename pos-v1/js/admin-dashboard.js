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
    const user = getCurrentUser ? getCurrentUser() : null;
    
    if (!user) {
        alert('Please login to access admin panel');
        return;
    }
    
    console.log('🔧 Opening admin dashboard for user:', user.username);
    
    // Load appropriate tab based on role
    if (user.role === 'admin') {
        currentAdminTab = 'overview';
    } else if (user.role === 'manager') {
        currentAdminTab = 'phonebook';
    } else {
        currentAdminTab = 'phonebook';
    }
    
    loadAdminTab(currentAdminTab);
    
    // Show modal using both methods for compatibility
    const modal = document.getElementById('admin-dashboard-modal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        console.log('✅ Admin dashboard modal opened');
    } else {
        console.error('❌ Admin dashboard modal not found');
    }
}

/**
 * Close Admin Dashboard
 */
function closeAdminDashboard() {
    const modal = document.getElementById('admin-dashboard-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

/**
 * Switch Admin Tab
 */
function switchAdminTab(tabName) {
    currentAdminTab = tabName;
    loadAdminTab(tabName);
}

/**
 * Load Admin Tab Content
 */
function loadAdminTab(tabName) {
    const user = getCurrentUser();
    
    // Update active tab button - only in admin dashboard
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
    
    // Hide all admin tab contents (all divs with IDs starting with "admin-tab-")
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
        case 'company':
            loadCompanyInfo();
            break;
        case 'users':
            if (user.role === 'admin') {
                loadUserManagement();
            }
            break;
        case 'phonebook':
            loadPhonebook();
            break;
        case 'bill-types':
            if (user.role === 'admin') {
                loadBillTypes();
            }
            break;
    }
}

/**
 * Load Overview Data
 */
async function loadOverviewData() {
    try {
        // Active users count
        const users = runQuery('SELECT COUNT(*) as count FROM users WHERE role != "admin"');
        document.getElementById('overview-users-count').textContent = users[0].count;
        
        // Phonebook clients count
        const clients = runQuery('SELECT COUNT(*) as count FROM phonebook');
        document.getElementById('overview-clients-count').textContent = clients[0].count;
        
        // Today's sales total
        const today = new Date().toISOString().split('T')[0];
        const sales = runQuery(
            'SELECT SUM(CAST(json_extract(totals, "$.total") AS REAL)) as total FROM sales WHERE date = ?',
            [today]
        );
        const salesTotal = sales[0].total || 0;
        document.getElementById('overview-sales-total').textContent = `$${salesTotal.toFixed(2)}`;
        
        // Today's bill payments total
        const todayTimestamp = new Date(today).getTime();
        const bills = runQuery(
            'SELECT SUM(amount) as total FROM bill_payments WHERE timestamp >= ?',
            [todayTimestamp]
        );
        const billsTotal = bills[0].total || 0;
        document.getElementById('overview-bills-total').textContent = `$${billsTotal.toFixed(2)}`;
        
        // Pending sync queue
        const queue = runQuery('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0');
        document.getElementById('overview-sync-queue').textContent = queue[0].count;
        
        // Last VPS sync
        const lastSync = getAppSetting('last_sync_time');
        if (lastSync) {
            const date = new Date(parseInt(lastSync));
            document.getElementById('overview-last-sync').textContent = date.toLocaleString();
        } else {
            document.getElementById('overview-last-sync').textContent = 'Never';
        }
        
    } catch (error) {
        console.error('Error loading overview data:', error);
    }
}

/**
 * Load Company Info
 */
function loadCompanyInfo() {
    try {
        const company = runQuery('SELECT * FROM company_info WHERE id = 1');
        
        if (company.length > 0) {
            const info = company[0];
            const nameField = document.getElementById('company-name');
            const phoneField = document.getElementById('company-phone');
            const websiteField = document.getElementById('company-website');
            const emailField = document.getElementById('company-email');
            const taxIdField = document.getElementById('company-taxid');
            const addressField = document.getElementById('company-address');
            
            if (nameField) nameField.value = info.companyName || '';
            if (phoneField) phoneField.value = info.phone || '';
            if (websiteField) websiteField.value = info.website || '';
            if (emailField) emailField.value = info.email || '';
            if (taxIdField) taxIdField.value = info.taxId || '';
            if (addressField) addressField.value = info.address || '';
        }
    } catch (error) {
        console.error('Error loading company info:', error);
    }
}

/**
 * Save Company Info
 */
async function saveCompanyInfoForm() {
    try {
        const user = getCurrentUser();
        const companyName = document.getElementById('company-name').value.trim();
        const phone = document.getElementById('company-phone').value.trim();
        const website = document.getElementById('company-website').value.trim();
        const email = document.getElementById('company-email').value.trim();
        const taxId = document.getElementById('company-taxid').value.trim();
        const address = document.getElementById('company-address').value.trim();
        
        if (!companyName) {
            alert('Company name is required');
            return;
        }
        
        const companyData = {
            companyName,
            phone,
            website,
            email,
            taxId,
            address,
            updatedBy: user.id
        };
        
        console.log('💾 Saving company info:', companyData);
        
        // Use the saveCompanyInfo function from db-sql.js
        await saveCompanyInfo(companyData);
        
        console.log('✅ Company info saved successfully');
        showNotification('Company info updated successfully', 'success');
        
    } catch (error) {
        console.error('❌ Error saving company info:', error);
        showNotification('Failed to save company info', 'error');
    }
}

/**
 * Preview Receipt with Company Info
 */
function previewReceipt() {
    const company = runQuery('SELECT * FROM company_info WHERE id = 1')[0];
    
    let preview = '=================================\n';
    preview += `${company.companyName || 'Your Company'}\n`;
    if (company.phone) preview += `Phone: ${company.phone}\n`;
    if (company.website) preview += `Web: ${company.website}\n`;
    if (company.email) preview += `Email: ${company.email}\n`;
    preview += '=================================\n';
    preview += '\n[Transaction Details Here]\n\n';
    preview += '=================================\n';
    preview += 'Thank you for your business!\n';
    if (company.taxId) preview += `Tax ID: ${company.taxId}\n`;
    preview += 'Powered by Ayn Beirut POS\n';
    preview += '=================================';
    
    alert(preview);
}

/**
 * Initialize Admin Dashboard - Setup button handlers
 */
function setupAdminDashboardHandlers() {
    const user = getCurrentUser ? getCurrentUser() : null;
    
    // Setup tab buttons
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            switchAdminTab(tab);
        });
    });
    
    // Setup company info form submit event
    const companyInfoForm = document.getElementById('company-info-form');
    if (companyInfoForm) {
        companyInfoForm.addEventListener('submit', function(event) {
            event.preventDefault();
            saveCompanyInfoForm();
        });
    }
    document.getElementById('preview-receipt-btn')?.addEventListener('click', previewReceipt);
    
    // Setup close button
    document.getElementById('close-admin-dashboard')?.addEventListener('click', closeAdminDashboard);
    
    // Hide tabs based on role
    if (user && user.role !== 'admin') {
        document.querySelector('[data-tab="company"]')?.style.setProperty('display', 'none');
        document.querySelector('[data-tab="users"]')?.style.setProperty('display', 'none');
        document.querySelector('[data-tab="bill-types"]')?.style.setProperty('display', 'none');
    }
    
    console.log('✅ Admin dashboard button handlers initialized');
}

// Export functions
if (typeof window !== 'undefined') {
    window.openAdminDashboard = openAdminDashboard;
    window.closeAdminDashboard = closeAdminDashboard;
    window.switchAdminTab = switchAdminTab;
    window.initAdminDashboard = initAdminDashboard;
    window.setupAdminDashboardHandlers = setupAdminDashboardHandlers;
    window.saveCompanyInfo = saveCompanyInfo;
    window.previewReceipt = previewReceipt;
}
