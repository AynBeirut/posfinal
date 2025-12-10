// ===================================
// AYN BEIRUT POS - PRODUCT MANAGEMENT
// Add, edit, delete products through UI
// ===================================

let isEditMode = false;
let editingProductId = null;

// ===================================
// INITIALIZE PRODUCT MANAGEMENT
// ===================================

function initProductManagement() {
    const adminBtn = document.getElementById('admin-btn');
    const productModal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const cancelEditBtn = document.getElementById('cancel-edit');
    
    // Open admin panel
    adminBtn.addEventListener('click', () => {
        openProductManagement();
    });
    
    // Setup modal close handlers
    setupProductModal();
    
    // Initialize database management panel
    initDatabaseManagement();
    
    // Handle form submission
    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (isEditMode) {
            updateProduct();
        } else {
            addNewProduct();
        }
    });
    
    // Cancel edit
    cancelEditBtn.addEventListener('click', () => {
        cancelEdit();
    });
    
    // Import/Export buttons
    document.getElementById('import-products').addEventListener('click', importProducts);
    document.getElementById('export-products').addEventListener('click', exportProducts);
    
    console.log('✅ Product Management initialized');
}

// ===================================
// MODAL MANAGEMENT
// ===================================

function openProductManagement() {
    const modal = document.getElementById('product-modal');
    modal.classList.add('show');
    refreshProductList();
    updateDatabaseInfo(); // Update database management info
}

function setupProductModal() {
    const modal = document.getElementById('product-modal');
    const closeBtn = modal.querySelector('.modal-close');
    
    closeBtn.onclick = () => {
        modal.classList.remove('show');
        cancelEdit();
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            cancelEdit();
        }
    };
}

// ===================================
// PRODUCT DATABASE OPERATIONS
// ===================================

async function loadProductsFromDB() {
    if (!db) {
        console.warn('⚠️ Database not ready, using default products');
        return [...PRODUCTS]; // Return a copy
    }
    
    try {
        const products = runQuery('SELECT * FROM products');
        console.log('📊 Products in DB:', products.length);
        
        if (products.length === 0) {
            console.log('📦 No products in DB, saving default products...');
            // First time - save default products to DB
            await saveDefaultProducts();
            // Load from DB to get consistent format
            const loadedProducts = runQuery('SELECT * FROM products');
            console.log('✅ Default products initialized:', loadedProducts.length);
            return loadedProducts;
        } else {
            console.log('✅ Loaded products from DB:', products.length);
            return products;
        }
    } catch (error) {
        console.error('❌ Failed to load products:', error);
        return [...PRODUCTS]; // Return a copy
    }
}

async function saveDefaultProducts() {
    if (!db) return;
    
    for (const product of PRODUCTS) {
        runExec(
            `INSERT OR REPLACE INTO products (id, name, category, price, icon, barcode, stock, description, createdAt, updatedAt, synced) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [product.id, product.name, product.category, product.price, product.icon, product.barcode || null, product.stock || 0, product.description || '', product.createdAt || Date.now(), Date.now()]
        );
    }
    
    await saveDatabase();
    console.log('✅ Default products saved to database');
}

async function saveProductToDB(product) {
    if (!db) {
        console.error('Database not initialized');
        return false;
    }
    
    try {
        runExec(
            `INSERT OR REPLACE INTO products (id, name, category, price, icon, barcode, stock, description, createdAt, updatedAt, synced) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [product.id, product.name, product.category, product.price, product.icon, product.barcode || null, product.stock || 0, product.description || '', product.createdAt || Date.now(), Date.now()]
        );
        
        await saveDatabase();
        console.log('✅ Product saved:', product.name);
        return true;
    } catch (error) {
        console.error('Failed to save product:', error);
        return false;
    }
}

async function deleteProductFromDB(productId) {
    if (!db) return false;
    
    try {
        runExec('DELETE FROM products WHERE id = ?', [productId]);
        await saveDatabase();
        console.log('✅ Product deleted:', productId);
        return true;
    } catch (error) {
        console.error('Failed to delete product:', error);
        return false;
    }
}

// ===================================
// PRODUCT CRUD OPERATIONS
// ===================================

