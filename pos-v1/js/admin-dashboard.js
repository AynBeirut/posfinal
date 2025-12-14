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
        
        // Attach company info form handler NOW (after modal is visible)
        setTimeout(() => {
            const companyInfoForm = document.getElementById('company-info-form');
            if (companyInfoForm) {
                // Remove any existing listeners first
                companyInfoForm.onsubmit = null;
                
                companyInfoForm.addEventListener('submit', function(event) {
                    console.log('🔵 Form submit event triggered!');
                    event.preventDefault();
                    event.stopPropagation();
                    saveCompanyInfoForm();
                    return false;
                });
                console.log('✅ Company info form handler attached');
            } else {
                console.warn('⚠️ Company info form not found yet');
            }
        }, 100);
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
                loadUsersList();
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
        const users = runQuery('SELECT COUNT(*) as count FROM users WHERE isActive = 1');
        document.getElementById('stat-active-users').textContent = users[0].count;
        
        // Phonebook clients count
        const clients = runQuery('SELECT COUNT(*) as count FROM phonebook');
        document.getElementById('stat-phonebook-clients').textContent = clients[0].count;
        
        // Today's sales total
        const today = new Date().toISOString().split('T')[0];
        const sales = runQuery(
            'SELECT SUM(CAST(json_extract(totals, "$.total") AS REAL)) as total FROM sales WHERE date = ?',
            [today]
        );
        const salesTotal = sales[0].total || 0;
        document.getElementById('stat-today-sales').textContent = `$${salesTotal.toFixed(2)}`;
        
        // Today's bill payments total
        const todayTimestamp = new Date(today).getTime();
        const bills = runQuery(
            'SELECT SUM(amount) as total FROM bill_payments WHERE timestamp >= ?',
            [todayTimestamp]
        );
        const billsTotal = bills[0].total || 0;
        document.getElementById('stat-today-bills').textContent = `$${billsTotal.toFixed(2)}`;
        
        // Pending sync queue
        const queue = runQuery('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0');
        document.getElementById('stat-sync-queue').textContent = queue[0].count;
        
        // Last VPS sync
        const lastSync = getAppSetting('last_sync_time');
        if (lastSync) {
            const date = new Date(parseInt(lastSync));
            document.getElementById('stat-last-sync').textContent = date.toLocaleString();
        } else {
            document.getElementById('stat-last-sync').textContent = 'Never';
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
        
        console.log('📖 loadCompanyInfo - Database result:', company);
        
        if (company.length > 0) {
            const info = company[0];
            const nameField = document.getElementById('company-name');
            const phoneField = document.getElementById('company-phone');
            const websiteField = document.getElementById('company-website');
            const emailField = document.getElementById('company-email');
            const taxIdField = document.getElementById('company-taxid');
            const addressField = document.getElementById('company-address');
            
            if (nameField) nameField.value = info.companyName || '';
            if (websiteField) websiteField.value = info.website || '';
            if (emailField) emailField.value = info.email || '';
            if (taxIdField) taxIdField.value = info.taxId || '';
            if (addressField) addressField.value = info.address || '';
            
            // Parse phone number into country code + local number
            if (info.phone && info.phone.trim().length > 0) {
                const countryCodeSelector = document.getElementById('country-code-company');
                
                if (phoneField && countryCodeSelector) {
                    // Extract country code and local number
                    const phoneMatch = info.phone.match(/^\+(\d{1,3})\s*(.*)$/);
                    if (phoneMatch) {
                        const extractedCode = '+' + phoneMatch[1];
                        const localNumber = phoneMatch[2].replace(/\D/g, ''); // Remove all non-digits
                        
                        countryCodeSelector.value = extractedCode;
                        phoneField.value = localNumber;
                        
                        console.log('\ud83d\udcde Loaded phone:', { code: extractedCode, local: localNumber });
                    } else {
                        phoneField.value = info.phone;
                    }
                } else if (phoneField) {
                    phoneField.value = info.phone;
                }
            } else if (phoneField) {
                phoneField.value = '';
            }
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
        console.log('🔵 Step 1: Starting saveCompanyInfoForm...');
        
        const user = getCurrentUser();
        console.log('🔵 Step 2: Got user:', user);
        
        const companyName = document.getElementById('company-name').value.trim();
        const phoneNumber = document.getElementById('company-phone')?.value.trim() || '';
        const countryCode = document.getElementById('country-code-company')?.value || '+961';
        const website = document.getElementById('company-website').value.trim();
        const email = document.getElementById('company-email').value.trim();
        const taxId = document.getElementById('company-taxid').value.trim();
        const address = document.getElementById('company-address').value.trim();
        
        console.log('🔵 Step 3: Collected form values:', {
            companyName,
            phoneNumber,
            countryCode,
            website,
            email,
            taxId,
            address
        });
        
        if (!companyName) {
            alert('Company name is required');
            return;
        }
        
        console.log('🔵 Step 4: Validation passed');
        
        // Combine country code with phone number (optional)
        let phone = '';
        if (phoneNumber && phoneNumber.length > 0) {
            if (typeof validateAndFormatPhone === 'function') {
                const phoneResult = validateAndFormatPhone(phoneNumber, countryCode);
                phone = phoneResult.valid ? phoneResult.normalized : (countryCode + phoneNumber);
                console.log('🔵 Step 5: Phone validated:', phoneResult);
            } else {
                phone = countryCode + phoneNumber;
                console.log('🔵 Step 5: Phone concatenated (no validation function)');
            }
        } else {
            console.log('🔵 Step 5: No phone number provided');
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
        
        console.log('🔵 Step 6: Prepared company data:', companyData);
        console.log('🔵 Step 7: Checking if saveCompanyInfo exists:', typeof saveCompanyInfo);
        
        if (typeof saveCompanyInfo !== 'function') {
            throw new Error('saveCompanyInfo function not available');
        }
        
        console.log('🔵 Step 8: Calling saveCompanyInfo...');
        
        // Use the saveCompanyInfo function from db-sql.js
        await saveCompanyInfo(companyData);
        
        console.log('🟢 SUCCESS: Company info saved to database');
        alert('✅ Company info saved successfully!');
        showNotification('Company info updated successfully', 'success');
        
        // Reinitialize country code selectors with new default
        if (typeof initCountryCodeSelectors === 'function') {
            console.log('🔵 Step 9: Reinitializing country codes...');
            await initCountryCodeSelectors();
        }
        
        console.log('🟢 COMPLETE: All steps finished successfully');
        
    } catch (error) {
        console.error('🔴 ERROR at some step:', error);
        console.error('🔴 Error name:', error.name);
        console.error('🔴 Error message:', error.message);
        console.error('🔴 Error stack:', error.stack);
        alert('❌ Failed to save company info:\n\n' + error.message + '\n\nCheck console (F12) for details');
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
