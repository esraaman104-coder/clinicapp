export interface Category {
  id: string;
  name: string;
  color: string;
  description?: string;
  is_active?: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category_id?: string;
  category_name?: string | null;
  category_color?: string | null;
  sale_price: number;
  cost_price: number;
  unit: string;
  min_stock: number;
  is_active?: boolean;
  created_at?: string;
}

export interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit: string;
  min_stock: number;
  category_name: string;
  branch_id: string;
  branch_name: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  updated_at: string;
  sale_price?: number;
  product?: Product;
}

export interface Warehouse {
  id: string;
  name: string;
  branch_id: string;
  location?: string;
  is_active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  credit_limit: number;
}

export interface InvoiceItem {
  product_id: string;
  qty: number;
  price: number;
  warehouse_id: string;
}

export interface InvoiceCreateRequest {
  customer_id: string | null;
  type: 'cash' | 'credit';
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  notes?: string;
  items: InvoiceItem[];
}

export interface InvoiceResponse {
  id: string;
  invoice_number: string;
  branch_id: string;
  customer_id: string | null;
  customer_name?: string;
  type: 'cash' | 'credit';
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  created_at: string;
}

export interface PurchaseItem {
  product_id: string;
  qty: number;
  price: number;
  warehouse_id: string;
}

export interface PurchaseItemResponse {
  id: string;
  product_id: string;
  product_name?: string;
  qty: number;
  price: number;
  total: number;
  warehouse_id: string;
}

export interface PurchaseCreateRequest {
  supplier_id: string;
  reference_number?: string;
  type: 'cash' | 'credit';
  subtotal: number;
  tax: number;
  total: number;
  paid_amount: number;
  notes?: string;
  items: PurchaseItem[];
}

export interface PurchaseResponse {
  id: string;
  purchase_number: string;
  reference_number?: string;
  branch_id: string;
  supplier_id: string;
  supplier_name?: string;
  type: 'cash' | 'credit';
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  paid_amount: number;
  notes?: string;
  created_at: string;
  items: PurchaseItemResponse[];
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  branch_id: string | null;
}