async function addNewProduct() {
    const name = document.getElementById('product-name-input').value.trim();
    const category = document.getElementById('product-category-input').value;
    const price = parseFloat(document.getElementById('product-price-input').value);
    const icon = document.getElementById('product-icon-input').value || '📦';
    const barcode = document.getElementById('product-barcode-input').value.trim();
    const stock = parseInt(document.getElementById('product-stock-input').value) || 0;
    
    if (!name || !price || price <= 0) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Check if barcode already exists
    if (barcode && barcodeExists && barcodeExists(barcode)) {
        alert('This barcode already exists. Please use a different barcode.');
        return;
    }
    
    // Generate new ID
    const products = await loadProductsFromDB();
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    
    const newProduct = {
        id: newId,
        name: name,
        category: category,
        price: price,
        icon: icon,
        barcode: barcode || null,
        stock: stock
    };
    
    try {
        await saveProductToDB(newProduct);
        
        // Update global products array
        await reloadProducts();
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('product_add', `Added product: ${name} ($${price.toFixed(2)}, ${stock} in stock)`);
        }
        
        // Reset form
        document.getElementById('product-form').reset();
        
        // Refresh list
        refreshProductList();
        
        // Show success notification
        showNotification('✅ Product added successfully!');
        
    } catch (error) {
        console.error('Failed to add product:', error);
        alert('Failed to add product. Please try again.');
    }
}

async function editProduct(productId) {
    const products = await loadProductsFromDB();
    const product = products.find(p => p.id === productId);
    
    if (!product) return;
    
    // Fill form with product data
    document.getElementById('edit-product-id').value = product.id;
    document.getElementById('product-name-input').value = product.name;
    document.getElementById('product-category-input').value = product.category;
    document.getElementById('product-price-input').value = product.price;
    document.getElementById('product-icon-input').value = product.icon;
    document.getElementById('product-barcode-input').value = product.barcode || '';
    document.getElementById('product-stock-input').value = product.stock || 0;
    
    // Switch to edit mode
    isEditMode = true;
    editingProductId = productId;
    
    document.getElementById('form-title').textContent = 'Edit Product';
    document.getElementById('submit-text').textContent = 'Update Product';
    document.getElementById('cancel-edit').classList.add('visible');
    
    // Scroll to form
    document.querySelector('.product-form-section').scrollIntoView({ behavior: 'smooth' });
}

async function updateProduct() {
    const id = parseInt(document.getElementById('edit-product-id').value);
    const name = document.getElementById('product-name-input').value.trim();
    const category = document.getElementById('product-category-input').value;
    const price = parseFloat(document.getElementById('product-price-input').value);
    const icon = document.getElementById('product-icon-input').value || '📦';
    const barcode = document.getElementById('product-barcode-input').value.trim();
    const stock = parseInt(document.getElementById('product-stock-input').value) || 0;
    
    if (!name || !price || price <= 0) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Check if barcode already exists (excluding current product)
    if (barcode && barcodeExists) {
        const products = await loadProductsFromDB();
        const existingProduct = products.find(p => p.barcode === barcode && p.id !== id);
        if (existingProduct) {
            alert('This barcode already exists on another product. Please use a different barcode.');
            return;
        }
    }
    
    const updatedProduct = {
        id: id,
        name: name,
        category: category,
        price: price,
        icon: icon,
        barcode: barcode || null,
        stock: stock
    };
    
    try {
        await saveProductToDB(updatedProduct);
        
        // Update global products array
        await reloadProducts();
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('product_edit', `Updated product: ${name} ($${price.toFixed(2)}, ${stock} in stock)`);
        }
        
        // Reset form and edit mode
        cancelEdit();
        
        // Refresh list
        refreshProductList();
        
        // Show success notification
        showNotification('✅ Product updated successfully!');
        
    } catch (error) {
        console.error('Failed to update product:', error);
        alert('Failed to update product. Please try again.');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    // Get product name before deleting
    const products = await loadProductsFromDB();
    const product = products.find(p => p.id === productId);
    const productName = product ? product.name : 'Unknown';
    
    try {
        await deleteProductFromDB(productId);
        
        // Update global products array
        await reloadProducts();
        
        // Log activity
        if (typeof logActivity === 'function') {
            await logActivity('product_delete', `Deleted product: ${productName}`);
        }
        
        // Refresh list
        refreshProductList();
        
        // Show success notification
        showNotification('✅ Product deleted successfully!');
        
    } catch (error) {
        console.error('Failed to delete product:', error);
        alert('Failed to delete product. Please try again.');
    }
}

function cancelEdit() {
    isEditMode = false;
    editingProductId = null;
    
    document.getElementById('product-form').reset();
    document.getElementById('form-title').textContent = 'Add New Product';
    document.getElementById('submit-text').textContent = 'Add Product';
    document.getElementById('cancel-edit').classList.remove('visible');
}

// ===================================
// PRODUCT LIST RENDERING
// ===================================

