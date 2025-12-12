/**
 * ===================================
 * AYN BEIRUT POS - PHONEBOOK MODULE
 * Client Registry with Phone Validation
 * ===================================
 */

let phonebookSearchTimeout = null;

/**
 * Validate and format phone number (E.164 format)
 */
function validateAndFormatPhone(phone) {
    if (!phone) return { valid: false, formatted: '', normalized: '' };
    
    // Remove all non-digit characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!normalized.startsWith('+')) {
        // If it doesn't start with +, check if it's a 10-digit US number
        if (normalized.length === 10) {
            normalized = '+1' + normalized;
        } else {
            normalized = '+' + normalized;
        }
    }
    
    // Remove any duplicate + signs
    normalized = '+' + normalized.replace(/\+/g, '');
    
    // Validate E.164 format: +[1-9]\d{1,14}
    // Must be between 7 and 15 digits total (including country code)
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    const valid = e164Regex.test(normalized);
    
    // Format for display based on country code
    let formatted = normalized;
    if (valid) {
        // US/Canada format: +1 (XXX) XXX-XXXX
        if (normalized.startsWith('+1') && normalized.length === 12) {
            const area = normalized.substring(2, 5);
            const prefix = normalized.substring(5, 8);
            const line = normalized.substring(8, 12);
            formatted = `+1 (${area}) ${prefix}-${line}`;
        }
        // Other countries: keep normalized format
        else {
            formatted = normalized;
        }
    }
    
    return { valid, formatted, normalized };
}

/**
 * Load Phonebook
 */
