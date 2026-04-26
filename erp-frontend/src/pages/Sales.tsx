import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  CreditCard, 
  Banknote, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShoppingCart,
  Warehouse as WarehouseIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { stockApi, customersApi, warehousesApi, salesApi } from '../lib/api';
import type { Customer, StockItem, Warehouse, InvoiceCreateRequest } from '../types';

// Updated interface to match flat backend response + internal state
interface CartItem {
  id: string; // product_id
  name: string;
  sku: string;
  price: number;
  qty: number;
  unit: string;
  availableStock: number;
}

const SalesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<StockItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchWarehouses();
  }, []);

  const fetchProducts = async (query = '') => {
    try {
      setIsLoading(true);
      const res = await stockApi.list({ search: query });
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await customersApi.list();
      setCustomers(res.data);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await warehousesApi.list();
      setWarehouses(res.data);
      if (res.data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch warehouses', err);
    }
  };

  const addToCart = (stockItem: StockItem) => {
    const existing = cart.find(item => item.id === stockItem.product_id);
    if (existing) {
      if (existing.qty >= stockItem.quantity) {
        setMessage({ type: 'error', text: 'لا يوجد مخزون كافٍ!' });
        return;
      }
      updateQuantity(existing.id, existing.qty + 1);
    } else {
      setCart([...cart, { 
        id: stockItem.product_id,
        name: stockItem.product_name || 'منتج غير معروف',
        sku: stockItem.sku || '',
        price: stockItem.sale_price || 0,
        qty: 1, 
        unit: stockItem.unit || '',
        availableStock: stockItem.quantity 
      }]);
    }
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) return;
    setCart(cart.map(item => {
      if (item.id === id) {
        if (qty > item.availableStock) return item;
        return { ...item, qty: qty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total = subtotal; // Discount/Tax can be added later

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (!selectedWarehouse) {
      setMessage({ type: 'error', text: 'يرجى اختيار مخزن للصرف!' });
      return;
    }
    if (paymentType === 'credit' && !selectedCustomer) {
      setMessage({ type: 'error', text: 'يرجى اختيار عميل للبيع الآجل!' });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // RULES logic: Cash: paid = total, Credit: paid = 0
      const paidAmount = paymentType === 'cash' ? total : 0;

      const payload: InvoiceCreateRequest = {
        customer_id: selectedCustomer,
        type: paymentType,
        subtotal: subtotal,
        discount: 0,
        tax: 0,
        total: total,
        paid_amount: paidAmount,
        items: cart.map(item => ({
          product_id: item.id,
          qty: item.qty,
          price: item.price,
          warehouse_id: selectedWarehouse
        }))
      };

      const res = await salesApi.createInvoice(payload);
      setMessage({ type: 'success', text: `تم إصدار الفاتورة بنجاح رقم: ${res.data.invoice_number}` });
      setCart([]);
      setSelectedCustomer(null);
      fetchProducts(); // Refresh stock
    } catch (err) {
      const axiosErr = err as import('axios').AxiosError<{ detail: string }>;
      setMessage({ type: 'error', text: axiosErr.response?.data?.detail || 'فشل إصدار الفاتورة' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">إدارة المبيعات</h1>
        <div className="flex gap-3">
          {message && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                message.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="text-sm font-medium">{message.text}</span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Products Column */}
        <div className="xl:col-span-7 flex flex-col space-y-4">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
            <input
              type="text"
              placeholder="البحث عن منتج (الاسم، SKU)..."
              className="w-full bg-surface border border-white/5 rounded-xl py-3 pr-12 pl-4 focus:border-brand-primary outline-none transition-all"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchProducts(e.target.value);
              }}
            />
          </div>

          <div className="flex-1 bg-surface border border-white/5 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <span className="text-sm font-semibold text-muted">قائمة المنتجات المتاحة</span>
              {isLoading && <Loader2 size={18} className="animate-spin text-brand-primary" />}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.length === 0 && !isLoading && (
                  <div className="col-span-full py-20 text-center text-muted">
                    لا توجد منتجات مطابقة للبحث
                  </div>
                )}
                {products.map((item) => (
                  <motion.div
                    key={item.id}
                    layoutId={item.id}
                    whileHover={{ y: -2 }}
                    className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-brand-primary/50 cursor-pointer transition-all group"
                    onClick={() => addToCart(item)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-primary">{item.product_name}</h3>
                        <p className="text-xs text-muted">SKU: {item.sku}</p>
                      </div>
                      <div className="text-lg font-numeric font-bold text-brand-primary">
                        {item.sale_price?.toFixed(2)} <span className="text-xs">ر.س</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        item.quantity > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}>
                        المخزن: {item.quantity} {item.unit}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-brand-primary text-inverse flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={18} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Cart/Summary Column */}
        <div className="xl:col-span-5 flex flex-col space-y-4">
          <div className="flex-1 bg-surface border border-white/5 rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-brand-primary" size={20} />
                <span className="text-sm font-semibold text-muted">سلة المبيعات</span>
              </div>
              <span className="bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-full text-xs font-bold">
                {cart.length} أصناف
              </span>
            </div>

            {/* Warehouse Selection */}
            <div className="p-4 border-b border-white/5 bg-white/5">
              <label className="text-xs text-muted mb-2 block font-medium">مخزن الصرف</label>
              <div className="relative">
                <WarehouseIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pr-10 pl-4 focus:border-brand-primary outline-none transition-all appearance-none cursor-pointer text-sm"
                  value={selectedWarehouse || ''}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                >
                  {warehouses.length === 0 && <option value="">جاري تحميل المخازن...</option>}
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id} className="bg-surface">{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence>
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted space-y-2 opacity-50">
                    <ShoppingCart size={48} />
                    <p>الفاتورة فارغة</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center gap-4"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-brand-primary font-numeric">{item.price?.toFixed(2)} ر.س</div>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1">
                        <button 
                          onClick={() => updateQuantity(item.id, item.qty - 1)}
                          className="p-1 hover:text-brand-primary transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-numeric font-bold">{item.qty}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.qty + 1)}
                          className="p-1 hover:text-brand-primary transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      <div className="w-20 text-left font-numeric font-bold text-sm">
                        {(item.price * item.qty).toFixed(2)}
                      </div>
                      
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-muted hover:text-danger transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            <div className="p-5 bg-white/5 border-t border-white/5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentType('cash')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                    paymentType === 'cash' 
                    ? 'bg-brand-primary border-brand-primary text-inverse font-bold' 
                    : 'bg-transparent border-white/10 text-muted'
                  }`}
                >
                  <Banknote size={18} />
                  نقدي
                </button>
                <button
                  onClick={() => setPaymentType('credit')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                    paymentType === 'credit' 
                    ? 'bg-brand-primary border-brand-primary text-inverse font-bold' 
                    : 'bg-transparent border-white/10 text-muted'
                  }`}
                >
                  <CreditCard size={18} />
                  آجل
                </button>
              </div>

              {paymentType === 'credit' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <label htmlFor="customer-select" className="text-xs text-muted px-1 font-medium">اختر العميل</label>
                  <div className="relative group">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-primary transition-colors" size={16} />
                    <select
                      id="customer-select"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pr-10 pl-4 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 outline-none transition-all appearance-none cursor-pointer text-sm"
                      value={selectedCustomer || ''}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                    >
                      <option value="" className="bg-surface">-- اختر عميل --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id} className="bg-surface">{c.name} (رصيد: {c.balance})</option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="pt-4 border-t border-white/5 space-y-2">
                <div className="flex justify-between text-muted text-sm">
                  <span>المجموع الفرعي</span>
                  <span className="font-numeric">{subtotal.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-xl font-display text-brand-primary font-bold pt-2">
                  <span>الإجمالي</span>
                  <span className="font-numeric">{total.toFixed(2)} ر.س</span>
                </div>
                {paymentType === 'credit' && (
                  <div className="flex justify-between text-xs text-brand-primary font-medium bg-brand-primary/10 p-2 rounded mt-2">
                    <span>المدفوع حالياً</span>
                    <span className="font-numeric">0.00 ر.س (سيضاف الرصيد لمديونية العميل)</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={cart.length === 0 || isSubmitting || !selectedWarehouse}
                className="w-full bg-brand-primary hover:bg-brand-light text-inverse py-4 rounded-xl font-display font-bold text-lg transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'تأكيد وإصدار الفاتورة'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;
