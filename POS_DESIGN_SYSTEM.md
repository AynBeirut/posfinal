# POS Design System Documentation
## Complete UI & Visual Keyboard Guide

> **Purpose**: This document captures all visual design elements, color systems, typography, keyboard implementations, and UI patterns from the existing POS application to enable accurate recreation of the same look and feel.

---

## 📋 Table of Contents

1. [Color System](#color-system)
2. [Typography](#typography)
3. [Visual Keyboard Implementation](#visual-keyboard-implementation)
4. [Layout Patterns](#layout-patterns)
5. [Component Styles](#component-styles)
6. [Responsive Design](#responsive-design)
7. [Animations](#animations)
8. [Screen Layouts](#screen-layouts)

---

## 🎨 Color System

### Primary Brand Colors

```javascript
// Core Brand Colors
const colors = {
  primaryBlue: '#0057FF',
  primaryBlueLight: '#0078D4',
  successGreen: '#0DA67A',
  successGreenMedium: '#10B981',
  successGreenDark: '#059669',
  warningOrange: '#F5B700',
  warningAmber: '#F59E0B',
  dangerRed: '#FF5C5C',
  dangerRedMedium: '#EF4444',
  dangerRedDeep: '#E74C3C',
  dangerRedDark: '#DC2626',
  purple: '#8A2BE2',
  purpleLight: '#9D4EDD',
  gray: '#484848',
  grayMedium: '#6B7280',
  darkGray: '#2A2A2A'
};
```

### Role-Specific Colors

Each user role has a unique color identity for instant visual recognition:

```javascript
const roleColors = {
  admin: {
    primary: '#0057FF',
    gradient: 'linear-gradient(135deg, #0057FF 0%, #0078D4 100%)',
    shadow: 'rgba(0,87,255,0.3)'
  },
  cashier: {
    primary: '#0DA67A',
    gradient: 'linear-gradient(135deg, #0DA67A 0%, #0891B2 100%)',
    shadow: 'rgba(13,166,122,0.3)'
  },
  superviseur: {
    primary: '#8A2BE2',
    gradient: 'linear-gradient(135deg, #8A2BE2 0%, #9D4EDD 100%)',
    shadow: 'rgba(138,43,226,0.3)'
  },
  bartender: {
    primary: '#F5B700',
    gradient: 'linear-gradient(135deg, #F5B700 0%, #F59E0B 100%)',
    shadow: 'rgba(245,183,0,0.3)'
  },
  waiter: {
    primary: '#FF5C5C',
    gradient: 'linear-gradient(135deg, #FF5C5C 0%, #EF4444 100%)',
    shadow: 'rgba(255,92,92,0.3)'
  },
  kitchenManager: {
    primary: '#E74C3C',
    gradient: 'linear-gradient(135deg, #E74C3C 0%, #DC2626 100%)',
    shadow: 'rgba(231,76,60,0.3)'
  },
  stock: {
    primary: '#484848',
    gradient: 'linear-gradient(135deg, #484848 0%, #6B7280 100%)',
    shadow: 'rgba(72,72,72,0.3)'
  },
  accountant: {
    primary: '#16A34A',
    gradient: 'linear-gradient(135deg, #16A34A 0%, #10B981 100%)',
    shadow: 'rgba(22,163,74,0.3)'
  }
};
```

### Product Category Colors

```javascript
const categoryColors = {
  services: '#0057FF',   // Blue
  food: '#F5B700',       // Yellow/Orange
  drinks: '#8A2BE2',     // Purple
  desserts: '#FF69B4'    // Pink
};
```

### Status Colors

```javascript
const statusColors = {
  approved: '#0DA67A',   // Green
  pending: '#F5B700',    // Orange
  rejected: '#FF5C5C',   // Red
  neutral: '#6B7280'     // Gray
};
```

### UI Element Colors

```javascript
const uiColors = {
  // Backgrounds
  bgWhite: '#fff',
  bgLight: '#F5F5F5',
  bgLightGray: '#EAEAEA',
  bgDark: '#2A2A2A',
  
  // Text
  textPrimary: '#2A2A2A',
  textSecondary: '#666',
  textMuted: '#888',
  textPlaceholder: '#bbb',
  
  // Borders
  borderLight: '#ddd',
  borderMedium: '#ccc',
  borderDark: '#eee',
  
  // Overlays
  overlay: 'rgba(0,0,0,0.7)',     // 70% opacity
  overlayLight: 'rgba(0,0,0,0.5)', // 50% opacity
  
  // Alerts
  alertSuccess: '#E8F5E9',
  alertWarning: '#FFF3CD',
  alertError: '#FFEBEE',
  alertInfo: '#E3F2FD'
};
```

### Gradient Patterns

```javascript
// Common gradient patterns used throughout the app
const gradients = {
  blueGreen: 'linear-gradient(135deg, #0057FF 0%, #0DA67A 100%)',
  greenTeal: 'linear-gradient(135deg, #0DA67A 0%, #0891B2 100%)',
  greenDark: 'linear-gradient(135deg, #0DA67A 0%, #059669 100%)',
  redGradient: 'linear-gradient(135deg, #E74C3C 0%, #DC2626 100%)',
  purpleGradient: 'linear-gradient(135deg, #8A2BE2 0%, #9D4EDD 100%)',
  grayGradient: 'linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 100%)',
  lightRedGradient: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
  lightYellowGradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)'
};
```

---

## 📝 Typography

### Font Stack

```css
font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 
             'Droid Sans', 'Helvetica Neue', sans-serif;
```

### Font Weights

```javascript
const fontWeights = {
  normal: 400,
  semiBold: 600,
  bold: 700
};
```

### Responsive Font Sizing with Clamp

The app uses CSS `clamp()` for fluid typography that scales with viewport size:

```javascript
const fluidFontSizes = {
  // clamp(minimum, preferred, maximum)
  hero: 'clamp(24px, 5vw, 32px)',      // Main headings
  large: 'clamp(20px, 4vw, 28px)',     // Secondary headings
  display: 'clamp(24px, 5vw, 36px)',   // Dashboard titles
  medium: 'clamp(16px, 3vw, 20px)'     // Body text
};
```

### Fixed Font Sizes

```javascript
const fontSizes = {
  xs: 11,
  sm: 13,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 22,
  '4xl': 24,
  '5xl': 28,
  '6xl': 32,
  '7xl': 36,
  '8xl': 42
};
```

### Monospace Font

For numbers, phone inputs, and code-like displays:

```javascript
fontFamily: 'monospace',
letterSpacing: 2  // For phone/PIN displays
```

---

## ⌨️ Visual Keyboard Implementation

### Overview

The POS app uses **custom-built keyboards** with no external dependencies. Two types:
1. **Numeric Keypad** - For PIN, phone numbers, quantities
2. **QWERTY Keyboard** - For text input (client names)

---

### 1. Numeric Keypad

**Layout**: 3×3 grid (1-9) + bottom row (CLEAR, 0, BACKSPACE)

**Implementation Code**:

```javascript
// Numeric Keypad Component
const NumericKeypad = ({ onInput, onClear, onBackspace, value }) => {
  return (
    <div>
      {/* Display Area */}
      <div style={{ 
        background: '#F5F5F5', 
        borderRadius: 10, 
        padding: 16, 
        marginBottom: 16, 
        border: '2px solid #ddd', 
        minHeight: 60, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ 
          fontSize: 28, 
          fontWeight: 700, 
          color: '#2A2A2A', 
          letterSpacing: 2, 
          fontFamily: 'monospace' 
        }}>
          {value || <span style={{ color: '#bbb', fontSize: 16 }}>Enter Number</span>}
        </div>
      </div>
      
      {/* Number Grid 1-9 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 10, 
        marginBottom: 10 
      }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            type="button"
            onClick={() => onInput(num.toString())}
            style={{
              background: 'linear-gradient(135deg, #0057FF 0%, #0DA67A 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '18px',
              fontSize: 24,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'transform 0.1s',
              minHeight: 56
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {num}
          </button>
        ))}
      </div>
      
      {/* Bottom Row: Clear, 0, Backspace */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 10 
      }}>
        <button
          type="button"
          onClick={onClear}
          style={{
            background: '#FF5C5C',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '18px 12px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            minHeight: 56
          }}
        >
          CLEAR
        </button>
        <button
          type="button"
          onClick={() => onInput('0')}
          style={{
            background: 'linear-gradient(135deg, #0057FF 0%, #0DA67A 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '18px',
            fontSize: 24,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            minHeight: 56
          }}
        >
          0
        </button>
        <button
          type="button"
          onClick={onBackspace}
          style={{
            background: '#F5B700',
            color: '#2A2A2A',
            border: 'none',
            borderRadius: 10,
            padding: '18px',
            fontSize: 22,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            minHeight: 56
          }}
        >
          ⌫
        </button>
      </div>
    </div>
  );
};
```

**Password Display Variation** (shows bullets instead of numbers):

```javascript
// For password entry
<div style={{ fontSize: 28, fontWeight: 700, color: '#2A2A2A', letterSpacing: 8 }}>
  {password.split('').map((_, i) => '●').join('')}
  {!password && <span style={{ color: '#bbb', fontSize: 16 }}>Enter PIN</span>}
</div>
```

---

### 2. QWERTY Keyboard

**Layout**: 4 rows of keys + Space + Backspace

**Implementation Code**:

```javascript
// QWERTY Keyboard Component
const QwertyKeyboard = ({ onInput, onBackspace, onSpace, value }) => {
  const qwertyRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  return (
    <div>
      {/* Display Area */}
      <div style={{ 
        background: '#F5F5F5', 
        borderRadius: 10, 
        padding: 16, 
        marginBottom: 16, 
        border: '2px solid #ddd', 
        minHeight: 60, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: '#2A2A2A' }}>
          {value || <span style={{ color: '#bbb', fontSize: 16 }}>Enter Name</span>}
        </div>
      </div>

      {/* QWERTY Rows */}
      {qwertyRows.map((row, rowIdx) => (
        <div key={rowIdx} style={{ 
          display: 'flex', 
          gap: 6, 
          marginBottom: 6, 
          justifyContent: 'center' 
        }}>
          {row.map(letter => (
            <button
              key={letter}
              type="button"
              onClick={() => onInput(letter)}
              style={{ 
                background: '#0057FF', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                padding: '12px', 
                fontSize: 16, 
                fontWeight: 600, 
                cursor: 'pointer', 
                minWidth: 45, 
                boxShadow: '0 2px 6px rgba(0,87,255,0.3)' 
              }}
            >
              {letter}
            </button>
          ))}
        </div>
      ))}

      {/* Space and Backspace Row */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button
          type="button"
          onClick={onSpace}
          style={{ 
            flex: 1, 
            background: '#6B7280', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 10, 
            padding: 14, 
            fontSize: 16, 
            fontWeight: 600, 
            cursor: 'pointer' 
          }}
        >
          Space
        </button>
        <button
          type="button"
          onClick={onBackspace}
          style={{ 
            flex: 1, 
            background: '#FF5C5C', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 10, 
            padding: 14, 
            fontSize: 16, 
            fontWeight: 600, 
            cursor: 'pointer' 
          }}
        >
          ← Backspace
        </button>
      </div>
    </div>
  );
};
```

---

### 3. Keyboard Input Handlers

**State Management Pattern**:

```javascript
// State
const [inputValue, setInputValue] = useState('');

// Handlers
const handleInput = (char) => {
  setInputValue(prev => prev + char);
};

const handleBackspace = () => {
  setInputValue(prev => prev.slice(0, -1));
};

const handleClear = () => {
  setInputValue('');
};

const handleSpace = () => {
  setInputValue(prev => prev + ' ');
};
```

---

### 4. Keyboard Use Cases

| Context | Keyboard Type | Trigger | File Location |
|---------|--------------|---------|---------------|
| **Login Password** | Numeric Keypad | Role selection → Password modal | Line 8962-9100 |
| **Client Phone Entry** | Numeric Keypad | Create client modal (Step 1) | Line 9363-9413 |
| **Client Name Entry** | QWERTY Keyboard | Create client modal (Step 2) | Line 9441-9521 |
| **Quick Check-In Search** | Numeric Keypad | Active clients screen | Line 10048-10200 |

---

### 5. Keyboard Visual Feedback

**Button Press Animation**:

```javascript
onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
```

**Hover Effect Pattern**:

```javascript
onMouseEnter={e => {
  e.currentTarget.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
  e.currentTarget.style.color = '#fff';
  e.currentTarget.style.transform = 'scale(1.05)';
}}
onMouseLeave={e => {
  e.currentTarget.style.background = 'linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 100%)';
  e.currentTarget.style.color = '#2A2A2A';
  e.currentTarget.style.transform = 'scale(1)';
}}
```

---

## 📐 Layout Patterns

### 1. Responsive Grid System

**Auto-Fit Pattern** (most common):

```javascript
// Product tiles, menu items
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12
};

// Larger cards
const cardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 16
};

// Small tiles (buttons, icons)
const tileGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 12
};
```

**Fixed Columns**:

```javascript
// 2 columns
gridTemplateColumns: '1fr 1fr'

// 3 columns
gridTemplateColumns: 'repeat(3, 1fr)'

// Unequal columns
gridTemplateColumns: '2fr 1fr'  // 2:1 ratio
```

### 2. Flexbox Patterns

**Centered Content**:

```javascript
const centeredStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
```

**Space Between**:

```javascript
const spaceBetweenStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};
```

**Flex Wrap for Tiles**:

```javascript
const wrapStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0  // or specific gap value
};
```

### 3. Fixed Positioning

**Back Button (Top Left)**:

```javascript
const backButtonStyle = {
  position: 'fixed',
  top: 16,
  left: 16,
  background: '#fff',
  color: '#2A2A2A',
  border: 'none',
  borderRadius: 10,
  padding: '10px 20px',
  fontWeight: 600,
  fontSize: 16,
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  zIndex: 10
};
```

**Action Button (Top Right)**:

```javascript
const actionButtonStyle = {
  position: 'fixed',
  top: 16,
  right: 16,
  background: '#fff',
  color: '#0DA67A',
  border: 'none',
  borderRadius: 10,
  padding: '10px 16px',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  zIndex: 10
};
```

### 4. Modal Overlay Pattern

**Full-Screen Overlay**:

```javascript
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.7)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  overflowY: 'auto'
};
```

**Modal Content Box**:

```javascript
const modalContentStyle = {
  background: '#fff',
  borderRadius: 16,
  padding: 24,
  maxWidth: 600,
  width: '100%',
  boxShadow: '0 8px 48px rgba(0,0,0,0.3)',
  maxHeight: '90vh',
  overflowY: 'auto'
};
```

---

## 🎨 Component Styles

### 1. Button Hierarchy

**Primary Button** (main actions):

```javascript
const primaryButtonStyle = {
  background: 'linear-gradient(135deg, #0DA67A 0%, #059669 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '14px 20px',
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(13,166,122,0.3)',
  transition: 'all 0.2s'
};
```

**Secondary Button** (neutral actions):

```javascript
const secondaryButtonStyle = {
  background: '#eee',
  color: '#2A2A2A',
  border: 'none',
  borderRadius: 10,
  padding: '14px 20px',
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer'
};
```

**Danger Button** (delete, cancel):

```javascript
const dangerButtonStyle = {
  background: '#FF5C5C',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '14px 20px',
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer'
};
```

**Role Button** (login screen):

```javascript
const roleButtonStyle = {
  background: 'linear-gradient(135deg, #0057FF 0%, #0078D4 100%)',  // Role-specific gradient
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '16px 20px',
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,87,255,0.3)',
  transition: 'all 0.2s'
};
```

### 2. Card Styles

**Standard Card**:

```javascript
const cardStyle = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease'
};
```

**Highlighted Card** (with border):

```javascript
const highlightedCardStyle = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  border: '3px solid #E74C3C'  // Use role/status color
};
```

**Alert Card**:

```javascript
const alertCardStyle = {
  background: '#FFF3CD',  // Warning background
  borderRadius: 12,
  padding: 16,
  border: '2px solid #F5B700',
  color: '#856404',
  fontWeight: 600
};
```

### 3. Product Tile

**Menu Item Tile**:

```javascript
const tileStyle = {
  flex: '0 0 calc(33.33% - 8px)',
  minWidth: 140,
  maxWidth: 180,
  background: '#F9F9F9',
  padding: 12,
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  border: '2px solid #fff',
  transition: 'border 0.2s',
  userSelect: 'none'
};

// On hover/focus
tileStyle.border = '2px solid #0057FF';
```

### 4. Input Fields

**Standard Input**:

```javascript
const inputStyle = {
  width: '100%',
  padding: 12,
  borderRadius: 8,
  border: '2px solid #ddd',
  fontSize: 16,
  fontFamily: 'inherit',
  transition: 'border-color 0.2s'
};

// On focus
inputStyle.borderColor = '#0057FF';
inputStyle.outline = 'none';
```

### 5. Table Design

**Table Container**:

```javascript
const tableContainerStyle = {
  width: '100%',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
  margin: '16px 0'
};

const tableStyle = {
  width: '100%',
  minWidth: 600,
  borderCollapse: 'collapse'
};
```

**Table Header**:

```javascript
const thStyle = {
  background: '#EAEAEA',
  padding: '12px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: 14,
  color: '#2A2A2A'
};
```

**Table Row**:

```javascript
const tdStyle = {
  padding: '12px',
  borderBottom: '1px solid #eee',
  fontSize: 14,
  color: '#484848'
};
```

### 6. Badge/Label

**Status Badge**:

```javascript
const badgeStyle = {
  background: '#0DA67A',  // Status color
  color: '#fff',
  padding: '4px 12px',
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 700,
  textTransform: 'uppercase'
};
```

**Notification Badge**:

```javascript
const notificationBadgeStyle = {
  background: '#FF5C5C',
  color: '#fff',
  borderRadius: 12,
  padding: '2px 8px',
  fontSize: 14,
  fontWeight: 700,
  display: 'inline-block',
  minWidth: 20,
  textAlign: 'center'
};
```

### 7. Checkbox Selection

**Custom Checkbox Card**:

```javascript
const checkboxCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 16,
  background: '#F5F5F5',
  borderRadius: 12,
  cursor: 'pointer',
  border: '3px solid transparent',  // or '#0DA67A' when checked
  transition: 'all 0.2s'
};

const checkboxInputStyle = {
  width: 24,
  height: 24,
  cursor: 'pointer',
  accentColor: '#0DA67A'
};
```

---

## 📱 Responsive Design

### Breakpoints

```javascript
const breakpoints = {
  mobile: '< 640px',
  tablet: '640px - 1024px',
  desktop: '> 1024px'
};
```

### Touch-Friendly Sizing

**Minimum Touch Target** (iOS/Android guideline):

```javascript
const touchFriendlyStyle = {
  minHeight: 44,    // Minimum recommended for touch
  padding: '18px',  // Large padding for easy tapping
  fontSize: 24      // Readable on small screens
};
```

### Responsive Font Sizes

```css
/* Mobile */
@media (max-width: 768px) {
  .text-3xl { font-size: 24px; }
  .text-2xl { font-size: 20px; }
  .text-xl { font-size: 18px; }
}
```

### Safe Area Insets (Notched Devices)

```css
@supports (padding: env(safe-area-inset-top)) {
  body {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
}
```

### Orientation Support

**Portrait Mode**:

```css
@media screen and (orientation: portrait) {
  .modal-content {
    max-width: 90vw;
    max-height: 85vh;
  }
  
  .grid-2, .grid-3, .grid-4 {
    grid-template-columns: 1fr;
  }
}
```

**Landscape Mode**:

```css
@media screen and (orientation: landscape) {
  .modal-content {
    max-width: 600px;
    max-height: 90vh;
  }
  
  @media (max-height: 600px) {
    body {
      padding-top: 8px;
      padding-bottom: 8px;
    }
  }
}
```

---

## ✨ Animations

### 1. Fade In Animation

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease;
}
```

### 2. Pulse Animation (Status Indicators)

```css
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(13, 166, 122, 0.7);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(13, 166, 122, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(13, 166, 122, 0);
  }
}
```

**Implementation**:

```javascript
const pulseIndicatorStyle = {
  width: 14,
  height: 14,
  borderRadius: '50%',
  background: '#0DA67A',
  boxShadow: '0 0 8px #0DA67A',
  animation: 'pulse 2s infinite'
};
```

### 3. Flash Background

```css
@keyframes flashBg {
  0% { filter: brightness(1); }
  100% { filter: brightness(1.08); }
}
```

### 4. Button Hover Transition

```javascript
const buttonHoverStyle = {
  transition: 'all 0.2s ease'
};

// On hover
onMouseEnter={(e) => {
  e.currentTarget.style.transform = 'translateY(-2px)';
  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
}}

onMouseLeave={(e) => {
  e.currentTarget.style.transform = 'translateY(0)';
  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
}}
```

---

## 🖼️ Screen Layouts

### 1. Login Screen (Role Selection)

**Structure**:
- Dark background (#2A2A2A)
- Centered company logo (90×90px, rounded 18px)
- Company name heading
- Role selection subtitle
- 3×3 grid of role buttons
- Password modal overlay

**Code**:

```javascript
const loginScreenStyle = {
  minHeight: '100vh',
  background: '#2A2A2A',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center'
};

const logoStyle = {
  width: 90,
  height: 90,
  background: '#eee',
  borderRadius: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 38,
  color: '#bbb',
  fontWeight: 700,
  marginBottom: 32,
  overflow: 'hidden'
};

const roleGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12,
  maxWidth: 900,
  width: '100%',
  padding: '0 20px'
};
```

### 2. Cashier Dashboard

**Structure**:
- Gradient background (role-specific)
- Fixed back button (top left)
- Fixed "Requests" button with badge (top right)
- Centered title with emoji
- Cash drawer status banner (if open)
- Grid of action tiles (6 buttons)

**Code**:

```javascript
const dashboardStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #0DA67A 0%, #0891B2 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  paddingLeft: '20px',
  paddingRight: '20px',
  paddingTop: '80px',
  paddingBottom: '40px'
};

const cashDrawerBannerStyle = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  marginBottom: 24,
  maxWidth: 900,
  width: '100%',
  boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
};

const actionTileGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 16,
  maxWidth: 900,
  width: '100%'
};
```

### 3. Menu/Order Screen

**Structure**:
- White background
- Fixed back button
- Client ID display
- Unpaid orders warning (if any)
- Cart summary table
- Entrance fee box (if applicable)
- Payment buttons
- Product tiles by category

**Code**:

```javascript
const menuScreenStyle = {
  minHeight: '100vh',
  background: '#fff',
  paddingLeft: '20px',
  paddingRight: '20px',
  paddingTop: '80px',
  paddingBottom: '20px'
};

const cartTableStyle = {
  width: '100%',
  background: '#F5F5F5',
  borderRadius: 10,
  padding: 16,
  marginBottom: 16
};

const sectionTitleStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: '#0057FF',  // Category-specific color
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 8
};
```

### 4. Kitchen Manager Screen

**Structure**:
- Red gradient background
- Fixed back button
- Centered title
- Active orders count
- Auto-refreshing order cards (3s interval)
- Order age timer
- Item list with quantities

**Code**:

```javascript
const kitchenScreenStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #E74C3C 0%, #DC2626 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  paddingTop: '80px',
  paddingBottom: '20px'
};

