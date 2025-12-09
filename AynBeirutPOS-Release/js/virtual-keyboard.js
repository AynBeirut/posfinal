/**
 * Virtual Keyboard Module
 * On-screen keyboard for touchscreen devices
 */

let currentInput = null;
let keyboardVisible = false;
let shiftActive = false;

const keyboardLayout = {
    normal: [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Backspace'],
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '@'],
        ['Space', 'Close']
    ],
    shift: [
        ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', 'Backspace'],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '-', '_'],
        ['Space', 'Close']
    ],
    numeric: [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['.', '0', 'Backspace'],
        ['Close']
    ]
};

/**
 * Initialize virtual keyboard
 */
function initVirtualKeyboard() {
    createKeyboardHTML();
    attachKeyboardEvents();
    console.log('✅ Virtual keyboard initialized');
}

/**
 * Create keyboard HTML structure
 */
function createKeyboardHTML() {
    const keyboardContainer = document.createElement('div');
    keyboardContainer.id = 'virtual-keyboard';
    keyboardContainer.className = 'virtual-keyboard';
    keyboardContainer.innerHTML = `
        <div class="keyboard-header">
            <span class="keyboard-title">Keyboard</span>
            <button class="keyboard-minimize" onclick="hideVirtualKeyboard()">▼</button>
        </div>
        <div class="keyboard-body" id="keyboard-body">
            <!-- Keys will be generated here -->
        </div>
    `;
    document.body.appendChild(keyboardContainer);
}

/**
 * Attach keyboard events to inputs
 */
function attachKeyboardEvents() {
    // Listen for focus on text inputs
    document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            const inputType = e.target.type;
            
            // Skip for certain input types
            if (inputType === 'checkbox' || inputType === 'radio' || inputType === 'file') {
                return;
            }
            
            currentInput = e.target;
            
            // Determine keyboard layout
            if (inputType === 'number' || inputType === 'tel') {
                showVirtualKeyboard('numeric');
            } else {
                showVirtualKeyboard('normal');
            }
        }
    });
    
    // Optional: Hide keyboard when clicking outside
    document.addEventListener('click', (e) => {
        if (keyboardVisible && 
            !e.target.closest('.virtual-keyboard') && 
            e.target.tagName !== 'INPUT' && 
            e.target.tagName !== 'TEXTAREA') {
            // Don't auto-hide, user must click Close button
        }
    });
}

/**
 * Show virtual keyboard with specific layout
 */
function showVirtualKeyboard(layout = 'normal') {
    const keyboard = document.getElementById('virtual-keyboard');
    const keyboardBody = document.getElementById('keyboard-body');
    
    if (!keyboard || !keyboardBody) return;
    
    // Generate keyboard keys
    keyboardBody.innerHTML = '';
    const keys = keyboardLayout[layout] || keyboardLayout.normal;
    
    keys.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        
        row.forEach(key => {
            const keyButton = document.createElement('button');
            keyButton.className = 'keyboard-key';
            keyButton.textContent = key;
            
            // Special key classes
            if (key === 'Backspace') {
                keyButton.className += ' key-backspace';
                keyButton.innerHTML = '⌫';
            } else if (key === 'Space') {
                keyButton.className += ' key-space';
            } else if (key === 'Shift') {
                keyButton.className += ' key-shift';
                if (shiftActive) keyButton.classList.add('active');
            } else if (key === 'Close') {
                keyButton.className += ' key-close';
            }
            
            // Attach click handler
            keyButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleKeyPress(key, layout);
            });
            
            // Prevent button from taking focus
            keyButton.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });
            
            rowDiv.appendChild(keyButton);
        });
        
        keyboardBody.appendChild(rowDiv);
    });
    
    keyboard.classList.add('show');
    keyboardVisible = true;
}

/**
 * Hide virtual keyboard
 */
function hideVirtualKeyboard() {
    const keyboard = document.getElementById('virtual-keyboard');
    if (keyboard) {
        keyboard.classList.remove('show');
        keyboardVisible = false;
        currentInput = null;
        shiftActive = false;
    }
}

/**
 * Handle key press on virtual keyboard
 */
function handleKeyPress(key, layout) {
    if (!currentInput) return;
    
    // Store current focus
    const inputToFocus = currentInput;
    
    switch (key) {
        case 'Backspace':
            const start = currentInput.selectionStart;
            const end = currentInput.selectionEnd;
            
            if (start !== end) {
                // Delete selection
                currentInput.value = currentInput.value.substring(0, start) + 
                                   currentInput.value.substring(end);
                currentInput.setSelectionRange(start, start);
            } else if (start > 0) {
                // Delete one character
                currentInput.value = currentInput.value.substring(0, start - 1) + 
                                   currentInput.value.substring(start);
                currentInput.setSelectionRange(start - 1, start - 1);
            }
            break;
            
        case 'Space':
            insertAtCursor(' ');
            break;
            
        case 'Shift':
            shiftActive = !shiftActive;
            showVirtualKeyboard(shiftActive ? 'shift' : 'normal');
            // Restore focus after keyboard rebuild
            setTimeout(() => {
                if (inputToFocus) {
                    inputToFocus.focus();
                    currentInput = inputToFocus;
                }
            }, 10);
            return; // Don't trigger input event for shift
            
        case 'Close':
            hideVirtualKeyboard();
            return;
            
        default:
            insertAtCursor(key);
            // Auto-disable shift after key press
            if (shiftActive && layout !== 'numeric') {
                shiftActive = false;
                showVirtualKeyboard('normal');
                // Restore focus after keyboard rebuild
                setTimeout(() => {
                    if (inputToFocus) {
                        inputToFocus.focus();
                        currentInput = inputToFocus;
                    }
                }, 10);
            }
            break;
    }
    
    // Ensure input keeps focus
    if (inputToFocus && inputToFocus !== document.activeElement) {
        inputToFocus.focus();
    }
    
    // Trigger input event for validation
    currentInput.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Insert text at cursor position
 */
function insertAtCursor(text) {
    if (!currentInput) return;
    
    const start = currentInput.selectionStart;
    const end = currentInput.selectionEnd;
    
    currentInput.value = currentInput.value.substring(0, start) + 
                        text + 
                        currentInput.value.substring(end);
    
    const newPos = start + text.length;
    currentInput.setSelectionRange(newPos, newPos);
    currentInput.focus();
}

/**
 * Toggle keyboard visibility
 */
function toggleVirtualKeyboard() {
    if (keyboardVisible) {
        hideVirtualKeyboard();
    } else {
        showVirtualKeyboard('normal');
    }
}
