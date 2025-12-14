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
    const productModal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const cancelEditBtn = document.getElementById('cancel-edit');
    
    // Product management opens from inventory button, not admin button
    // (admin button is now used for admin dashboard)
    
    // Setup modal close handlers
    setupProductModal();
    
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
        console.warn('Database not ready, using default products');
        return PRODUCTS;
    }
    
    try {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const products = request.result;
                if (products.length === 0) {
                    // First time - save default products to DB
                    saveDefaultProducts().then(() => {
                        resolve(PRODUCTS);
                    });
                } else {
                    resolve(products);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to load products:', error);
        return PRODUCTS;
    }
}

async function saveDefaultProducts() {
    if (!db) return;
    
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    
    for (const product of PRODUCTS) {
        store.put(product);
    }
    
    console.log('✅ Default products saved to database');
}

async function saveProductToDB(product) {
    if (!db) {
        console.error('Database not initialized');
        return false;
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        const request = store.put(product);
        
        request.onsuccess = () => {
            console.log('✅ Product saved:', product.name);
            resolve(true);
        };
        
        request.onerror = () => {
            console.error('Failed to save product');
            reject(request.error);
        };
    });
}

async function deleteProductFromDB(productId) {
    if (!db) return false;
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        const request = store.delete(productId);
        
        request.onsuccess = () => {
            console.log('✅ Product deleted:', productId);
            resolve(true);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
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
// EXPORT FUNCTIONS
// ===================================

window.initProductManagement = initProductManagement;
window.loadProductsFromDB = loadProductsFromDB;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.reloadProducts = reloadProducts;