const orderCardStyle = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  border: '3px solid #E74C3C',
  marginBottom: 16
};

const orderTimerStyle = {
  fontSize: 14,
  color: '#888',
  marginTop: 4
};
```

### 5. Payment Modal

**Structure**:
- Full-screen overlay
- White modal box
- Checkbox selection cards
- Grand total display (gradient background)
- Action buttons (Cancel / Pay Now)

**Code**:

```javascript
const paymentModalStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.7)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20
};

const grandTotalStyle = {
  background: 'linear-gradient(135deg, #0DA67A 0%, #059669 100%)',
  color: '#fff',
  padding: 20,
  borderRadius: 12,
  marginBottom: 24,
  textAlign: 'center'
};

const grandTotalAmountStyle = {
  fontSize: 36,
  fontWeight: 700,
  marginBottom: 8
};
```

---

## 🔧 Utility Patterns

### 1. Status Color Function

```javascript
const getStatusColor = (status) => {
  switch(status) {
    case 'approved': return '#0DA67A';
    case 'pending': return '#F5B700';
    case 'rejected': return '#FF5C5C';
    default: return '#6B7280';
  }
};
```

### 2. Time Since Function

```javascript
const getTimeSince = (timestamp) => {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 min ago';
  return `${minutes} mins ago`;
};
```

### 3. Currency Formatting

```javascript
// USD with 2 decimals
const formatUSD = (amount) => `$${amount.toFixed(2)}`;

