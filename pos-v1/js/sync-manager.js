// ===================================
// AYN BEIRUT POS - SYNC MANAGER
// 5-second auto-sync with VPS server
// ===================================

let syncInterval = null;
let isSyncing = false;
let syncOnlineStatus = navigator.onLine;
let syncStatusElement = null;
let cashierId = null;
let apiEndpoint = null; // Will be configured later

const SYNC_INTERVAL_MS = 5000; // 5 seconds
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAYS = [5000, 10000, 30000, 60000, 300000]; // 5s, 10s, 30s, 1min, 5min

// ===================================
// INITIALIZATION
// ===================================

function initSyncManager(config = {}) {
    cashierId = getCashierId();
    apiEndpoint = config.apiEndpoint || '/api';
    
    console.log('🔄 Sync Manager initialized');
    console.log('📍 Cashier ID:', cashierId);
    console.log('🌐 API Endpoint:', apiEndpoint);
    
    // Setup online/offline listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Start sync interval if online
    if (syncOnlineStatus) {
        startSyncInterval();
    }
    
    // Setup UI status indicator
    setupStatusIndicator();
    
    // Initial sync
    if (syncOnlineStatus) {
        syncWithServer();
    }
}

function setupStatusIndicator() {
    syncStatusElement = document.getElementById('sync-status');
    
    if (!syncStatusElement) {
        // Create status indicator if it doesn't exist
        syncStatusElement = document.createElement('div');
        syncStatusElement.id = 'sync-status';
        syncStatusElement.className = 'sync-status';
        document.body.appendChild(syncStatusElement);
    }
    
    updateStatusIndicator(syncOnlineStatus ? 'connected' : 'offline');
}

function updateStatusIndicator(status) {
    if (!syncStatusElement) return;
    
    syncStatusElement.className = `sync-status sync-${status}`;
    
    const messages = {
        connected: '🟢 Synced',
        syncing: '🟡 Syncing...',
        pending: '🟡 Pending',
        offline: '🔴 Offline',
        error: '🔴 Sync Error'
    };
    
    syncStatusElement.textContent = messages[status] || status;
    syncStatusElement.title = `Last sync: ${new Date().toLocaleTimeString()}`;
}

// ===================================
// SYNC INTERVAL
// ===================================

function startSyncInterval() {
    if (syncInterval) return;
    
    console.log(`🔄 Starting auto-sync (every ${SYNC_INTERVAL_MS / 1000}s)`);
    
    syncInterval = setInterval(() => {
        if (isOnline && !isSyncing) {
            syncWithServer();
        }
    }, SYNC_INTERVAL_MS);
}

function stopSyncInterval() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        console.log('⏸️ Auto-sync stopped');
    }
}

// ===================================
// ONLINE/OFFLINE HANDLERS
// ===================================

function handleOnline() {
    console.log('🌐 Connection restored');
    syncOnlineStatus = true;
    updateStatusIndicator('connected');
    
    // Start syncing
    startSyncInterval();
    syncWithServer();
}

function handleOffline() {
    console.log('📡 Connection lost');
    syncOnlineStatus = false;
    updateStatusIndicator('offline');
    
    // Stop syncing
    stopSyncInterval();
}

// ===================================
// SYNC WITH SERVER
// ===================================

async function syncWithServer() {
    if (isSyncing || !syncOnlineStatus) return;
    
    isSyncing = true;
    updateStatusIndicator('syncing');
    
    try {
        // Get pending sync operations
        const pendingOps = await getPendingSyncOperations();
        
        if (pendingOps.length === 0) {
            updateStatusIndicator('connected');
            isSyncing = false;
            return;
        }
        
        console.log(`📤 Syncing ${pendingOps.length} operations...`);
        
        // Upload to server
        const response = await uploadToServer(pendingOps);
        
        if (response.success) {
            // Mark operations as synced
            for (const op of pendingOps) {
                await markSyncOperationComplete(op.id);
            }
            
            console.log(`✅ ${pendingOps.length} operations synced successfully`);
            updateStatusIndicator('connected');
        } else {
            throw new Error(response.error || 'Sync failed');
        }
        
    } catch (error) {
        console.error('❌ Sync failed:', error);
        updateStatusIndicator('error');
        
        // Schedule retry with exponential backoff
        scheduleRetry();
    } finally {
        isSyncing = false;
    }
}

