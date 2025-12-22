-- Migration 018: Add Product Recipes and Recipe Snapshots
-- Date: 2025-12-22
-- Description: Support for composed products with ingredient recipes and historical cost tracking

-- Product Recipes Table
-- Defines the ingredients (raw materials) that compose a product
CREATE TABLE IF NOT EXISTS product_recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    raw_material_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (raw_material_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Sale Recipe Snapshots Table
-- Captures the recipe composition and costs at the time of sale
-- This ensures accurate historical COGS calculations even if ingredient costs change
CREATE TABLE IF NOT EXISTS sale_recipe_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    sale_item_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    raw_material_id INTEGER NOT NULL,
    raw_material_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    cost_per_unit REAL NOT NULL,
    total_cost REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (raw_material_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Add service_cost column to products table for composed products
-- This represents labor/preparation cost in addition to raw material costs
ALTER TABLE products ADD COLUMN service_cost REAL DEFAULT 0;

-- Add has_recipe flag to products table for quick filtering
ALTER TABLE products ADD COLUMN has_recipe INTEGER DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_recipes_product ON product_recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_material ON product_recipes(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_sale_snapshots_sale ON sale_recipe_snapshots(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_snapshots_product ON sale_recipe_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_products_has_recipe ON products(has_recipe);

-- Create view for easy recipe lookup with material details
CREATE VIEW IF NOT EXISTS v_product_recipes AS
SELECT 
    pr.id AS recipe_id,
    pr.product_id,
    p.name AS product_name,
    pr.raw_material_id,
    rm.name AS raw_material_name,
    pr.quantity,
    pr.unit,
    rm.cost AS current_cost_per_unit,
    (pr.quantity * rm.cost) AS current_line_cost,
    pr.created_at,
    pr.updated_at
FROM product_recipes pr
JOIN products p ON pr.product_id = p.id
JOIN products rm ON pr.raw_material_id = rm.id
WHERE rm.product_type = 'raw_material';

-- Create view for recipe cost summary
CREATE VIEW IF NOT EXISTS v_recipe_costs AS
SELECT 
    pr.product_id,
    p.name AS product_name,
    p.service_cost,
    SUM(pr.quantity * rm.cost) AS total_material_cost,
    p.service_cost + SUM(pr.quantity * rm.cost) AS total_cost,
    p.price AS selling_price,
    p.price - (p.service_cost + SUM(pr.quantity * rm.cost)) AS profit_margin,
    COUNT(pr.id) AS ingredient_count
FROM product_recipes pr
JOIN products p ON pr.product_id = p.id
JOIN products rm ON pr.raw_material_id = rm.id
WHERE rm.product_type = 'raw_material'
GROUP BY pr.product_id;