async function loadPhonebook() {
    try {
        const clients = await runQuery(`
            SELECT * FROM phonebook 
            ORDER BY name ASC
        `);
        
        const list = document.getElementById('phonebook-list');
        if (!list) return;
        
        if (clients.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 40px; opacity: 0.6;">
                    <div style="font-size: 48px;">📞</div>
                    <p>No clients yet</p>
                    <p style="font-size: 0.9em;">Add your first client to get started</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="phonebook-grid">';
        clients.forEach(client => {
            const phoneInfo = validateAndFormatPhone(client.phone);
            const lastVisit = client.lastVisit ? new Date(client.lastVisit).toLocaleDateString() : 'Never';
            
            html += `
                <div class="phonebook-card">
                    <div class="phonebook-card-header">
                        <h4>${escapeHtml(client.name)}</h4>
                        <div class="phonebook-card-actions">
                            <button onclick="viewClientDetails(${client.id})" class="btn-icon" title="View Details">👁️</button>
                            <button onclick="editClient(${client.id})" class="btn-icon" title="Edit">✏️</button>
                        </div>
                    </div>
                    <div class="phonebook-card-body">
                        <div class="phonebook-info">
                            <span>📱 ${phoneInfo.formatted}</span>
                            <button onclick="openWhatsApp('${phoneInfo.normalized}')" class="btn-icon" title="WhatsApp">💬</button>
                        </div>
                        ${client.email ? `<div class="phonebook-info">📧 ${escapeHtml(client.email)}</div>` : ''}
                        <div class="phonebook-stats">
                            <span>💰 $${(client.totalSpent || 0).toFixed(2)}</span>
                            <span>📅 ${lastVisit}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        list.innerHTML = html;
        
        // Update total count
        document.getElementById('phonebook-total-count').textContent = clients.length;
        
    } catch (error) {
        console.error('Error loading phonebook:', error);
    }
}

/**
 * Search Phonebook
 */
function searchPhonebook(query) {
    clearTimeout(phonebookSearchTimeout);
    
    phonebookSearchTimeout = setTimeout(() => {
        try {
            const searchQuery = `%${query}%`;
            const clients = runQuery(`
                SELECT * FROM phonebook 
                WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
                ORDER BY name ASC
            `, [searchQuery, searchQuery, searchQuery]);
            
            // Re-render with filtered results
            renderPhonebookList(clients);
            
        } catch (error) {
            console.error('Error searching phonebook:', error);
        }
    }, 300);
}

/**
 * Render phonebook list with enhanced features
 */
function renderPhonebookList(clients) {
    const list = document.getElementById('phonebook-list');
    if (!list) return;
    
    if (clients.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; opacity: 0.6;">
                <p>No clients found</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="phonebook-grid">';
    clients.forEach(client => {
        const phoneInfo = validateAndFormatPhone(client.phone);
        const lastVisit = client.lastVisit ? new Date(client.lastVisit).toLocaleDateString() : 'Never';
        const category = client.category || 'Regular';
        const balance = client.balance || 0;
        
        // Category badge color
        const categoryColors = {
            'VIP': 'background: #FFD700; color: #000',
            'Wholesale': 'background: #4CAF50; color: #fff',
            'Regular': 'background: #2196F3; color: #fff'
        };
        
        // Balance display
        let balanceDisplay = '';
        if (balance > 0) {
            balanceDisplay = `<span style="color: #f44336;" title="Customer owes">💸 $${balance.toFixed(2)}</span>`;
        } else if (balance < 0) {
            balanceDisplay = `<span style="color: #4CAF50;" title="Credit balance">💵 $${Math.abs(balance).toFixed(2)}</span>`;
        }
        
        html += `
            <div class="phonebook-card">
                <div class="phonebook-card-header">
                    <div>
                        <h4>${escapeHtml(client.name)}</h4>
                        <span class="category-badge" style="${categoryColors[category]}">${category}</span>
                    </div>
                    <div class="phonebook-card-actions">
                        <input type="checkbox" class="client-checkbox" value="${client.id}" style="width: 18px; height: 18px; cursor: pointer;">
                        <button onclick="viewClientDetails(${client.id})" class="btn-icon" title="View Details">👁️</button>
                        <button onclick="editClient(${client.id})" class="btn-icon" title="Edit">✏️</button>
                    </div>
                </div>
                <div class="phonebook-card-body">
                    <div class="phonebook-info">
                        <span>📱 ${phoneInfo.formatted}</span>
                        <button onclick="openWhatsApp('${phoneInfo.normalized}')" class="btn-icon" title="WhatsApp">💬</button>
                    </div>
                    ${client.email ? `<div class="phonebook-info">📧 ${escapeHtml(client.email)}</div>` : ''}
                    ${client.birthday ? `<div class="phonebook-info">🎂 ${new Date(client.birthday).toLocaleDateString()}</div>` : ''}
                    <div class="phonebook-stats">
                        <span>💰 $${(client.totalSpent || 0).toFixed(2)}</span>
                        ${balanceDisplay}
                        <span>📅 ${lastVisit}</span>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    list.innerHTML = html;
    
    // Update bulk action button visibility
    updateBulkActionVisibility();
}

/**
 * Update bulk action visibility based on checkboxes
 */
function updateBulkActionVisibility() {
    const checkboxes = document.querySelectorAll('.client-checkbox:checked');
    const bulkActions = document.getElementById('bulk-actions-bar');
    if (bulkActions) {
        bulkActions.style.display = checkboxes.length > 0 ? 'flex' : 'none';
        const selectedCount = document.getElementById('selected-count');
        if (selectedCount) {
            selectedCount.textContent = checkboxes.length;
        }
    }
}

/**
 * Open Add Client Form
 */
function openAddClientForm() {
    document.getElementById('phonebook-form-title').textContent = 'Add New Client';
    document.getElementById('client-form').reset();
    document.getElementById('edit-client-id').value = '';
    document.getElementById('client-form-section').style.display = 'block';
}

/**
 * Edit Client
 */
function editClient(clientId) {
    try {
        const client = runQuery('SELECT * FROM phonebook WHERE id = ?', [clientId])[0];
        
        if (!client) {
            alert('Client not found');
            return;
        }
        
        document.getElementById('phonebook-form-title').textContent = 'Edit Client';
        document.getElementById('edit-client-id').value = client.id;
        document.getElementById('client-name').value = client.name;
        document.getElementById('client-phone').value = client.phone;
        document.getElementById('client-email').value = client.email || '';
        document.getElementById('client-address').value = client.address || '';
        document.getElementById('client-category').value = client.category || 'Regular';
        document.getElementById('client-birthday').value = client.birthday || '';
        document.getElementById('client-notes').value = client.notes || '';
        document.getElementById('client-form-section').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading client:', error);
        alert('Failed to load client');
    }
}

/**
 * Save Client
 */
async function saveClient(event) {
    event.preventDefault();
    
    try {
        const user = getCurrentUser();
        const cashierId = typeof getCashierId === 'function' ? getCashierId() : 'unknown';
        
        const clientId = document.getElementById('edit-client-id').value;
        const name = document.getElementById('client-name').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        const email = document.getElementById('client-email').value.trim();
        const address = document.getElementById('client-address').value.trim();
        const category = document.getElementById('client-category').value;
        const birthday = document.getElementById('client-birthday').value;
        const notes = document.getElementById('client-notes').value.trim();
        
        // Validate
        if (!name) {
            alert('Name is required');
            return;
        }
        
        if (!phone) {
            alert('Phone number is required');
            return;
        }
        
        // Validate phone format
        const phoneInfo = validateAndFormatPhone(phone);
        if (!phoneInfo.valid) {
            alert('Invalid phone number format. Please use international format (e.g., +1234567890)');
            return;
        }
        
        // Check for duplicate phone (excluding current record if editing)
        const duplicateCheck = clientId 
            ? runQuery('SELECT id FROM phonebook WHERE phone = ? AND id != ?', [phoneInfo.normalized, clientId])
            : runQuery('SELECT id FROM phonebook WHERE phone = ?', [phoneInfo.normalized]);
        
        if (duplicateCheck.length > 0) {
            const merge = confirm('A client with this phone number already exists. Do you want to merge the records?');
            if (!merge) return;
        }
        
        if (clientId) {
            // Update existing
            await runExec(`
                UPDATE phonebook SET 
                name = ?, phone = ?, email = ?, address = ?, category = ?, birthday = ?, notes = ?, updatedAt = ?
                WHERE id = ?
            `, [name, phoneInfo.normalized, email, address, category, birthday, notes, Date.now(), clientId]);
            
            showNotification('Client updated successfully', 'success');
        } else {
            // Insert new
            await runExec(`
                INSERT INTO phonebook (name, phone, email, address, category, birthday, notes, balance, totalSpent, visitCount, createdAt, createdBy, cashierId, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, 0)
            `, [name, phoneInfo.normalized, email, address, category, birthday, notes, Date.now(), user.id, cashierId]);
            
            showNotification('Client added successfully', 'success');
        }
        
        // Close form and reload
        document.getElementById('client-form-section').style.display = 'none';
        loadPhonebook();
        
    } catch (error) {
        console.error('Error saving client:', error);
        showNotification('Failed to save client', 'error');
    }
}

/**
 * View Client Details
 */
function viewClientDetails(clientId) {
    try {
        const client = runQuery('SELECT * FROM phonebook WHERE id = ?', [clientId])[0];
        
        if (!client) {
            alert('Client not found');
            return;
        }
        
        const phoneInfo = validateAndFormatPhone(client.phone);
        const lastVisit = client.lastVisit ? new Date(client.lastVisit).toLocaleString() : 'Never';
        const birthday = client.birthday ? new Date(client.birthday).toLocaleDateString() : 'Not set';
        const balance = client.balance || 0;
        const category = client.category || 'Regular';
        
        // Get history
        let history = [];
        try {
            history = runQuery('SELECT * FROM phonebook_history WHERE client_id = ? ORDER BY timestamp DESC LIMIT 10', [clientId]);
        } catch (e) {
            // History table might not exist yet
        }
        
        let details = `👤 ${client.name}\n`;
        details += `🏷️ Category: ${category}\n`;
        details += `\n📱 Phone: ${phoneInfo.formatted}\n`;
        if (client.email) details += `📧 Email: ${client.email}\n`;
        if (client.address) details += `📍 Address: ${client.address}\n`;
        details += `🎂 Birthday: ${birthday}\n`;
        
        // Balance
        if (balance > 0) {
            details += `\n💸 Balance: $${balance.toFixed(2)} (Customer owes)\n`;
        } else if (balance < 0) {
            details += `\n💵 Credit: $${Math.abs(balance).toFixed(2)} (We owe)\n`;
        }
        
        details += `💰 Total Spent: $${(client.totalSpent || 0).toFixed(2)}\n`;
        details += `📅 Last Visit: ${lastVisit}\n`;
        details += `🔢 Visit Count: ${client.visitCount || 0}\n`;
        
        if (client.notes) details += `\n📝 Notes:\n${client.notes}\n`;
        
        // Show history
        if (history.length > 0) {
            details += `\n📋 Recent History:\n`;
            history.forEach(h => {
                const date = new Date(h.timestamp).toLocaleDateString();
                details += `  • ${date} - ${h.action}${h.notes ? ': ' + h.notes : ''}\n`;
            });
        }
        
        alert(details);
        
    } catch (error) {
        console.error('Error viewing client details:', error);
    }
}

/**
 * Open WhatsApp
 */
function openWhatsApp(phone) {
    if (!phone) return;
    const normalized = phone.replace(/[^\d]/g, '');
    window.open(`https://wa.me/${normalized}`, '_blank');
}

/**
 * Cancel Client Form
 */
function cancelClientForm() {
    document.getElementById('client-form-section').style.display = 'none';
}

/**
 * Export Phonebook CSV
 */
function exportPhonebookCSV() {
    try {
        const clients = runQuery('SELECT * FROM phonebook ORDER BY name ASC');
        
        let csv = 'Name,Phone,Email,Address,Category,Birthday,Balance,Total Spent,Last Visit\n';
        clients.forEach(client => {
            const phoneInfo = validateAndFormatPhone(client.phone);
            const lastVisit = client.lastVisit ? new Date(client.lastVisit).toLocaleDateString() : '';
            const birthday = client.birthday || '';
            csv += `"${client.name}","${phoneInfo.formatted}","${client.email || ''}","${(client.address || '').replace(/"/g, '""')}","${client.category || 'Regular'}","${birthday}","${(client.balance || 0).toFixed(2)}","${(client.totalSpent || 0).toFixed(2)}","${lastVisit}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phonebook_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        showNotification('Phonebook exported successfully', 'success');
        
    } catch (error) {
        console.error('Error exporting phonebook:', error);
        showNotification('Failed to export phonebook', 'error');
    }
}

/**
 * Apply filters to phonebook
 */
function applyPhonebookFilters() {
    try {
        const categoryFilter = document.getElementById('filter-category')?.value;
        const balanceFilter = document.getElementById('filter-balance')?.value;
        const searchQuery = document.getElementById('phonebook-search')?.value || '';
        
        let sql = 'SELECT * FROM phonebook WHERE 1=1';
        const params = [];
        
        // Category filter
        if (categoryFilter && categoryFilter !== 'all') {
            sql += ' AND category = ?';
            params.push(categoryFilter);
        }
        
        // Balance filter
        if (balanceFilter) {
            if (balanceFilter === 'debt') {
                sql += ' AND balance > 0';
            } else if (balanceFilter === 'credit') {
                sql += ' AND balance < 0';
            } else if (balanceFilter === 'zero') {
                sql += ' AND balance = 0';
            }
        }
        
        // Search query
        if (searchQuery) {
            sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
            const searchPattern = `%${searchQuery}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }
        
        sql += ' ORDER BY name ASC';
        
        const clients = runQuery(sql, params);
        renderPhonebookList(clients);
        
    } catch (error) {
        console.error('Error applying filters:', error);
    }
}

/**
 * Select/Deselect all clients
 */
function toggleSelectAll() {
    const selectAll = document.getElementById('select-all-clients');
    const checkboxes = document.querySelectorAll('.client-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateBulkActionVisibility();
}

/**
 * Bulk change category
 */
async function bulkChangeCategory() {
    const checkboxes = document.querySelectorAll('.client-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('No clients selected');
        return;
    }
    
    const newCategory = prompt('Enter new category (VIP, Regular, or Wholesale):');
    if (!newCategory || !['VIP', 'Regular', 'Wholesale'].includes(newCategory)) {
        alert('Invalid category');
        return;
    }
    
    try {
        for (const cb of checkboxes) {
            await runExec('UPDATE phonebook SET category = ?, updatedAt = ? WHERE id = ?', 
                [newCategory, Date.now(), cb.value]);
        }
        
        await saveDatabase();
        showNotification(`Updated ${checkboxes.length} clients to ${newCategory}`, 'success');
        loadPhonebook();
        
    } catch (error) {
        console.error('Error bulk updating category:', error);
        showNotification('Failed to update categories', 'error');
    }
}

/**
 * Bulk WhatsApp message
 */
function bulkWhatsApp() {
    const checkboxes = document.querySelectorAll('.client-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('No clients selected');
        return;
    }
    
    const message = prompt('Enter message to send:');
    if (!message) return;
    
    const clients = [];
    checkboxes.forEach(cb => {
        const client = runQuery('SELECT * FROM phonebook WHERE id = ?', [cb.value])[0];
        if (client) clients.push(client);
    });
    
    clients.forEach((client, index) => {
        setTimeout(() => {
            const phoneInfo = validateAndFormatPhone(client.phone);
            const url = `https://wa.me/${phoneInfo.normalized.replace('+', '')}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        }, index * 1000); // Delay between opens
    });
}

/**
 * Check for upcoming birthdays
 */
function checkBirthdayReminders() {
    try {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // Check if birthday column exists (migration might not have run yet)
        const clients = runQuery('SELECT * FROM phonebook WHERE birthday IS NOT NULL AND birthday != ""');
        const upcoming = [];
        
        clients.forEach(client => {
            if (!client.birthday) return;
            
            const bday = new Date(client.birthday);
            // Set year to current year for comparison
            bday.setFullYear(today.getFullYear());
            
            if (bday >= today && bday <= nextWeek) {
                upcoming.push({
                    name: client.name,
                    birthday: client.birthday,
                    daysUntil: Math.ceil((bday - today) / (24 * 60 * 60 * 1000))
                });
            }
        });
        
        if (upcoming.length > 0) {
            const message = upcoming.map(u => `${u.name} - ${u.daysUntil} day(s)`).join('\n');
            console.log('🎂 Upcoming birthdays:\n' + message);
            // You can add a notification here
        }
        
    } catch (error) {
        // Silently fail if birthday column doesn't exist yet (migration pending)
        if (!error.message.includes('no such column')) {
            console.error('Error checking birthdays:', error);
        }
    }
}

/**
 * Initialize Phonebook
 */
function initPhonebook() {
    // Setup search
    document.getElementById('phonebook-search')?.addEventListener('input', (e) => {
        searchPhonebook(e.target.value);
    });
    
    // Setup filters
    document.getElementById('filter-category')?.addEventListener('change', applyPhonebookFilters);
    document.getElementById('filter-balance')?.addEventListener('change', applyPhonebookFilters);
    
    // Setup bulk actions
    document.getElementById('select-all-clients')?.addEventListener('change', toggleSelectAll);
    document.getElementById('bulk-category-btn')?.addEventListener('click', bulkChangeCategory);
    document.getElementById('bulk-whatsapp-btn')?.addEventListener('click', bulkWhatsApp);
    
    // Setup checkboxes (delegated event)
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('client-checkbox')) {
            updateBulkActionVisibility();
        }
    });
    
    // Setup form submit
    document.getElementById('client-form')?.addEventListener('submit', saveClient);
    document.getElementById('cancel-client-btn')?.addEventListener('click', cancelClientForm);
    document.getElementById('add-client-btn')?.addEventListener('click', openAddClientForm);
    document.getElementById('export-phonebook-btn')?.addEventListener('click', exportPhonebookCSV);
    
    // Check birthdays on init
    checkBirthdayReminders();
    
    console.log('✅ Phonebook module initialized');
}

// Export functions
if (typeof window !== 'undefined') {
    window.loadPhonebook = loadPhonebook;
    window.searchPhonebook = searchPhonebook;
    window.openAddClientForm = openAddClientForm;
    window.editClient = editClient;
    window.saveClient = saveClient;
    window.viewClientDetails = viewClientDetails;
    window.openWhatsApp = openWhatsApp;
    window.cancelClientForm = cancelClientForm;
    window.exportPhonebookCSV = exportPhonebookCSV;
    window.initPhonebook = initPhonebook;
    window.validateAndFormatPhone = validateAndFormatPhone;
    window.applyPhonebookFilters = applyPhonebookFilters;
    window.toggleSelectAll = toggleSelectAll;
    window.bulkChangeCategory = bulkChangeCategory;
    window.bulkWhatsApp = bulkWhatsApp;
    window.checkBirthdayReminders = checkBirthdayReminders;
    window.updateBulkActionVisibility = updateBulkActionVisibility;
}
