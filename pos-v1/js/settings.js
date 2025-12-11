/**
 * ===================================
 * AYN BEIRUT POS - SETTINGS PAGE
 * Developer Level Access (Password: 6969)
 * ===================================
 */

// Settings authentication
const SETTINGS_PASSWORD = '6969';
const SETTINGS_AUTH_KEY = 'ayn_settings_auth';
const SETTINGS_SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

let settingsAuthTime = 0;
let settingsFailedAttempts = 0;
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Check if settings password authentication is valid
 */
function isSettingsAuthenticated() {
    const authTime = localStorage.getItem(SETTINGS_AUTH_KEY);
    if (!authTime) return false;
    
    const elapsed = Date.now() - parseInt(authTime);
    if (elapsed > SETTINGS_SESSION_TIMEOUT) {
        localStorage.removeItem(SETTINGS_AUTH_KEY);
        return false;
    }
    
    return true;
}

/**
 * Authenticate settings access
 */
function authenticateSettings() {
    // Check lockout
    if (settingsFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        alert('Too many failed attempts. Please wait 5 minutes.');
        return false;
    }
    
    const password = prompt('Enter Developer Password:');
    if (!password) return false;
    
    if (password === SETTINGS_PASSWORD) {
        localStorage.setItem(SETTINGS_AUTH_KEY, Date.now().toString());
        settingsFailedAttempts = 0;
        return true;
    } else {
        settingsFailedAttempts++;
        const remaining = MAX_FAILED_ATTEMPTS - settingsFailedAttempts;
        if (remaining > 0) {
            alert(`Incorrect password. ${remaining} attempts remaining.`);
        } else {
            alert('Too many failed attempts. Locked for 5 minutes.');
            setTimeout(() => {
                settingsFailedAttempts = 0;
            }, LOCKOUT_TIME);
        }
        return false;
    }
}

/**
 * Open Settings Page
 */
function openSettingsPage() {
    if (!isSettingsAuthenticated()) {
        if (!authenticateSettings()) {
            return;
        }
    }
    
    loadSettingsData();
    document.getElementById('settings-modal').classList.add('active');
}

/**
 * Close Settings Page
 */
function closeSettingsPage() {
    document.getElementById('settings-modal').classList.remove('active');
}

/**
 * Load settings data from database
 */
