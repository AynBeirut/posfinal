/**
 * Authentication & User Management Module
 * Handles user login, roles, permissions, and activity tracking
 */

// Default users (in production, these would be in a secure database)
const DEFAULT_USERS = [
    {
        id: 1,
        username: 'admin',
        password: 'admin123', // In production, use hashed passwords
        role: 'admin',
        name: 'Admin User',
        email: 'admin@aynbeirut.com'
    },
    {
        id: 2,
        username: 'cashier',
        password: 'cashier123',
        role: 'cashier',
        name: 'Cashier User',
        email: 'cashier@aynbeirut.com'
    }
];

// Current logged-in user
let currentUser = null;

/**
 * Initialize authentication
 */
async function initAuth() {
    // TEMPORARY: Skip authentication for testing
    // Auto-login as admin
    currentUser = {
        id: 1,
        username: 'admin',
        role: 'admin',
        name: 'Admin User',
        email: 'admin@aynbeirut.com',
        loginTime: new Date().toISOString(),
        sessionId: 'auto-' + Date.now()
    };
    
    // Initialize users database
    await initializeUsersDB();
    
    // Update UI with user info
    updateUserDisplay();
    
    // Apply role-based permissions
    applyPermissions();
    
    console.log(`✅ Auto-logged in as Admin (authentication disabled for testing)`);
    return true;
}

/**
 * Initialize users in IndexedDB
 */
async function initializeUsersDB() {
    if (!db) {
        console.warn('Database not ready, waiting...');
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!db) {
            console.error('Database still not ready');
            return;
        }
    }
    
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            
            // Check if users exist
            const countRequest = store.count();
            
            countRequest.onsuccess = () => {
                if (countRequest.result === 0) {
                    console.log('No users found, creating default users...');
                    // Add default users
                    let addedCount = 0;
                    DEFAULT_USERS.forEach(user => {
                        const addRequest = store.add(user);
                        addRequest.onsuccess = () => {
                            addedCount++;
                            console.log(`Added user: ${user.username}`);
                            if (addedCount === DEFAULT_USERS.length) {
                                console.log('✅ All default users initialized');
                                resolve();
                            }
                        };
                        addRequest.onerror = () => {
                            console.error(`Failed to add user: ${user.username}`, addRequest.error);
                        };
                    });
                } else {
                    console.log(`Found ${countRequest.result} existing users`);
                    resolve();
                }
            };
            
            countRequest.onerror = () => {
                console.error('Failed to count users:', countRequest.error);
                reject(countRequest.error);
            };
            
            transaction.onerror = () => {
                console.error('Transaction error:', transaction.error);
                reject(transaction.error);
            };
        } catch (error) {
            console.error('Failed to initialize users:', error);
            reject(error);
        }
    });
}

/**
 * Login user
 */
async function login(username, password, role) {
    try {
        // Ensure users are initialized first
        await initializeUsersDB();
        
        // Find user in database
        const user = await findUser(username);
        
        if (!user) {
            console.log('User not found:', username);
            return {
                success: false,
                message: 'Invalid username or password'
            };
        }
        
        console.log('User found:', user.username, 'Expected password:', user.password, 'Provided:', password);
        
        // Verify password (in production, use proper password hashing)
        if (user.password !== password) {
            console.log('Password mismatch');
            return {
                success: false,
                message: 'Invalid username or password'
            };
        }
        
        // Verify role
        if (user.role !== role) {
            console.log('Role mismatch. User role:', user.role, 'Selected:', role);
            return {
                success: false,
                message: 'Invalid role selected'
            };
        }
        
        // Create session
        const session = {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            email: user.email,
            loginTime: new Date().toISOString(),
            sessionId: generateSessionId()
        };
        
        // Save session
        saveCurrentUser(session);
        currentUser = session;
        
        // Log activity
        await logActivity('login', `User ${username} logged in as ${role}`);
        
        console.log('Login successful:', session);
        
        return {
            success: true,
            user: session
        };
        
    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            message: 'An error occurred during login'
        };
    }
}