async function refreshProductList() {
    const products = await loadProductsFromDB();
    const productList = document.getElementById('product-list');
    const productCount = document.getElementById('product-count');
    
    productCount.textContent = products.length;
    
    if (products.length === 0) {
        productList.innerHTML = `
            <div class="product-list-empty">
                <div class="product-list-empty-icon">📦</div>
                <p>No products yet</p>
                <p style="font-size: 12px; margin-top: 4px;">Add your first product using the form</p>
            </div>
        `;
        return;
    }
    
    productList.innerHTML = '';
    
    products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'product-list-item';
        item.innerHTML = `
            <div class="product-list-icon">${product.icon}</div>
            <div class="product-list-info">
                <div class="product-list-name">${product.name}</div>
                <div class="product-list-meta">${capitalizeFirst(product.category)} • ID: ${product.id}</div>
            </div>
            <div class="product-list-price">$${product.price.toFixed(2)}</div>
            <div class="product-list-actions-btn">
                <button class="btn-icon" onclick="editProduct(${product.id})" title="Edit">✏️</button>
                <button class="btn-icon delete" onclick="deleteProduct(${product.id})" title="Delete">🗑️</button>
            </div>
        `;
        productList.appendChild(item);
    });
}

// ===================================
// RELOAD PRODUCTS IN MAIN VIEW
// ===================================

async function reloadProducts() {
    const products = await loadProductsFromDB();
    
    // Update global PRODUCTS array
    PRODUCTS.length = 0;
    PRODUCTS.push(...products);
    
    // Re-render product grid
    const searchQuery = document.getElementById('product-search').value;
    searchProducts(searchQuery);
}

// ===================================
// IMPORT / EXPORT
// ===================================

async function exportProducts() {
    const products = await loadProductsFromDB();
    
    const dataStr = JSON.stringify(products, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ayn-pos-products-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    showNotification('✅ Products exported successfully!');
}

function importProducts() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const products = JSON.parse(event.target.result);
                
                if (!Array.isArray(products)) {
                    throw new Error('Invalid format');
                }
                
                if (!confirm(`Import ${products.length} products? This will add to existing products.`)) {
                    return;
                }
                
                // Save all products
                for (const product of products) {
                    // Ensure unique IDs
                    const existing = await loadProductsFromDB();
                    const maxId = existing.length > 0 ? Math.max(...existing.map(p => p.id)) : 0;
                    product.id = maxId + 1;
                    
                    await saveProductToDB(product);
                }
                
                await reloadProducts();
                refreshProductList();
                
                showNotification(`✅ Imported ${products.length} products!`);
                
            } catch (error) {
                console.error('Import failed:', error);
                alert('Failed to import products. Please check the file format.');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// ===================================
// NOTIFICATIONS
// ===================================

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: linear-gradient(135deg, #1C75BC, #00C2FF);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 194, 255, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===================================
// DATABASE MANAGEMENT
// ===================================

async function updateDatabaseInfo() {
    try {
        // Get schema version
        const schemaVersion = document.getElementById('db-schema-version');
        if (schemaVersion) {
            try {
                const versionResult = runQuery('SELECT MAX(version) as version FROM schema_version');
                schemaVersion.textContent = versionResult[0]?.version || '0';
            } catch (e) {
                schemaVersion.textContent = 'N/A';
            }
        }
        
        // Get backup count
        const backupCount = document.getElementById('db-backup-count');
        if (backupCount) {
            let count = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('AynBeirutPOS_backup_')) {
                    count++;
                }
            }
            backupCount.textContent = count;
        }
        
        // Get sync queue count
        const syncQueue = document.getElementById('db-sync-queue');
        if (syncQueue) {
            try {
                const queueResult = runQuery('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0');
                const pendingCount = queueResult[0]?.count || 0;
                syncQueue.textContent = `${pendingCount} pending`;
                syncQueue.style.color = pendingCount > 0 ? '#FFA500' : '#00FF88';
            } catch (e) {
                syncQueue.textContent = 'N/A';
            }
        }
    } catch (error) {
        console.error('Failed to update database info:', error);
    }
}