async function loadSettingsData() {
    try {
        // Load VPS settings
        const vpsEndpoint = getAppSetting('vps_endpoint') || '';
        const apiKey = getAppSetting('api_key') || '';
        const branchId = getAppSetting('branch_id') || '';
        const appMode = getAppSetting('app_mode') || 'sub';
        
        // Load sync settings
        const syncInterval = getAppSetting('sync_interval_minutes') || '5';
        const syncRetry = getAppSetting('sync_retry_count') || '5';
        
        // Load backup settings
        const retentionDays = getAppSetting('backup_retention_days') || '90';
        const minKeep = getAppSetting('backup_minimum_keep') || '3';
        
        // Populate form
        document.getElementById('vps-endpoint').value = vpsEndpoint;
        document.getElementById('api-key').value = apiKey;
        document.getElementById('branch-id').value = branchId;
        document.getElementById('app-mode').value = appMode;
        document.getElementById('sync-interval').value = syncInterval;
        document.getElementById('sync-retry').value = syncRetry;
        document.getElementById('retention-days').value = retentionDays;
        document.getElementById('min-backups').value = minKeep;
        
        // Update connection status
        updateConnectionStatus();
        
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

/**
 * Save settings to database
 */
async function saveSettings() {
    try {
        const vpsEndpoint = document.getElementById('vps-endpoint').value.trim();
        const apiKey = document.getElementById('api-key').value.trim();
        const branchId = document.getElementById('branch-id').value.trim();
        const appMode = document.getElementById('app-mode').value;
        const syncInterval = document.getElementById('sync-interval').value;
        const syncRetry = document.getElementById('sync-retry').value;
        const retentionDays = document.getElementById('retention-days').value;
        const minKeep = document.getElementById('min-backups').value;
        
        // Save to database
        setAppSetting('vps_endpoint', vpsEndpoint);
        setAppSetting('api_key', apiKey);
        setAppSetting('branch_id', branchId);
        setAppSetting('app_mode', appMode);
        setAppSetting('sync_interval_minutes', syncInterval);
        setAppSetting('sync_retry_count', syncRetry);
        setAppSetting('backup_retention_days', retentionDays);
        setAppSetting('backup_minimum_keep', minKeep);
        
        showNotification('Settings saved successfully', 'success');
        
        // Update sync manager if VPS enabled
        if (vpsEndpoint && apiKey && typeof updateSyncConfiguration === 'function') {
            updateSyncConfiguration();
        }
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Failed to save settings', 'error');
    }
}

/**
 * Test VPS connection
 */
async function testConnection() {
    const endpoint = document.getElementById('vps-endpoint').value.trim();
    const apiKey = document.getElementById('api-key').value.trim();
    
    if (!endpoint) {
        showNotification('Please enter VPS endpoint', 'error');
        return;
    }
    
    const statusEl = document.getElementById('connection-status');
    statusEl.textContent = 'Testing...';
    statusEl.className = 'connection-status testing';
    
    try {
        const startTime = Date.now();
        const response = await fetch(`${endpoint}/api/ping`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });
        
        const latency = Date.now() - startTime;
        
        if (response.ok) {
            statusEl.textContent = `✅ Connected (${latency}ms)`;
            statusEl.className = 'connection-status success';
            setAppSetting('last_connection_test', Date.now().toString());
        } else {
            statusEl.textContent = `❌ Failed (${response.status})`;
            statusEl.className = 'connection-status error';
        }
    } catch (error) {
        statusEl.textContent = `❌ Connection Failed`;
        statusEl.className = 'connection-status error';
        console.error('Connection test failed:', error);
    }
}

/**
 * Update connection status display
 */
function updateConnectionStatus() {
    const lastTest = getAppSetting('last_connection_test');
    const statusEl = document.getElementById('connection-status');
    
    if (lastTest) {
        const date = new Date(parseInt(lastTest));
        statusEl.textContent = `Last test: ${date.toLocaleString()}`;
        statusEl.className = 'connection-status';
    } else {
        statusEl.textContent = 'Not tested';
        statusEl.className = 'connection-status';
    }
}

/**
 * Toggle API key visibility
 */
function toggleApiKeyVisibility() {
    const input = document.getElementById('api-key');
    const btn = document.getElementById('toggle-api-key');
    
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

/**
 * Get app setting from database
 */
function getAppSetting(key) {
    try {
        const results = runQuery('SELECT value FROM app_settings WHERE key = ?', [key]);
        return results.length > 0 ? results[0].value : null;
    } catch (error) {
        console.error('Error getting app setting:', key, error);
        return null;
    }
}

/**
 * Set app setting in database
 */
async function setAppSetting(key, value) {
    try {
        await runExec(
            `INSERT OR REPLACE INTO app_settings (key, value, category, updated_at) 
             VALUES (?, ?, 'sync', ?)`,
            [key, value, Date.now()]
        );
    } catch (error) {
        console.error('Error setting app setting:', key, error);
        throw error;
    }
}

/**
 * Initialize Settings Page
 */
function initSettingsPage() {
    // Keyboard shortcut: Ctrl+Shift+S
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            openSettingsPage();
        }
    });
    
    // Event listeners
    document.getElementById('save-settings-btn')?.addEventListener('click', saveSettings);
    document.getElementById('test-connection-btn')?.addEventListener('click', testConnection);
    document.getElementById('toggle-api-key')?.addEventListener('click', toggleApiKeyVisibility);
    document.getElementById('close-settings-modal')?.addEventListener('click', closeSettingsPage);
    
    console.log('✅ Settings page initialized (Ctrl+Shift+S to open)');
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.openSettingsPage = openSettingsPage;
    window.closeSettingsPage = closeSettingsPage;
    window.initSettingsPage = initSettingsPage;
}