async function uploadToServer(operations) {
    try {
        // Get user role and permissions
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        
        // Prepare request
        const url = `${apiEndpoint}/cashier/${cashierId}/sync/upload`;
        const body = {
            cashierId: cashierId,
            timestamp: Date.now(),
            operations: operations,
            user: {
                id: currentUser.id,
                role: currentUser.role
            }
        };
        
        // TODO: Add JWT authentication when VPS is ready
        const headers = {
            'Content-Type': 'application/json'
            // 'Authorization': `Bearer ${getAuthToken()}`
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Upload failed:', error);
        
        // If network error, mark as offline
        if (error.message.includes('Failed to fetch')) {
            handleOffline();
        }
        
        return { success: false, error: error.message };
    }
}

async function downloadFromServer() {
    try {
        const url = `${apiEndpoint}/cashier/${cashierId}/sync/download`;
        const lastSync = getSystemSetting('last_download_sync') || 0;
        
        const headers = {
            'Content-Type': 'application/json'
            // 'Authorization': `Bearer ${getAuthToken()}`
        };
        
        const response = await fetch(`${url}?since=${lastSync}`, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Apply server updates (e.g., master product catalog updates)
        if (data.updates && data.updates.length > 0) {
            await applyServerUpdates(data.updates);
            setSystemSetting('last_download_sync', Date.now());
        }
        
        return { success: true, updates: data.updates };
        
    } catch (error) {
        console.error('Download failed:', error);
        return { success: false, error: error.message };
    }
}

async function applyServerUpdates(updates) {
    console.log(`📥 Applying ${updates.length} server updates...`);
    
    for (const update of updates) {
        try {
            // Apply updates based on type
            // This will be implemented based on VPS API specification
            console.log('Applying update:', update);
        } catch (error) {
            console.error('Failed to apply update:', error);
        }
    }
}

// ===================================
// RETRY LOGIC
// ===================================

function scheduleRetry() {
    const retryCount = parseInt(getSystemSetting('sync_retry_count') || '0');
    
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
        console.warn('⚠️ Max retry attempts reached');
        updateStatusIndicator('error');
        setSystemSetting('sync_retry_count', '0');
        return;
    }
    
    const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    console.log(`🔄 Scheduling retry in ${delay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
    
    setSystemSetting('sync_retry_count', (retryCount + 1).toString());
    
    setTimeout(() => {
        syncWithServer();
    }, delay);
}

// ===================================
// MANUAL SYNC
// ===================================

async function manualSync() {
    console.log('🔄 Manual sync triggered');
    
    if (!syncOnlineStatus) {
        alert('Cannot sync while offline. Please check your internet connection.');
        return;
    }
    
    updateStatusIndicator('syncing');
    
    try {
        // Upload pending operations
        await syncWithServer();
        
        // Download server updates
        await downloadFromServer();
        
        alert('✅ Sync completed successfully');
        setSystemSetting('sync_retry_count', '0');
        
    } catch (error) {
        console.error('Manual sync failed:', error);
        alert(`❌ Sync failed: ${error.message}`);
    }
}

// ===================================
// ROLE-BASED PERMISSIONS
// ===================================

function checkPermission(action) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const role = currentUser.role || 'cashier';
    
    const permissions = {
        cashier: ['view_products', 'create_sale', 'view_customers'],
        manager: ['view_products', 'edit_products', 'manage_stock', 'create_sale', 'view_customers', 'manage_customers', 'view_reports'],
        admin: ['*'] // All permissions
    };
    
    const userPermissions = permissions[role] || permissions.cashier;
    
    // Admin has all permissions
    if (userPermissions.includes('*')) return true;
    
    // Check specific permission
    return userPermissions.includes(action);
}

function enforcePermission(action, errorMessage) {
    if (!checkPermission(action)) {
        alert(errorMessage || `You don't have permission to ${action}`);
        throw new Error(`Permission denied: ${action}`);
    }
}

// ===================================
// EXPORT TO WINDOW
// ===================================

if (typeof window !== 'undefined') {
    window.initSyncManager = initSyncManager;
    window.syncWithServer = syncWithServer;
    window.manualSync = manualSync;
    window.downloadFromServer = downloadFromServer;
    window.checkPermission = checkPermission;
    window.enforcePermission = enforcePermission;
}

console.log('📦 Sync manager module loaded');
