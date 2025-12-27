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
// PREVENT RAPID BUTTON CLICKS
// ================================
const preventRapidClicks = () => {
    const buttons = document.querySelectorAll('button, .btn, .product-card');
    
    buttons.forEach(button => {
        let isProcessing = false;
        
        button.addEventListener('click', function(e) {
            if (isProcessing) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            isProcessing = true;
            button.style.opacity = '0.7';
            button.style.pointerEvents = 'none';
            
            // Reset after 500ms
            setTimeout(() => {
                isProcessing = false;
                button.style.opacity = '';
                button.style.pointerEvents = '';
            }, 500);
        }, { passive: false, capture: true });
    });
};

// Apply to existing buttons
window.addEventListener('DOMContentLoaded', preventRapidClicks);

// Re-apply when new content is loaded
const observer = new MutationObserver(debounce(() => {
    preventRapidClicks();
}, 500));

observer.observe(document.body, {
    childList: true,
    subtree: true
});

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
};

window.hideLoadingOverlay = () => {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
};

// Auto-hide loading after 10 seconds as safety
window.addEventListener('DOMContentLoaded', () => {
    setInterval(() => {
        if (loadingOverlay && loadingOverlay.style.display === 'flex') {
            const duration = Date.now() - (loadingOverlay.dataset.startTime || 0);
            if (duration > 10000) {
                hideLoadingOverlay();
                console.warn('[Anti-Blocking] Force-hiding loading overlay after 10s');
            }
        }
    }, 1000);
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
    
    // Hide any loading states
    hideLoadingOverlay();
    
    // Clear stuck modals
    document.querySelectorAll('.modal.show').forEach(modal => {
        if (modal.id !== 'error-modal') {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    });
    
    // Re-enable body
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('[Anti-Blocking] Unhandled promise rejection:', e.reason);
    hideLoadingOverlay();
});

console.log('[Anti-Blocking] Module loaded successfully');
