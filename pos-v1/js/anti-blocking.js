/**
 * Anti-Blocking & App Performance Module
 * Prevents app freezing, input blocking, and improves responsiveness
 */

// ================================
// DEBOUNCE UTILITY
// ================================
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ================================
// PREVENT DOUBLE-CLICK BLOCKING
// ================================
document.addEventListener('dblclick', (e) => {
    e.preventDefault();
    e.stopPropagation();
}, { passive: false, capture: true });

// ================================
// CLEAR STUCK MODALS ON LOAD
// ================================
window.addEventListener('DOMContentLoaded', () => {
    // Clear any stuck modals
    document.querySelectorAll('.modal.show').forEach(modal => {
        modal.classList.remove('show');
        modal.style.display = 'none';
    });
    
    // Clear modal backdrop
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
    // Remove body overflow restrictions
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    
    console.log('[Anti-Blocking] Modal cleanup completed');
});

// ================================
// AUTO-CLEANUP VIRTUAL KEYBOARD ON BLUR
// ================================
window.addEventListener('blur', () => {
    // Hide virtual keyboard if window loses focus
    const vKeyboard = document.getElementById('virtual-keyboard');
    if (vKeyboard && vKeyboard.style.display !== 'none') {
        vKeyboard.style.display = 'none';
        console.log('[Anti-Blocking] Virtual keyboard hidden on window blur');
    }
});

// ================================
// PREVENT RAPID BUTTON CLICKS (USING EVENT DELEGATION)
// ================================
// Track processing state globally to avoid duplicate listeners
const processingButtons = new WeakMap();

// Single event listener at document level (event delegation)
document.addEventListener('click', function(e) {
    // Find the button/clickable element
    const button = e.target.closest('button, .btn, .product-card');
    if (!button) return;
    
    // Check if this button is currently processing
    if (processingButtons.get(button)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    
    // Mark as processing
    processingButtons.set(button, true);
    const originalOpacity = button.style.opacity;
    const originalPointerEvents = button.style.pointerEvents;
    
    button.style.opacity = '0.7';
    button.style.pointerEvents = 'none';
    
    // Reset after 500ms
    setTimeout(() => {
        processingButtons.delete(button);
        button.style.opacity = originalOpacity;
        button.style.pointerEvents = originalPointerEvents;
    }, 500);
}, { passive: false, capture: true });

// ================================
// MEMORY LEAK PREVENTION
// ================================
// REMOVED: cleanupListeners function was destroying dropdown event handlers
// Caused dropdowns to freeze every 2 minutes by replacing DOM elements
// The function has been disabled to preserve interactivity

// ================================
// PREVENT INPUT FOCUS LOSS
// ================================
let lastFocusedInput = null;

document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        lastFocusedInput = e.target;
    }
}, { passive: true });

// Restore focus if lost unexpectedly
document.addEventListener('click', (e) => {
    if (lastFocusedInput && 
        !lastFocusedInput.contains(e.target) &&
        !e.target.closest('.modal') &&
        !e.target.closest('.virtual-keyboard')) {
        
        setTimeout(() => {
            if (document.activeElement === document.body && lastFocusedInput) {
                lastFocusedInput.focus();
            }
        }, 50);
    }
});

// ================================
// SMOOTH SCROLL HANDLING
// ================================
const smoothScrollBehavior = () => {
    // Use passive listeners for scroll events
    const scrollableElements = document.querySelectorAll(
        '.reports-body, .inventory-body, .product-management-body, .modal-body'
    );
    
    scrollableElements.forEach(element => {
        element.style.scrollBehavior = 'smooth';
        element.style.overflowY = 'auto';
        element.style.webkitOverflowScrolling = 'touch'; // iOS smooth scrolling
    });
};

window.addEventListener('DOMContentLoaded', smoothScrollBehavior);

// ================================
// MODAL FOCUS TRAP PREVENTION
// ================================
const preventModalFocusTrap = () => {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('keydown', (e) => {
            // Allow Escape to close modal
            if (e.key === 'Escape') {
                const closeBtn = modal.querySelector('[data-dismiss="modal"]');
                if (closeBtn) {
                    closeBtn.click();
                }
            }
        });
    });
};

window.addEventListener('DOMContentLoaded', preventModalFocusTrap);

// ================================
// DATABASE OPERATION TIMEOUT
// ================================
const originalRunQuery = window.runQuery;
if (typeof originalRunQuery === 'function') {
    window.runQuery = function(sql, params, timeout = 5000) {
        return Promise.race([
            originalRunQuery(sql, params),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database query timeout')), timeout)
            )
        ]).catch(error => {
            console.error('[Anti-Blocking] Database query failed or timed out:', error);
            showAlert('Database operation timed out. Please try again.', 'error');
            throw error;
        });
    };
}

