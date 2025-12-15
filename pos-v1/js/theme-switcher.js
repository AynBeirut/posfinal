/**
 * Theme Switcher for Ayn Beirut POS
 * Allows users to switch between Dark, Light, and Moderate (Colorful) themes
 */

// Available themes
const THEMES = {
    DARK: 'dark',
    LIGHT: 'light',
    MODERATE: 'moderate'
};

// Initialize theme from localStorage or default to dark
function initTheme() {
    const savedTheme = localStorage.getItem('ayn-pos-theme') || THEMES.DARK;
    setTheme(savedTheme);
    
    // Update active button
    const buttons = document.querySelectorAll('.theme-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === savedTheme) {
            btn.classList.add('active');
        }
    });
}

// Apply theme
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ayn-pos-theme', theme);
    console.log(`✨ Theme changed to: ${theme}`);
}

// Set up event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    initTheme();
    
    // Add click handlers to theme buttons
    const buttons = document.querySelectorAll('.theme-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);
            
            // Update active state
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
});

// Also apply theme immediately (before DOMContentLoaded)
const savedTheme = localStorage.getItem('ayn-pos-theme') || THEMES.DARK;
document.documentElement.setAttribute('data-theme', savedTheme);
