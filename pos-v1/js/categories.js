// ===================================
// AYN BEIRUT POS - CATEGORY MANAGEMENT
// Dynamic category system
// ===================================

let categories = [];
let categoryManagementInitialized = false; // Flag to prevent duplicate event listeners

// ===================================
// INITIALIZATION
// ===================================

async function initCategories() {
    try {
        // Check if database is ready
        if (!db) {
            console.warn('⚠️ Database not ready, waiting...');
            // Wait a bit for database to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check again
            if (!db) {
                console.error('❌ Database still not ready, skipping categories');
                return;
            }
        }
        
        categories = await getAllCategories();
        if (categories.length === 0) {
            console.log('No categories found, using defaults');
        }
        renderCategoryFilters();
        renderCategoryDropdown();
        
        // Only setup event listeners once to prevent duplicate listeners and freezing
        if (!categoryManagementInitialized) {
            setupCategoryManagement();
            categoryManagementInitialized = true;
        }
        
        console.log('✅ Category system initialized with', categories.length, 'categories');
    } catch (error) {
        console.error('Failed to initialize categories:', error);
    }
}

// ===================================
// RENDER CATEGORY FILTERS (Main UI)
// ===================================

function renderCategoryFilters() {
    const filterContainer = document.querySelector('.category-filter');
    if (!filterContainer) return;
    
    // Clear existing buttons
    filterContainer.innerHTML = '';
    
    // Add "All Products" button
    const allBtn = document.createElement('button');
    allBtn.className = 'category-btn active';
    allBtn.setAttribute('data-category', 'all');
    allBtn.textContent = 'All Products';
    filterContainer.appendChild(allBtn);
    
    // Add category buttons
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.setAttribute('data-category', cat.name);
        btn.innerHTML = `${cat.icon || ''} ${cat.displayName}`;
        filterContainer.appendChild(btn);
    });
    
    // Re-attach event listeners
    attachCategoryFilterListeners();
}

function attachCategoryFilterListeners() {
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            categoryBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            // Filter products
            const category = btn.getAttribute('data-category');
            if (typeof filterProducts === 'function') {
                filterProducts(category);
            }
        });
    });
}

// ===================================
// RENDER CATEGORY DROPDOWN (Product Form)
// ===================================

function renderCategoryDropdown() {
    const dropdown = document.getElementById('product-category-input');
    if (!dropdown) return;
    
    // Clear existing options
    dropdown.innerHTML = '';
    
    // Add categories
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = `${cat.icon || ''} ${cat.displayName}`;
        dropdown.appendChild(option);
    });
}

// ===================================
// CATEGORY MANAGEMENT UI
// ===================================

function setupCategoryManagement() {
    const manageCatBtn = document.getElementById('manage-categories-btn');
    const catModal = document.getElementById('category-modal');
    const closeCatModal = document.getElementById('close-category-modal');
    const addCatBtn = document.getElementById('add-category-btn');
    const saveCatBtn = document.getElementById('save-category-btn');
    const cancelCatBtn = document.getElementById('cancel-category-btn');
    
    if (!catModal) return; // UI not added yet
    
    // Open modal
    if (manageCatBtn) {
        manageCatBtn.addEventListener('click', () => {
            catModal.classList.add('active');
            renderCategoryList();
        });
    }
    
    // Close modal
    if (closeCatModal) {
        closeCatModal.addEventListener('click', () => {
            catModal.classList.remove('active');
            resetCategoryForm();
        });
    }
    
    // Show add form
    if (addCatBtn) {
        addCatBtn.addEventListener('click', () => {
            document.getElementById('category-form').style.display = 'block';
            document.getElementById('category-id-input').value = '';
            document.getElementById('category-name-input').value = '';
            document.getElementById('category-display-input').value = '';
            document.getElementById('category-icon-input').value = '';
        });
    }
    
    // Save category
    if (saveCatBtn) {
        saveCatBtn.addEventListener('click', saveCategoryHandler);
    }
    
    // Cancel
    if (cancelCatBtn) {
        cancelCatBtn.addEventListener('click', resetCategoryForm);
    }
}