// ================================
// EXPORT OPERATION DEBOUNCING
// ================================
if (typeof window.exportToPDF === 'function') {
    window.exportToPDF = debounce(window.exportToPDF, 1000);
}
if (typeof window.exportToExcel === 'function') {
    window.exportToExcel = debounce(window.exportToExcel, 1000);
}
if (typeof window.exportToCSV === 'function') {
    window.exportToCSV = debounce(window.exportToCSV, 1000);
}

// ================================
// LOADING STATE MANAGEMENT
// ================================
let loadingOverlay = null;

window.showLoadingOverlay = (message = 'Processing...') => {
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }
    loadingOverlay.style.display = 'flex';
    loadingOverlay.dataset.startTime = Date.now();
};

window.hideLoadingOverlay = () => {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
        delete loadingOverlay.dataset.startTime;
    }
};

// Auto-hide loading after 10 seconds as safety
window.addEventListener('DOMContentLoaded', () => {
    setInterval(() => {
        if (loadingOverlay && loadingOverlay.style.display === 'flex') {
            const duration = Date.now() - (parseInt(loadingOverlay.dataset.startTime) || 0);
            if (duration > 10000) {
                hideLoadingOverlay();
                console.warn('[Anti-Blocking] Force-hiding loading overlay after 10s');
                emergencyUnfreeze(); // Also run unfreeze
            }
        }
    }, 1000);
});

// ================================
// EMERGENCY UNFREEZE SYSTEM
// ================================
window.emergencyUnfreeze = function() {
    console.log('🚨 [Emergency Unfreeze] Running system unfreeze...');
    
    // 1. Reset all buttons
    document.querySelectorAll('button, .btn, .product-card').forEach(button => {
        button.style.pointerEvents = '';
        button.style.opacity = '';
        processingButtons.delete(button);
    });
    
    // 2. Reset all inputs and textareas (except intentionally readonly ones)
    document.querySelectorAll('input:not([readonly]), textarea:not([readonly])').forEach(input => {
        if (input.disabled && !input.dataset.intentionallyDisabled) {
            input.disabled = false;
        }
    });
    
    // 3. Clear loading overlays
    hideLoadingOverlay();
    
    // 4. Clear modal backdrops
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    
    // 5. Reset body
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    document.body.classList.remove('modal-open');
    
    // 6. Hide virtual keyboard if stuck
    const vKeyboard = document.getElementById('virtual-keyboard');
    if (vKeyboard) vKeyboard.style.display = 'none';
    
    console.log('✅ [Emergency Unfreeze] System unfrozen - inputs should work now');
    
    // Show notification
    alert('🔓 System Unfrozen!\n\nAll inputs and buttons have been re-enabled.\nIf you still experience issues, please logout and login again.');
};

// Keyboard shortcut: Ctrl+Shift+U to trigger emergency unfreeze
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'U') {
        e.preventDefault();
        emergencyUnfreeze();
    }
});

// ================================
// PERFORMANCE MONITORING
// ================================
let performanceLog = [];

const logPerformance = (operation, duration) => {
    performanceLog.push({
        operation,
        duration,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 entries
    if (performanceLog.length > 100) {
        performanceLog.shift();
    }
    
    // Warn about slow operations
    if (duration > 1000) {
        console.warn(`[Anti-Blocking] Slow operation detected: ${operation} took ${duration}ms`);
    }
};

window.getPerformanceLog = () => performanceLog;

// ================================
// GRACEFUL ERROR HANDLING
// ================================
window.addEventListener('error', (e) => {
    console.error('[Anti-Blocking] Global error caught:', e.error);
    
    // Run emergency unfreeze to restore system
    if (typeof window.emergencyUnfreeze === 'function') {
        // Don't show the alert, just run the cleanup
        const originalAlert = window.alert;
        window.alert = () => {}; // Temporarily disable alert
        window.emergencyUnfreeze();
        window.alert = originalAlert;
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('[Anti-Blocking] Unhandled promise rejection:', e.reason);
    
    // Run emergency unfreeze to restore system
    if (typeof window.emergencyUnfreeze === 'function') {
        const originalAlert = window.alert;
        window.alert = () => {};
        window.emergencyUnfreeze();
        window.alert = originalAlert;
    }
});

console.log('[Anti-Blocking] Module loaded successfully');
