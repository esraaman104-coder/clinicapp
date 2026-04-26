-- 001_initial_schema.sql
-- ERP مواد البناء - Initial Database Setup

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Tables

CREATE TABLE branches (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name        TEXT NOT NULL,
    location    TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE warehouses (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name        TEXT NOT NULL,
    branch_id   UUID REFERENCES branches(id) ON DELETE CASCADE,
    location    TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_warehouses_branch_id ON warehouses(branch_id);

CREATE TABLE users (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role        TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'cashier')),
    branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_branch_id ON users(branch_id);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE products (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name        TEXT NOT NULL,
    sku         TEXT UNIQUE,
    unit        TEXT NOT NULL,
    cost_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
    sale_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
    category    TEXT,
    min_stock   NUMERIC(12,3) DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_sku ON products(sku);

CREATE TABLE stock (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
    branch_id   UUID REFERENCES branches(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    quantity    NUMERIC(12,3) NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, branch_id, warehouse_id)
);
CREATE INDEX idx_stock_branch_id ON stock(branch_id);
CREATE INDEX idx_stock_product_id ON stock(product_id);
CREATE INDEX idx_stock_warehouse_id ON stock(warehouse_id);

CREATE TABLE customers (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name        TEXT NOT NULL,
    phone       TEXT,
    address     TEXT,
    balance     NUMERIC(12,2) DEFAULT 0,
    credit_limit NUMERIC(12,2) DEFAULT 0,
    branch_id   UUID REFERENCES branches(id),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_customers_branch_id ON customers(branch_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);

CREATE TABLE suppliers (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name        TEXT NOT NULL,
    phone       TEXT,
    address     TEXT,
    balance     NUMERIC(12,2) DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_suppliers_name_trgm ON suppliers USING GIN (name gin_trgm_ops);

CREATE TABLE invoices (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_number  TEXT UNIQUE NOT NULL,
    branch_id       UUID REFERENCES branches(id) NOT NULL,
    customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
    type            TEXT NOT NULL CHECK (type IN ('cash', 'credit')),
    status          TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled', 'returned')),
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount        NUMERIC(12,2) DEFAULT 0,
    tax             NUMERIC(12,2) DEFAULT 0,
    total           NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_amount     NUMERIC(12,2) DEFAULT 0,
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_invoices_branch_id ON invoices(branch_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

CREATE TABLE invoice_items (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id  UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id  UUID REFERENCES products(id),
    qty         NUMERIC(12,3) NOT NULL,
    price       NUMERIC(12,2) NOT NULL,
    cost_price  NUMERIC(12,2) NOT NULL,
    discount    NUMERIC(12,2) DEFAULT 0,
    total       NUMERIC(12,2) NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id)
);

CREATE TABLE purchases (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    purchase_number TEXT UNIQUE NOT NULL,
    supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    branch_id       UUID REFERENCES branches(id) NOT NULL,
    warehouse_id    UUID REFERENCES warehouses(id),
    status          TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount        NUMERIC(12,2) DEFAULT 0,
    total           NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_amount     NUMERIC(12,2) DEFAULT 0,
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_items (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_id  UUID REFERENCES products(id),
    qty         NUMERIC(12,3) NOT NULL,
    cost_price  NUMERIC(12,2) NOT NULL,
    total       NUMERIC(12,2) NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id)
);

CREATE TABLE payments (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'supplier')),
    entity_id   UUID NOT NULL,
    invoice_id  UUID REFERENCES invoices(id) ON DELETE SET NULL,
    purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
    amount      NUMERIC(12,2) NOT NULL,
    method      TEXT DEFAULT 'cash' CHECK (method IN ('cash', 'bank_transfer', 'check')),
    notes       TEXT,
    branch_id   UUID REFERENCES branches(id),
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_movements (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id  UUID REFERENCES products(id),
    branch_id   UUID REFERENCES branches(id),
    warehouse_id UUID REFERENCES warehouses(id),
    type        TEXT NOT NULL CHECK (type IN ('sale', 'purchase', 'return', 'adjustment', 'transfer')),
    qty_change  NUMERIC(12,3) NOT NULL,
    qty_before  NUMERIC(12,3) NOT NULL,
    qty_after   NUMERIC(12,3) NOT NULL,
    reference_type TEXT,
    reference_id   UUID,
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE logs (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      TEXT NOT NULL,
    module      TEXT NOT NULL,
    entity_type TEXT,
    entity_id   UUID,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  TEXT,
    branch_id   UUID REFERENCES branches(id),
    timestamp   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs           ENABLE ROW LEVEL SECURITY;

-- 4. Seed Data
INSERT INTO branches (id, name, location) VALUES 
('b1000000-0000-0000-0000-000000000001', 'فرع القاهرة', 'مدينة نصر'),
('b1000000-0000-0000-0000-000000000002', 'فرع الجيزة', 'المهندسين');

INSERT INTO warehouses (id, name, branch_id) VALUES 
('c1000000-0000-0000-0000-000000000001', 'مخزن القاهرة الرئيسي', 'b1000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000002', 'مخزن القاهرة الفرعي', 'b1000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000003', 'مخزن الجيزة', 'b1000000-0000-0000-0000-000000000002');

-- Password is 'admin123' (hashed)
INSERT INTO users (id, name, email, password_hash, role, branch_id) VALUES 
('a1000000-0000-0000-0000-000000000001', 'المدير العام', 'admin@erp.com', '$2b$12$LQv3c1yqBWVHxkd0LqG8S.D5M0u6W5G4uFv1yvV9GZ5v5v5v5v5v', 'admin', NULL);