function initDatabaseManagement() {
    // View Backups button
    const viewBackupsBtn = document.getElementById('view-backups-btn');
    if (viewBackupsBtn) {
        viewBackupsBtn.addEventListener('click', showBackupList);
    }
    
    // Export Database button
    const exportDbBtn = document.getElementById('export-db-btn');
    if (exportDbBtn) {
        exportDbBtn.addEventListener('click', async () => {
            try {
                await createManualBackup();
                updateDatabaseInfo(); // Refresh backup count
            } catch (error) {
                console.error('Export failed:', error);
            }
        });
    }
    
    // Import Database button
    const importDbBtn = document.getElementById('import-db-btn');
    if (importDbBtn) {
        importDbBtn.addEventListener('click', async () => {
            if (confirm('⚠️ Importing a database will replace all current data.\\n\\nAre you sure you want to continue?')) {
                try {
                    await restoreFromFile();
                } catch (error) {
                    console.error('Import failed:', error);
                }
            }
        });
    }
    
    // Backup modal close button
    const closeBackupModal = document.getElementById('close-backup-modal');
    if (closeBackupModal) {
        closeBackupModal.addEventListener('click', () => {
            document.getElementById('backup-modal').classList.remove('show');
        });
    }
}

function showBackupList() {
    const backupModal = document.getElementById('backup-modal');
    const backupList = document.getElementById('backup-list');
    
    if (!backupModal || !backupList) return;
    
    // Find all backups in localStorage
    const backups = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('AynBeirutPOS_backup_')) {
            // Parse timestamp from key
            const match = key.match(/(\\d{4}-\\d{2}-\\d{2}T[\\d-]+Z?)/);
            let timestamp = 0;
            let dateStr = 'Unknown date';
            
            if (match) {
                const rawDate = match[1].replace(/-/g, ':').replace('T', 'T').slice(0, -1) + '.000Z';
                try {
                    const date = new Date(rawDate.replace(/-(\\d{3})Z$/, '.$1Z'));
                    timestamp = date.getTime();
                    dateStr = date.toLocaleString();
                } catch (e) {
                    console.warn('Could not parse date from:', key);
                }
            }
            
            // Get size
            const data = localStorage.getItem(key);
            const sizeKB = data ? (data.length / 1024).toFixed(2) : '0';
            
            // Calculate age
            const ageMs = Date.now() - timestamp;
            const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
            const ageStr = ageDays === 0 ? 'Today' : `${ageDays} days ago`;
            
            backups.push({ key, dateStr, sizeKB, ageStr, timestamp });
        }
    }
    
    // Sort by date (newest first)
    backups.sort((a, b) => b.timestamp - a.timestamp);
    
    // Render backup list
    if (backups.length === 0) {
        backupList.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;">No backups found</div>';
    } else {
        backupList.innerHTML = backups.map((backup, index) => `
            <div style="padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; margin-bottom: 5px;">
                        ${index < 3 ? '⭐ ' : ''}Backup ${index + 1}
                    </div>
                    <div style="font-size: 13px; color: #888;">
                        📅 ${backup.dateStr} (${backup.ageStr})
                    </div>
                    <div style="font-size: 13px; color: #888;">
                        💾 Size: ${backup.sizeKB} KB
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-text" onclick="restoreBackupByKey('${backup.key}')" style="background: rgba(0, 255, 136, 0.2);">
                        ♻️ Restore
                    </button>
                    <button class="btn-text" onclick="deleteBackupByKey('${backup.key}')" style="background: rgba(255, 68, 68, 0.2);">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    backupModal.classList.add('show');
}

async function restoreBackupByKey(key) {
    if (!confirm('⚠️ Restoring this backup will replace all current data.\\n\\nAre you sure?')) {
        return;
    }
    
    try {
        const data = localStorage.getItem(key);
        if (!data) {
            alert('❌ Backup not found');
            return;
        }
        
        // Parse and restore
        const buffer = new Uint8Array(JSON.parse(data));
        db = new SQL.Database(buffer);
        await saveDatabase();
        
        alert('✅ Database restored successfully!\\n\\nThe app will reload now.');
        setTimeout(() => window.location.reload(), 1000);
        
    } catch (error) {
        console.error('Restore failed:', error);
        alert('❌ Restore failed: ' + error.message);
    }
}

function deleteBackupByKey(key) {
    if (!confirm('Delete this backup?\\n\\nThis cannot be undone.')) {
        return;
    }
    
    try {
        localStorage.removeItem(key);
        showBackupList(); // Refresh list
        updateDatabaseInfo(); // Update count
        showNotification('✅ Backup deleted');
    } catch (error) {
        console.error('Delete failed:', error);
        alert('❌ Delete failed: ' + error.message);
    }
}

// ===================================
// EXPORT FUNCTIONS
// ===================================

window.initProductManagement = initProductManagement;
window.loadProductsFromDB = loadProductsFromDB;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.reloadProducts = reloadProducts;
window.updateDatabaseInfo = updateDatabaseInfo;
window.restoreBackupByKey = restoreBackupByKey;
window.deleteBackupByKey = deleteBackupByKey;