async function saveCategoryHandler() {
    const id = document.getElementById('category-id-input').value;
    const name = document.getElementById('category-name-input').value.trim();
    const displayName = document.getElementById('category-display-input').value.trim();
    const icon = document.getElementById('category-icon-input').value.trim();
    
    if (!name || !displayName) {
        alert('Please enter category name and display name');
        return;
    }
    
    try {
        const categoryData = {
            name: name.toLowerCase().replace(/\s+/g, '-'),
            displayName,
            icon: icon || '📦'
        };
        
        if (id) {
            // Update existing
            await updateCategory(parseInt(id), categoryData);
        } else {
            // Add new
            await saveCategory(categoryData);
        }
        
        // Reload categories
        categories = await getAllCategories();
        renderCategoryFilters();
        renderCategoryDropdown();
        renderCategoryList();
        resetCategoryForm();
        
        showNotification(id ? 'Category updated!' : 'Category added!', 'success');
    } catch (error) {
        console.error('Error saving category:', error);
        alert('Failed to save category. Name might already exist.');
    }
}

function renderCategoryList() {
    const listContainer = document.getElementById('category-list');
    if (!listContainer) return;
    
    if (categories.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: var(--light-grey);">No categories yet</p>';
        return;
    }
    
    listContainer.innerHTML = categories.map(cat => `
        <div class="category-item" data-id="${cat.id}">
            <div class="category-info">
                <span class="category-icon">${cat.icon || '📦'}</span>
                <div>
                    <div class="category-name">${cat.displayName}</div>
                    <div class="category-key">${cat.name}</div>
                </div>
            </div>
            <div class="category-actions">
                <button onclick="editCategory(${cat.id})" class="btn-edit">✏️</button>
                <button onclick="deleteCategoryHandler(${cat.id})" class="btn-delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

function editCategory(id) {
    const category = categories.find(c => c.id === id);
    if (!category) return;
    
    document.getElementById('category-form').style.display = 'block';
    document.getElementById('category-id-input').value = category.id;
    document.getElementById('category-name-input').value = category.name;
    document.getElementById('category-display-input').value = category.displayName;
    document.getElementById('category-icon-input').value = category.icon || '';
}

async function deleteCategoryHandler(id) {
    const category = categories.find(c => c.id === id);
    if (!category) return;
    
    // Check if any products use this category
    const products = window.PRODUCTS || [];
    const productsWithCategory = products.filter(p => p.category === category.name);
    
    if (productsWithCategory.length > 0) {
        const confirmed = confirm(
            `${productsWithCategory.length} product(s) use this category.\n` +
            `Deleting it will change those products to "other" category.\n\n` +
            `Continue?`
        );
        if (!confirmed) return;
        
        // Update products to "other" category
        productsWithCategory.forEach(p => p.category = 'other');
    }
    
    try {
        await deleteCategory(id);
        categories = await getAllCategories();
        renderCategoryFilters();
        renderCategoryDropdown();
        renderCategoryList();
        showNotification('Category deleted!', 'success');
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category');
    }
}

function resetCategoryForm() {
    document.getElementById('category-form').style.display = 'none';
    document.getElementById('category-id-input').value = '';
    document.getElementById('category-name-input').value = '';
    document.getElementById('category-display-input').value = '';
    document.getElementById('category-icon-input').value = '';
}

function showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (typeof window.showNotification === 'function') {
        window.showNotification(message);
    } else {
        alert(message);
    }
}

// ===================================
// EXPORT FUNCTIONS
// ===================================

window.initCategories = initCategories;
window.renderCategoryFilters = renderCategoryFilters;
window.renderCategoryDropdown = renderCategoryDropdown;
window.editCategory = editCategory;
window.deleteCategoryHandler = deleteCategoryHandler;
