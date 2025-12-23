# Quick Start Guide - Staff Management & Balance Dashboard

## 🎯 How to Access

### As Admin
1. Login with: `admin` / `admin123` / `Admin`
2. Click the **☰ Menu** button (top right)
3. You'll see:
   - 👥 **Staff** - Manage employees and payroll
   - 💰 **Balance** - View financial overview

### As Manager
1. Login with: `manager` / `manager123` / `Manager`
2. Click the **☰ Menu** button
3. You'll see:
   - 👥 **Staff** - Manage employees and payroll
   - (Balance is hidden for managers)

### As Cashier
- Staff and Balance buttons are hidden
- Cannot access these features

---

## 👥 Staff Management Quick Guide

### Add a New Employee
1. Click **👥 Staff**
2. Click **➕ Add New Staff**
3. Fill in:
   - First Name: *Required*
   - Last Name: *Required*
   - Position: e.g., "Cashier", "Cook", "Waiter"
   - Payment Type: Choose Monthly, Daily, or Hourly
   - Salary/Rate: Enter amount based on type
   - Overtime Rate: Optional
4. Click **Add Staff**
5. Employee code auto-generated (EMP0001, EMP0002...)

### Record Attendance
1. Find employee in staff list
2. Click **📅** icon
3. Select date
4. Choose status: Present, Absent, Leave, etc.
5. If Present:
   - Set check-in time (e.g., 09:00)
   - Set check-out time (e.g., 17:00)
   - Hours calculated automatically
6. Click **Save Attendance**
7. Manager approval:
   - Managers: Auto-approved
   - Others: Needs manager approval

### Generate Payroll
1. Find employee in staff list
2. Click **💰** icon
3. Set period:
   - Start Date: e.g., 2024-01-01
   - End Date: e.g., 2024-01-31
4. System calculates salary from attendance
5. Optional: Add bonus or deductions
6. Click **Generate Payroll**
7. Status: Pending (needs admin approval)

### Approve Payments (Admin Only)
1. Click **💰 Manage Payments** in Staff modal
2. See list of pending/approved payments
3. For pending payments:
   - Click **Approve** (changes to "Approved")
4. For approved payments:
   - Click **Mark as Paid** (records payment)
5. Done!

---

## 💰 Balance Dashboard Quick Guide

### View Current Month Balance
1. Click **💰 Balance** (menu)
2. Default period: Current Month
3. See three cards:
   - **Total Income**: Sales minus refunds
   - **Total Expenses**: Purchases + Bills + Salaries
   - **Net Balance**: Income minus expenses
4. If there are unpaid bills/salaries:
   - See **Pending Obligations** section
   - Shows what you still need to pay
   - **Projected Balance**: What's left after paying

### Change Time Period
Use the **Period Filter** dropdown:
- **Current Month**: This month only
- **This Week**: Last 7 days
- **Today**: Today only
- **This Year**: January to December
- **Custom Range**: Pick your own dates
- **All Time**: Everything since beginning

After selecting, click **🔄 Refresh**

### Export Report
1. View the balance you want
2. Click **📄 Export Report**
3. Downloads a text file with all details
4. Open in Notepad or any text editor

### Print Report
1. View the balance you want
2. Click **🖨️ Print**
3. Browser print dialog opens
4. Select printer and print

---

## 🧮 Salary Calculation Examples

### Monthly Salary
- **Setup**: Payment Type = Monthly, Salary = $3,000
- **Calculation**: Fixed $3,000 every month
- **Attendance**: Not counted (fixed amount)
- **Overtime**: Extra payment at overtime rate

### Daily Rate
- **Setup**: Payment Type = Daily, Rate = $100
- **Calculation**: $100 × number of working days
- **Example**: 22 working days = $2,200
- **Overtime**: Extra payment at overtime rate

### Hourly Rate
- **Setup**: Payment Type = Hourly, Rate = $15, OT Rate = $22.50
- **Calculation**: 
  - Regular: $15 × hours (max 8/day)
  - Overtime: $22.50 × hours beyond 8/day
- **Example**: 
  - Worked 9 hours in one day
  - Regular: $15 × 8 = $120
  - Overtime: $22.50 × 1 = $22.50
  - Total: $142.50

---

## 📊 Balance Calculation Example

Let's say for December 2024:

### Income
- Sales: $50,000
- Refunds: -$2,000
- **Net Income**: $48,000

### Expenses
- Purchases: $15,000 (paid)
- Bills: $5,000 (paid), $2,000 (unpaid)
- Salaries: $10,000 (paid), $3,000 (unpaid)
- **Total Paid Expenses**: $30,000

### Balance
- **Net Balance**: $48,000 - $30,000 = $18,000
- **Pending**: $2,000 + $3,000 = $5,000
- **Projected**: $18,000 - $5,000 = $13,000

The dashboard shows:
- ✅ You made $18,000 net profit
- ⚠️ But you still owe $5,000
- 💡 After paying all debts, you'll have $13,000

---

## 🔐 Permission Summary

| Action | Admin | Manager | Cashier |
|--------|:-----:|:-------:|:-------:|
| View Staff List | ✅ | ✅ | ❌ |
| Add/Edit Staff | ✅ | ✅ | ❌ |
| Record Attendance | ✅ | ✅ | ❌ |
| Approve Attendance | ❌ | ✅ | ❌ |
| Generate Payroll | ✅ | ✅ | ❌ |
| Approve Payment | ✅ | ❌ | ❌ |
| Mark as Paid | ✅ | ❌ | ❌ |
| View Balance | ✅ | ❌ | ❌ |

---

## ⚡ Tips & Tricks

1. **Employee Codes**: Auto-generated (EMP0001, EMP0002...) - no need to enter

2. **Overtime Threshold**: Default is 8 hours/day
   - Regular: First 8 hours
   - Overtime: Everything beyond 8

3. **Manager Approval**: When a manager records attendance, it's auto-approved
   - Others need manager to approve

4. **Payment Workflow**:
   - Generate → Pending
   - Approve → Approved
   - Mark Paid → Paid

5. **Balance Updates**: Not automatic - click **🔄 Refresh** to recalculate

6. **Last Update Time**: Shows when balance was last calculated

7. **Custom Dates**: Use "Custom Range" for specific periods like Q1, Q2, etc.

8. **Export Format**: Plain text - you can copy/paste into Excel if needed

---

## 🆘 Troubleshooting

### "Staff button not showing"
- Check your role (must be Admin or Manager)
- Try logging out and back in

### "Balance button not showing"
- Must be Admin (Managers can't see it)
- Check role in login

### "Cannot approve payment"
- Only Admins can approve payments
- Managers can only approve attendance

### "Hours not calculating"
- Make sure status is "Present"
- Check-in and check-out times must be filled
- Times must be in correct order (check-out after check-in)

### "Balance showing $0"
- Click **🔄 Refresh** button
- Check if date range has data
- Try "All Time" to see if there's any data

---

## 📱 Mobile/Tablet Support

- Fully responsive design
- Works on tablets and phones
- Use landscape mode for better view
- All features accessible on mobile

---

## 🎓 Training Checklist

### For Managers
- [ ] Add a new employee
- [ ] Record daily attendance
- [ ] Approve pending attendance
- [ ] Generate monthly payroll
- [ ] View staff list

### For Admins
- [ ] Everything managers can do, plus:
- [ ] Approve pending payments
- [ ] Mark payments as paid
- [ ] View balance dashboard
- [ ] Export balance report
- [ ] Understand net vs projected balance

---

**Need Help?** Check the full documentation in `STAFF_BALANCE_IMPLEMENTATION.md`