// LBP with commas
const formatLBP = (amount) => `${(amount * 89500).toLocaleString()} LBP`;
```

---

## 📦 Styling Approach Summary

### **Method**: 95% Inline Styles + 5% External CSS

**Inline Styles (JavaScript Objects)**:
- Component-scoped styling
- Dynamic style generation
- Role-specific theming
- No CSS class naming conflicts
- Easier to implement conditional styles

**External CSS (App.css)**:
- Global resets
- Responsive grid utilities
- Animation keyframes
- Print styles
- Scrollbar customization
- Safe area insets
- Orientation-specific styles

### **Advantages**:
✅ Component-scoped styling  
✅ Dynamic style generation  
✅ No build tool dependencies for CSS  
✅ Role-specific theming easy to implement  
✅ No CSS class naming conflicts  

### **Considerations**:
⚠️ Large file size (App.js = 14k+ lines)  
⚠️ Style reusability requires JS objects/functions  
⚠️ No CSS auto-completion in some editors  

---

## 🎯 Quick Reference Checklist

### **For New Builders - Essential Elements**:

- [ ] **Colors**: Copy all role-specific gradients and color constants
- [ ] **Typography**: Use Poppins/Inter font stack with clamp() sizing
- [ ] **Keyboards**: Implement custom numeric keypad and QWERTY keyboard
- [ ] **Grids**: Use `repeat(auto-fit, minmax(Npx, 1fr))` pattern
- [ ] **Buttons**: Create 4 button variants (primary, secondary, danger, role)
- [ ] **Modals**: Implement overlay pattern with z-index 1000
- [ ] **Cards**: Border-radius 16px, box-shadow, white background
- [ ] **Touch Sizing**: Minimum 44px height for all interactive elements
- [ ] **Animations**: Add pulse for status indicators, transitions for buttons
- [ ] **Fixed Elements**: Back button (top-left), action button (top-right)

---

## 📚 File References

### Main Application Files:
- **App.js** (14,124 lines): All component logic and inline styles
- **App.css** (472 lines): Utility styles, animations, responsive classes
- **index.css** (14 lines): Global resets

### Key Sections in App.js:
- **Line 8700-8960**: Login screen and role selection
- **Line 8962-9100**: Password modal with numeric keypad
- **Line 9363-9550**: Create client modal with QWERTY keyboard
- **Line 10048-10200**: Quick check-in with numeric keypad
- **Line 11900-12100**: Payment modal structure
- **Line 1-100**: DownloadDropdown component and Kitchen Manager

---

## 🔍 Implementation Notes

### **No External UI Libraries**:
- No Material-UI, Ant Design, or Bootstrap
- 100% custom-built components
- Pure React with inline styles

### **No Keyboard Libraries**:
- Custom numeric and QWERTY keyboards
- No react-simple-keyboard or similar dependencies
- State-driven input handling

### **Responsive First**:
- Mobile-first design approach
- Touch-friendly sizing (44px minimum)
- Auto-fit grids for flexible layouts
- Safe area support for notched devices

### **State Management**:
- React hooks (useState, useEffect)
- No Redux or external state management
- JWT token stored in localStorage
- Polling for real-time updates (3s interval)

---

## 💡 Best Practices from Existing Code

1. **Use clamp() for fluid typography** - Scales smoothly across devices
2. **Role-based color coding** - Instant visual identification
3. **Touch-friendly button sizing** - 44px minimum, large padding
4. **Gradient backgrounds** - More visually appealing than solid colors
5. **Modal overlay pattern** - Consistent across all modals
6. **Auto-fit grids** - No media query breakpoints needed
7. **Fixed positioning** - Back/action buttons always accessible
8. **Visual feedback** - Scale transforms on button press
9. **Status indicators** - Pulse animation for live status
10. **Inline emojis** - Quick visual context (🍳, 💵, 🔍, etc.)

---

## 🚀 Getting Started

To recreate this POS app with the same UI:

1. **Set up React project** with no UI library dependencies
2. **Copy color constants** from the Color System section
3. **Implement the two keyboard components** (numeric + QWERTY)
4. **Create button hierarchy** with gradient styles
5. **Build modal overlay pattern** with fixed positioning
6. **Use auto-fit grids** for responsive layouts
7. **Add role-specific gradients** for each user type
8. **Implement touch-friendly sizing** (44px minimum)
9. **Copy animation keyframes** to App.css
10. **Test on mobile devices** with safe area insets

---

## 📧 Questions?

This document captures the core UI/UX patterns, color systems, keyboard implementations, and layout structures from the existing POS application. Use it as a reference to maintain visual consistency when building new features or recreating the app.

**Last Updated**: December 21, 2025  
**Source Files**: pos-frontend/src/App.js, pos-frontend/src/App.css  
**Total Components Documented**: 8 major screen layouts, 2 keyboard types, 50+ component styles
