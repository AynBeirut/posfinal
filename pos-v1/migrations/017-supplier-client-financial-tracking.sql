(-- Migration 017: Supplier & Client Financial Tracking System
-- Add payment terms, balance caching, visit tracking, and settings

-- 1. Add payment_terms_days to suppliers table
ALTER TABLE suppliers ADD COLUMN payment_terms_days INTEGER DEFAULT 30;

-- 2. Create supplier_balances_cache table for performance
CREATE TABLE IF NOT EXISTS supplier_balances_cache (
    supplier_id INTEGER PRIMARY KEY,
    total_purchases REAL DEFAULT 0,
    total_paid REAL DEFAULT 0,
    balance_owed REAL DEFAULT 0,
    last_delivery_date TEXT,
    last_payment_date TEXT,
    last_updated TEXT DEFAULT (datetime('now')),
    cache_expires_at TEXT DEFAULT (datetime('now', '+24 hours')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_supplier_balances_cache_expires ON supplier_balances_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_supplier_balances_cache_balance ON supplier_balances_cache(balance_owed);

-- 3. Add last_visit_date to customers table
ALTER TABLE customers ADD COLUMN last_visit_date TEXT;

-- Update last_visit_date from existing sales data
UPDATE customers 
SET last_visit_date = (
    SELECT MAX(date) 
    FROM sales 
    WHERE sales.customer_id = customers.id
);

CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(last_visit_date);

-- 4. Create settings table for configurable thresholds
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert default visit threshold settings
INSERT OR IGNORE INTO settings (key, value, description) VALUES 
    ('client_active_threshold_days', '30', 'Days threshold for marking clients as ACTIVE'),
    ('client_occasional_threshold_days', '90', 'Days threshold for marking clients as OCCASIONAL vs INACTIVE');

-- 5. Migrate existing payment_terms text to numeric days
-- Parse common formats: "Net 30" -> 30, "30 Days" -> 30, "COD" -> 0
UPDATE suppliers 
SET payment_terms_days = CASE
    WHEN payment_terms IS NULL OR payment_terms = '' THEN 30
    WHEN LOWER(payment_terms) LIKE '%cod%' OR LOWER(payment_terms) LIKE '%cash on delivery%' OR LOWER(payment_terms) LIKE '%upon receipt%' THEN 0
    WHEN payment_terms LIKE '%15%' THEN 15
    WHEN payment_terms LIKE '%30%' THEN 30
    WHEN payment_terms LIKE '%60%' THEN 60
    WHEN payment_terms LIKE '%90%' THEN 90
    ELSE 30
END
WHERE payment_terms_days IS NULL;

-- 6. Create function view for supplier status (for reporting)
CREATE VIEW IF NOT EXISTS supplier_status_view AS
SELECT 
    s.id,
    s.name,
    s.payment_terms_days,
    sbc.total_purchases,
    sbc.total_paid,
    sbc.balance_owed,
    sbc.last_delivery_date,
    CASE 
        WHEN sbc.last_delivery_date IS NOT NULL THEN
            date(sbc.last_delivery_date, '+' || s.payment_terms_days || ' days')
        ELSE NULL
    END as due_date,
    CASE
        WHEN sbc.balance_owed = 0 THEN 'PAID'
        WHEN sbc.last_delivery_date IS NOT NULL AND 
             date(sbc.last_delivery_date, '+' || s.payment_terms_days || ' days') < date('now') 
             AND sbc.balance_owed > 0 
        THEN 'OVERDUE'
        WHEN sbc.last_delivery_date IS NOT NULL AND 
             date(sbc.last_delivery_date, '+' || s.payment_terms_days || ' days') BETWEEN date('now') AND date('now', '+7 days')
             AND sbc.balance_owed > 0
        THEN 'DUE_SOON'
        ELSE 'CURRENT'
    END as status
FROM suppliers s
LEFT JOIN supplier_balances_cache sbc ON s.id = sbc.supplier_id;

-- 7. Create view for client status (for reporting)
CREATE VIEW IF NOT EXISTS client_status_view AS
SELECT 
    c.id,
    c.name,
    c.last_visit_date,
    CASE
        WHEN c.last_visit_date IS NULL THEN 'NEVER_VISITED'
        WHEN julianday('now') - julianday(c.last_visit_date) <= 
             (SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'client_active_threshold_days')
        THEN 'ACTIVE'
        WHEN julianday('now') - julianday(c.last_visit_date) <= 
             (SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'client_occasional_threshold_days')
        THEN 'OCCASIONAL'
        ELSE 'INACTIVE'
    END as status,
    CAST(julianday('now') - julianday(c.last_visit_date) AS INTEGER) as days_since_visit
FROM customers c;

-- 8. Add trigger to update last_visit_date on new sales
CREATE TRIGGER IF NOT EXISTS update_customer_visit_date
AFTER INSERT ON sales
BEGIN
    UPDATE customers 
    SET last_visit_date = NEW.date
    WHERE id = NEW.customer_id;
END;

-- 9. Add payment_impact column to supplier_payments for tracking payment effectiveness
ALTER TABLE supplier_payments ADD COLUMN payment_impact TEXT DEFAULT 'PARTIAL';

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deliveries_supplier_date ON deliveries(supplier_id, date);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_date ON supplier_payments(supplier_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer_date ON sales(customer_id, date);
