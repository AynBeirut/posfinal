# 🚀 QUICK TEST GUIDE - Ayn Beirut POS

## AUTOMATED TESTING - START HERE! 👇

### Option 1: One-Click Test Launch (RECOMMENDED)
```
Double-click: RUN-TESTS.bat
```
This will open 3 windows:
1. **Test Suite** - Automated test runner
2. **Database Test** - Verify users and credentials  
3. **POS Application** - The actual POS system

---

## MANUAL TESTING OPTIONS

### Option 2: Launch POS Only
```
Double-click: START-POS-V1.bat
```

### Option 3: Open Individual Test Files
- `pos-v1/test-suite.html` - Full automated test suite
- `pos-v1/database-test.html` - Database & authentication test
- `pos-v1/index.html` - Main POS application

---

## 📋 TEST CHECKLIST

### 1. Database Test (database-test.html)
- ✅ Check if IndexedDB initializes
- ✅ Verify default users exist
- ✅ Test login with credentials:
  - Admin: `admin` / `admin123`
  - Cashier: `cashier` / `cashier123`

### 2. Automated Tests (test-suite.html)
Click "🚀 Run All Tests" to execute:
- Database initialization
- Product CRUD operations
- Cart operations
- Payment processing
- Customer management
- Inventory tracking
- Reports generation

### 3. Manual POS Testing (index.html)

#### A. Product Management
- ✅ View products grid (10 default products)
- ✅ Search products
- ✅ Filter by category
- ✅ Click Admin Panel (⚙️) to add/edit/delete products

#### B. Shopping Cart
- ✅ Click products to add to cart
- ✅ Adjust quantities with +/- buttons
- ✅ Remove items with × button
- ✅ Clear cart

#### C. Payment Processing
- ✅ Click "💳 Pay Now"
- ✅ Enter customer info (optional)
- ✅ Try different payment methods:
  - Cash (with change calculation)
  - Card
  - Mobile Pay
- ✅ Complete payment
- ✅ View/print receipt

#### D. Additional Features
- ✅ Sales Reports (📊)
  - View daily/weekly/monthly stats
  - Check top products
  - Export to CSV
- ✅ Unpaid Orders (📋)
  - Click "Place Order" to save without payment
  - View saved orders
  - Pay later
- ✅ Customer Display (🖥️)
  - Opens secondary display for customers
- ✅ Barcode Scanner (📷)
  - Test with barcode: `7891234567890`

#### E. Inventory
- ✅ Check stock levels
- ✅ Low stock warnings
- ✅ Out of stock prevention

---

## 🔑 DEFAULT CREDENTIALS

**Auto-login is ENABLED for testing**
- The system automatically logs in as Admin
- No login screen shown
- To test login manually, disable auto-login in `js/auth.js`

**User Accounts:**
```
Admin:
  Username: admin
  Password: admin123
  Role: admin

Cashier:
  Username: cashier  
  Password: cashier123
  Role: cashier
```

---

## 📊 EXPECTED RESULTS

### On First Load:
1. Loading screen appears (~1 second)
2. Database initializes (creates 8 object stores)
3. 10 default products load
4. POS interface appears
5. All buttons active

### Performance Targets:
- Load time: < 2 seconds
- Search: Real-time filtering
- Cart updates: Instant
- Database ops: < 100ms
- Receipt generation: < 1 second

---

## 🐛 TROUBLESHOOTING

### Products not showing?
- Open Database Test and click "Initialize Users"
- Refresh the page

### Login issues?
- Auto-login is enabled by default
- Check Database Test to verify users exist

### Data not persisting?
- Check browser console for IndexedDB errors
- Clear browser data and retry
- Try different browser

### Receipt not printing?
- Use browser's print dialog (Ctrl+P)
- Check printer settings

---

## 📱 BROWSER COMPATIBILITY

**Recommended:**
- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+

**Required Features:**
- IndexedDB support
- LocalStorage
- Service Workers (for PWA)

---

## 🎯 SUCCESS CRITERIA

All tests PASS if:
1. ✅ Test Suite shows all tests passing
2. ✅ Can add products to cart
3. ✅ Payment completes successfully
4. ✅ Receipt generates correctly
5. ✅ Data persists after page reload
6. ✅ Reports show transaction history
7. ✅ No console errors

---

## 📞 QUICK REFERENCE

**File Locations:**
- Main POS: `pos-v1/index.html`
- Test Suite: `pos-v1/test-suite.html`
- DB Test: `pos-v1/database-test.html`

**Key Shortcuts:**
- `F1` - Focus search
- `F2` - Focus barcode scanner
- `Ctrl+Enter` - Checkout (if cart has items)
- `Escape` - Clear search / close modal

**Size:** 1.16 MB total
**Files:** ~50 total files
**Load Time:** < 2 seconds

---

## ✅ START TESTING NOW!

**Easiest way:**
```
Double-click: RUN-TESTS.bat
```

Then click "🚀 Run All Tests" in the Test Suite window!

---

*Ayn Beirut POS v1.0 - Tech made in Beirut, deployed worldwide* 🇱🇧
