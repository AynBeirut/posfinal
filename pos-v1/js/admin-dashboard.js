/**
 * ===================================
 * AYN BEIRUT POS - ADMIN DASHBOARD
 * Client Admin Level Access
 * ===================================
 */

let currentAdminTab = 'overview';
let companyLogoBase64 = null;

/**
 * Handle Logo Upload
 */
function handleLogoUpload(input) {
    const file = input.files[0];
    if (!file) {
        companyLogoBase64 = null;
        document.getElementById('logo-preview').style.display = 'none';
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        input.value = '';
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB');
        input.value = '';
        return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = function(e) {
        companyLogoBase64 = e.target.result;
        const preview = document.getElementById('logo-preview');
        preview.src = companyLogoBase64;
        preview.style.display = 'block';
        console.log('✅ Logo uploaded and converted to base64');
    };
    reader.onerror = function() {
        alert('Error reading image file');
        input.value = '';
    };
    reader.readAsDataURL(file);
}

/**
 * Initialize Admin Dashboard
 */
function initAdminDashboard() {
    // Guard to prevent duplicate initialization
    if (window._adminDashboardInitialized) {
        console.log('⚠️ Admin Dashboard already initialized, skipping...');
        return;
    }
    window._adminDashboardInitialized = true;
    
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
        case 'logs':
            if (user.role === 'admin') {
                initActivityLogsTab();
            }
            break;
        case 'bill-types':
            if (user.role === 'admin') {
                loadBillTypes();
            }
            break;
        case 'reports':
            // The reports tab already has a button to open the modal
            // No action needed here - just show the tab content
            break;
        case 'balance':
            // Render balance data when the tab is loaded
            if (typeof window.renderBalanceInAdminTab === 'function') {
                window.renderBalanceInAdminTab();
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
            
            // Load logo if available
            if (info.logo) {
                companyLogoBase64 = info.logo;
                const preview = document.getElementById('logo-preview');
                if (preview) {
                    preview.src = info.logo;
                    preview.style.display = 'block';
                }
            }
            
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
 * Handle company logo upload
 */
function handleLogoUpload(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    
    // Validate file type
    if (!file.type.match('image.*')) {
        alert('Please select an image file (PNG, JPG, etc.)');
        input.value = '';
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('Image file is too large. Please select an image smaller than 2MB.');
        input.value = '';
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Create canvas for resizing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate dimensions (max 512x512, maintain aspect ratio)
            let width = img.width;
            let height = img.height;
            const maxSize = 512;
            
            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = (height / width) * maxSize;
                    width = maxSize;
                } else {
                    width = (width / height) * maxSize;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to base64
            const resizedBase64 = canvas.toDataURL('image/png', 0.9);
            
            // Store globally
            window.companyLogoBase64 = resizedBase64;
            
            // Show preview
            const preview = document.getElementById('logo-preview');
            if (preview) {
                preview.src = resizedBase64;
                preview.style.display = 'block';
            }
            
            console.log('✅ Logo uploaded and resized:', {
                originalSize: `${img.width}x${img.height}`,
                resizedSize: `${width}x${height}`,
                dataSize: `${(resizedBase64.length / 1024).toFixed(2)} KB`
            });
        };
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
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
            logo: companyLogoBase64,
            updatedBy: user.id
        };
        
        console.log('🔵 Step 6: Prepared company data (with logo):', { ...companyData, logo: companyLogoBase64 ? 'base64 data present' : 'no logo' });
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
        document.querySelector('[data-tab="logs"]')?.style.setProperty('display', 'none');
        document.querySelector('[data-tab="database"]')?.style.setProperty('display', 'none');
        document.querySelector('[data-tab="bill-types"]')?.style.setProperty('display', 'none');
    }
    
    console.log('✅ Admin dashboard button handlers initialized');
}

/**
 * ===================================
 * ACTIVITY LOGS TAB FUNCTIONS
 * ===================================
 */

let currentLogsPage = 1;
const logsPerPage = 50;
let allActivityLogs = [];
let filteredLogs = [];

/**
 * Initialize Activity Logs Tab
 */
async function initActivityLogsTab() {
    console.log('📋 Initializing Activity Logs tab');
    
    // Load users into filter dropdown
    try {
        const users = await runQuery('SELECT id, username, name FROM users ORDER BY username');
        const userSelect = document.getElementById('log-filter-user');
        if (userSelect) {
            userSelect.innerHTML = '<option value="">All Users</option>';
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.name || user.username} (${user.username})`;
                userSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('❌ Failed to load users for filter:', error);
    }
    
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const startInput = document.getElementById('log-filter-start-date');
    const endInput = document.getElementById('log-filter-end-date');
    
    if (startInput) startInput.value = startDate.toISOString().split('T')[0];
    if (endInput) endInput.value = endDate.toISOString().split('T')[0];
    
    // Load logs automatically
    await loadActivityLogs();
}

/**
 * Load Activity Logs with Filters
 */
async function loadActivityLogs() {
    console.log('📋 Loading activity logs...');
    
    try {
        // Build query with filters
        let query = `
            SELECT a.*, u.username, u.name, u.role
            FROM activity a
            LEFT JOIN users u ON a.userId = u.id
            WHERE 1=1
        `;
        const params = [];
        
        // Filter by user
        const userId = document.getElementById('log-filter-user')?.value;
        if (userId) {
            query += ' AND a.userId = ?';
            params.push(parseInt(userId));
        }
        
        // Filter by action
        const action = document.getElementById('log-filter-action')?.value;
        if (action) {
            query += ' AND a.action = ?';
            params.push(action);
        }
        
        // Filter by date range
        const startDate = document.getElementById('log-filter-start-date')?.value;
        if (startDate) {
            const startTimestamp = new Date(startDate).setHours(0, 0, 0, 0);
            query += ' AND a.timestamp >= ?';
            params.push(startTimestamp);
        }
        
        const endDate = document.getElementById('log-filter-end-date')?.value;
        if (endDate) {
            const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);
            query += ' AND a.timestamp <= ?';
            params.push(endTimestamp);
        }
        
        query += ' ORDER BY a.timestamp DESC LIMIT 1000';
        
        // Execute query
        allActivityLogs = await runQuery(query, params);
        filteredLogs = allActivityLogs;
        
        console.log(`✅ Loaded ${allActivityLogs.length} activity logs`);
        
        // Update stats
        updateLogStats();
        
        // Reset to page 1
        currentLogsPage = 1;
        
        // Render table
        renderLogsTable();
        
    } catch (error) {
        console.error('❌ Failed to load activity logs:', error);
        showNotification('Failed to load activity logs', 'error');
    }
}

/**
 * Update Log Statistics
 */
function updateLogStats() {
    // Total logs
    const totalEl = document.getElementById('log-stat-total');
    if (totalEl) totalEl.textContent = filteredLogs.length.toLocaleString();
    
    // Today's activity
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayCount = filteredLogs.filter(log => log.timestamp >= todayStart).length;
    const todayEl = document.getElementById('log-stat-today');
    if (todayEl) todayEl.textContent = todayCount.toLocaleString();
    
    // Active users
    const uniqueUsers = new Set(filteredLogs.map(log => log.userId));
    const usersEl = document.getElementById('log-stat-users');
    if (usersEl) usersEl.textContent = uniqueUsers.size.toLocaleString();
    
    // Last activity
    if (filteredLogs.length > 0) {
        const lastLog = filteredLogs[0]; // Already sorted DESC
        const lastDate = new Date(lastLog.timestamp);
        const lastEl = document.getElementById('log-stat-last');
        if (lastEl) {
            const timeAgo = getTimeAgo(lastDate);
            lastEl.textContent = timeAgo;
            lastEl.title = lastDate.toLocaleString();
        }
    }
}

/**
 * Render Logs Table
 */
function renderLogsTable() {
    const tbody = document.getElementById('activity-logs-table-body');
    if (!tbody) return;
    
    if (filteredLogs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 40px; text-align: center; color: var(--light-grey);">
                    <div style="font-size: 3em; margin-bottom: 10px;">🔍</div>
                    <div>No activity logs found with the selected filters</div>
                </td>
            </tr>
        `;
        document.getElementById('logs-pagination').style.display = 'none';
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    const startIndex = (currentLogsPage - 1) * logsPerPage;
    const endIndex = Math.min(startIndex + logsPerPage, filteredLogs.length);
    const pageLog = filteredLogs.slice(startIndex, endIndex);
    
    // Render rows
    tbody.innerHTML = pageLog.map(log => {
        const date = new Date(log.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        
        // Parse details JSON
        let description = '';
        try {
            const details = JSON.parse(log.details || '{}');
            description = details.description || log.action;
        } catch (e) {
            description = log.action;
        }
        
        // Format action badge
        const actionBadge = getActionBadge(log.action);
        
        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" 
                onmouseover="this.style.background='rgba(28, 117, 188, 0.1)'" 
                onmouseout="this.style.background='transparent'">
                <td style="padding: 10px;">
                    <div style="font-weight: 500;">${dateStr}</div>
                    <div style="font-size: 0.85em; color: var(--light-grey);">${timeStr}</div>
                </td>
                <td style="padding: 10px;">
                    <div style="font-weight: 500;">${log.name || log.username}</div>
                    <div style="font-size: 0.85em; color: var(--light-grey);">${log.role}</div>
                </td>
                <td style="padding: 10px;">
                    ${actionBadge}
                </td>
                <td style="padding: 10px; color: var(--light-grey);">
                    ${escapeHtml(description)}
                </td>
            </tr>
        `;
    }).join('');
    
    // Update pagination
    updateLogsPagination(totalPages);
}

/**
 * Get Action Badge
 */
function getActionBadge(action) {
    const badges = {
        'login': '<span style="background: #4CAF50; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">🔓 Login</span>',
        'logout': '<span style="background: #9E9E9E; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">🔒 Logout</span>',
        'sale': '<span style="background: #2196F3; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">💰 Sale</span>',
        'refund': '<span style="background: #FF9800; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">↩️ Refund</span>',
        'cash_shift': '<span style="background: #9C27B0; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">💵 Cash Shift</span>',
        'bank_transfer': '<span style="background: #00BCD4; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">🏦 Bank Transfer</span>',
        'cash_adjustment': '<span style="background: #FFC107; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">💸 Cash Adjustment</span>',
        'supplier_add': '<span style="background: #4CAF50; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">➕ Supplier Added</span>',
        'supplier_edit': '<span style="background: #2196F3; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">✏️ Supplier Edited</span>',
        'supplier_delete': '<span style="background: #F44336; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">🗑️ Supplier Deleted</span>',
        'delivery_receive': '<span style="background: #8BC34A; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">📦 Delivery</span>',
        'supplier_payment': '<span style="background: #673AB7; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">💳 Supplier Payment</span>',
        'payment_delete': '<span style="background: #F44336; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">❌ Payment Deleted</span>',
        'order': '<span style="background: #FF5722; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">📝 Order</span>',
        'order_modification': '<span style="background: #FF9800; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">✏️ Order Modified</span>',
    };
    
    return badges[action] || `<span style="background: #607D8B; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">${action}</span>`;
}

/**
 * Update Logs Pagination
 */
function updateLogsPagination(totalPages) {
    const pagination = document.getElementById('logs-pagination');
    const pageInfo = document.getElementById('logs-page-info');
    const prevBtn = document.getElementById('logs-prev-btn');
    const nextBtn = document.getElementById('logs-next-btn');
    
    if (!pagination || !pageInfo) return;
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    pageInfo.textContent = `Page ${currentLogsPage} of ${totalPages} (${filteredLogs.length} total logs)`;
    
    if (prevBtn) prevBtn.disabled = currentLogsPage === 1;
    if (nextBtn) nextBtn.disabled = currentLogsPage === totalPages;
}

/**
 * Load Logs Page (Next/Prev)
 */
function loadLogsPage(direction) {
    if (direction === 'next') {
        currentLogsPage++;
    } else if (direction === 'prev') {
        currentLogsPage--;
    }
    
    renderLogsTable();
    
    // Scroll to top of table
    document.querySelector('.data-table')?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Clear Log Filters
 */
function clearLogFilters() {
    document.getElementById('log-filter-user').value = '';
    document.getElementById('log-filter-action').value = '';
    
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('log-filter-start-date').value = startDate.toISOString().split('T')[0];
    document.getElementById('log-filter-end-date').value = endDate.toISOString().split('T')[0];
    
    loadActivityLogs();
}

/**
 * Export Activity Logs to CSV (using shared export utilities)
 */
async function exportActivityLogs(format) {
    if (filteredLogs.length === 0) {
        showNotification('No logs to export', 'warning');
        return;
    }
    
    try {
        if (!format) {
            showNotification('Please select an export format', 'error');
            return;
        }

        // Prepare data for export
        const exportData = filteredLogs.map(log => {
            const date = new Date(log.timestamp);
            
            let description = '';
            try {
                const details = JSON.parse(log.details || '{}');
                description = details.description || log.action;
            } catch (e) {
                description = log.action;
            }
            
            return {
                'date': date.toLocaleDateString(),
                'time': date.toLocaleTimeString(),
                'user': log.name || log.username,
                'role': log.role,
                'action': log.action,
                'description': description
            };
        });
        
        const filename = `activity-logs-${new Date().toISOString().split('T')[0]}`;
        
        // Export based on format
        switch (format) {
            case 'csv':
                if (typeof exportToCSV === 'function') {
                    const columns = [
                        {header: 'Date', key: 'date'},
                        {header: 'Time', key: 'time'},
                        {header: 'User', key: 'user'},
                        {header: 'Role', key: 'role'},
                        {header: 'Action', key: 'action'},
                        {header: 'Description', key: 'description'}
                    ];
                    await exportToCSV(exportData, columns, filename);
                    showNotification(`✅ Exported ${filteredLogs.length} logs as CSV`, 'success');
                } else {
                    throw new Error('Export utilities not loaded');
                }
                break;
            
            case 'excel':
                if (typeof exportToExcel === 'function') {
                    const columns = [
                        {header: 'Date', key: 'date', width: 15},
                        {header: 'Time', key: 'time', width: 12},
                        {header: 'User', key: 'user', width: 20},
                        {header: 'Role', key: 'role', width: 12},
                        {header: 'Action', key: 'action', width: 20},
                        {header: 'Description', key: 'description', width: 40}
                    ];
                    await exportToExcel(exportData, columns, filename, 'Activity Logs');
                    showNotification(`✅ Exported ${filteredLogs.length} logs as Excel`, 'success');
                } else {
                    throw new Error('Export utilities not loaded');
                }
                break;
            
            case 'pdf':
                if (typeof exportToPDF === 'function') {
                    const columns = [
                        {header: 'Date', dataKey: 'date'},
                        {header: 'Time', dataKey: 'time'},
                        {header: 'User', dataKey: 'user'},
                        {header: 'Role', dataKey: 'role'},
                        {header: 'Action', dataKey: 'action'},
                        {header: 'Description', dataKey: 'description'}
                    ];
                    await exportToPDF(exportData, columns, 'Activity Logs', filename);
                    showNotification(`✅ Exported ${filteredLogs.length} logs as PDF`, 'success');
                } else {
                    throw new Error('Export utilities not loaded');
                }
                break;
        }
        
    } catch (error) {
        console.error('❌ Failed to export logs:', error);
        showNotification('❌ Failed to export logs: ' + error.message, 'error');
    }
}

/**
 * Get time ago string
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';
    
    return Math.floor(seconds) + ' seconds ago';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
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
    window.loadActivityLogs = loadActivityLogs;
    window.clearLogFilters = clearLogFilters;
    window.exportActivityLogs = exportActivityLogs;
    window.loadLogsPage = loadLogsPage;
}
