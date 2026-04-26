-- 003_categories_products.sql

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    color       TEXT DEFAULT '#C17A2B',
    description TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Everyone can read
CREATE POLICY "Enable read access for all users" ON categories FOR SELECT USING (true);
-- Only admin can modify
CREATE POLICY "Enable all access for admins" ON categories FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- 4. Add category_id to products
ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- 5. Migrate Data
-- Insert unique categories from products, ignoring NULLs
INSERT INTO categories (name)
SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '';

-- Update category_id in products based on name
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE p.category = c.name;

-- 6. Drop old category column
ALTER TABLE products DROP COLUMN category;

-- 7. Add Index
CREATE INDEX idx_products_category_id ON products(category_id);
