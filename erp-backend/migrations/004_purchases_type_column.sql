-- 004_purchases_type_column.sql
-- ERP مواد البناء - Fix missing columns in purchases and purchase_items

DO $$ 
BEGIN 
    -- 1. Add 'type' column to purchases (cash/credit)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchases' AND column_name='type') THEN
        ALTER TABLE purchases ADD COLUMN type TEXT NOT NULL DEFAULT 'cash' CHECK (type IN ('cash', 'credit'));
    END IF;

    -- 2. Add 'reference_number' column to purchases
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchases' AND column_name='reference_number') THEN
        ALTER TABLE purchases ADD COLUMN reference_number TEXT;
    END IF;

    -- 3. Add 'tax' column to purchases
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchases' AND column_name='tax') THEN
        ALTER TABLE purchases ADD COLUMN tax NUMERIC(12,2) DEFAULT 0;
    END IF;

    -- 4. Add 'price' column to purchase_items (to match router code and PurchaseItemResponse)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_items' AND column_name='price') THEN
        ALTER TABLE purchase_items ADD COLUMN price NUMERIC(12,2);
    END IF;

    -- Sync price with cost_price for existing records if any
    UPDATE purchase_items SET price = cost_price WHERE price IS NULL;
    
END $$;