/**
 * Logout user
 */
async function logout() {
    if (currentUser) {
        await logActivity('logout', `User ${currentUser.username} logged out`);
    }
    
    // Clear session
    localStorage.removeItem('ayn-pos-session');
    currentUser = null;
    
    // Redirect to login page
    window.location.href = 'login.html';
}

/**
 * Find user in database
 */
async function findUser(username) {
    if (!db) return null;
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('username');
        const request = index.get(username);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get current user
 */
function getCurrentUser() {
    if (currentUser) return currentUser;
    return loadCurrentUser();
}

/**
 * Save current user to session storage
 */
function saveCurrentUser(user) {
    try {
        localStorage.setItem('ayn-pos-session', JSON.stringify(user));
    } catch (e) {
        console.error('Failed to save session:', e);
    }
}

/**
 * Load current user from session storage
 */
function loadCurrentUser() {
    try {
        const session = localStorage.getItem('ayn-pos-session');
        return session ? JSON.parse(session) : null;
    } catch (e) {
        console.error('Failed to load session:', e);
        return null;
    }
}

/**
 * Generate unique session ID
 */
function generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Update UI with user information
 */
function updateUserDisplay() {
    // Update header with user info
    const header = document.querySelector('.header-right');
    if (!header) return;
    
    // Create user info element
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.innerHTML = `
        <div class="user-name">${currentUser.name}</div>
        <div class="user-role">${currentUser.role}</div>
    `;
    
    // Create logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-btn';
    logoutBtn.className = 'btn-logout';
    logoutBtn.title = 'Logout';
    logoutBtn.innerHTML = '🚪';
    logoutBtn.addEventListener('click', logout);
    
    // Insert before status indicator
    const statusIndicator = header.querySelector('.status-indicator');
    if (statusIndicator) {
        header.insertBefore(userInfo, statusIndicator);
        header.insertBefore(logoutBtn, statusIndicator);
    }
}

/**
 * Apply role-based permissions
 */
function applyPermissions() {
    if (!currentUser) return;
    
    if (currentUser.role === 'cashier') {
        // Hide admin-only features (product management)
        const adminBtn = document.getElementById('admin-btn');
        
        if (adminBtn) adminBtn.style.display = 'none';
        
        console.log('Cashier permissions applied - can view reports but not manage products');
    } else {
        console.log('Admin permissions applied - full access');
    }
}

/**
 * Check if user has permission
 */
function hasPermission(permission) {
    if (!currentUser) return false;
    
    if (currentUser.role === 'admin') return true;
    
    // Cashier permissions
    const cashierPermissions = [
        'view_products',
        'add_to_cart',
        'checkout',
        'scan_barcode',
        'view_customer_display',
        'view_reports' // Cashiers can view sales reports
    ];
    
    return cashierPermissions.includes(permission);
}

/**
 * Log user activity
 */
async function logActivity(action, description) {
    if (!db || !currentUser) return;
    
    const activity = {
        id: Date.now(),
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        action: action,
        description: description,
        timestamp: new Date().toISOString(),
        sessionId: currentUser.sessionId
    };
    
    try {
        const transaction = db.transaction(['activity'], 'readwrite');
        const store = transaction.objectStore('activity');
        store.add(activity);
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}

/**
 * Get activity logs
 */
async function getActivityLogs(filters = {}) {
    if (!db) return [];
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['activity'], 'readonly');
        const store = transaction.objectStore('activity');
        const request = store.getAll();
        
        request.onsuccess = () => {
            let logs = request.result || [];
            
            // Apply filters
            if (filters.userId) {
                logs = logs.filter(log => log.userId === filters.userId);
            }
            
            if (filters.action) {
                logs = logs.filter(log => log.action === filters.action);
            }
            
            if (filters.startDate) {
                logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
            }
            
            if (filters.endDate) {
                logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
            }
            
            // Sort by timestamp (newest first)
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            resolve(logs);
        };
        
        request.onerror = () => reject(request.error);
    });
}
