import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Loader2,
  Truck,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  PackageCheck,
  CreditCard,
  Banknote,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { purchasesApi, suppliersApi, productsApi, warehousesApi } from '../lib/api';
import type { PurchaseResponse, PurchaseCreateRequest } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Supplier { id: string; name: string; phone?: string; balance: number; }
interface Product  { id: string; name: string; sku: string; cost_price: number; unit: string; }
interface Warehouse { id: string; name: string; }

interface DraftItem {
  product_id: string;
  product_name: string;
  unit: string;
  qty: number;
  price: number;
  warehouse_id: string;
}

const emptyDraft = (): PurchaseCreateRequest => ({
  supplier_id: '',
  reference_number: '',
  type: 'cash',
  subtotal: 0,
  tax: 0,
  total: 0,
  paid_amount: 0,
  notes: '',
  items: [],
});

// ─── Main Component ───────────────────────────────────────────────────────────
const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseResponse[]>([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [page, setPage]             = useState(0);
  const limit = 20;

  // Modal state
  const [showModal, setShowModal]   = useState(false);
  const [isSaving, setIsSaving]     = useState(false);
  const [saveError, setSaveError]   = useState('');

  // Form state
  const [draft, setDraft]           = useState<PurchaseCreateRequest>(emptyDraft());
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  // Lookups
  const [suppliers, setSuppliers]   = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  // ── Fetch list ──────────────────────────────────────────────────────────────
  const fetchPurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await purchasesApi.list({ limit, offset: page * limit });
      setPurchases(res.data);
    } catch { /* ignore */ } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  // ── Open modal ──────────────────────────────────────────────────────────────
  const openModal = async () => {
    setDraft(emptyDraft());
    setDraftItems([]);
    setSaveError('');
    setShowModal(true);
    const [suppRes, whRes] = await Promise.all([
      suppliersApi.list(),
      warehousesApi.list(),
    ]);
    setSuppliers(suppRes.data);
    setWarehouses(whRes.data);
  };

  // ── Product search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!productSearch.trim()) { setProductResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await productsApi.search(productSearch, 8);
        setProductResults(res.data);
      } catch { setProductResults([]); }
      finally { setSearchingProducts(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const addProduct = (p: Product) => {
    const defaultWh = warehouses[0]?.id ?? '';
    setDraftItems(prev => [
      ...prev,
      { product_id: p.id, product_name: p.name, unit: p.unit, qty: 1, price: p.cost_price, warehouse_id: defaultWh },
    ]);
    setProductSearch('');
    setProductResults([]);
  };

  const updateItem = (idx: number, field: keyof DraftItem, value: string | number) => {
    setDraftItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const removeItem = (idx: number) => setDraftItems(prev => prev.filter((_, i) => i !== idx));

  // ── Totals ──────────────────────────────────────────────────────────────────
  const subtotal = draftItems.reduce((s, it) => s + it.qty * it.price, 0);
  const taxAmt   = subtotal * (draft.tax / 100);
  const total    = subtotal + taxAmt;

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!draft.supplier_id)       { setSaveError('اختر المورد أولاً'); return; }
    if (draftItems.length === 0)  { setSaveError('أضف منتجاً واحداً على الأقل'); return; }
    if (draftItems.some(it => !it.warehouse_id)) { setSaveError('حدد المخزن لكل منتج'); return; }

    setSaveError('');
    setIsSaving(true);
    try {
      const payload: PurchaseCreateRequest = {
        ...draft,
        subtotal,
        tax: taxAmt,
        total,
        items: draftItems.map(it => ({
          product_id:   it.product_id,
          qty:          it.qty,
          price:        it.price,
          warehouse_id: it.warehouse_id,
        })),
      };
      await purchasesApi.create(payload);
      setShowModal(false);
      fetchPurchases();
    } catch (e) {
      const err = e as import('axios').AxiosError<{ detail: string }>;
      setSaveError(err?.response?.data?.detail ?? 'حدث خطأ غير متوقع');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Status badge ────────────────────────────────────────────────────────────
  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      received: 'bg-success/10 text-success border-success/20',
      pending:  'bg-warning/10 text-warning border-warning/20',
      cancelled:'bg-danger/10 text-danger border-danger/20',
    };
    const labels: Record<string, string> = { received: 'مستلم', pending: 'معلق', cancelled: 'ملغي' };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${map[s] ?? 'bg-white/10 text-muted border-white/10'}`}>
        {labels[s] ?? s}
      </span>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">إدارة المشتريات</h1>
          <p className="text-sm text-muted">استلام البضاعة وتحديث المخزون والتكاليف تلقائياً</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-inverse rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-light transition-all"
        >
          <Plus size={20} />
          أمر شراء جديد
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'عدد أوامر الشراء', value: purchases.length, icon: <ShoppingBag />, colorClasses: 'bg-brand-primary/10 text-brand-primary' },
          { label: 'إجمالي المبالغ', value: purchases.reduce((s, p) => s + p.total, 0).toLocaleString('ar-EG') + ' ج', icon: <Banknote />, colorClasses: 'bg-success/10 text-success' },
          { label: 'مشتريات آجلة', value: purchases.filter(p => p.type === 'credit').length, icon: <CreditCard />, colorClasses: 'bg-warning/10 text-warning' },
        ].map((kpi, i) => (
          <div key={i} className="p-5 bg-surface rounded-xl border border-white/5 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${kpi.colorClasses}`}>{kpi.icon}</div>
            <div>
              <div className="text-xs text-muted">{kpi.label}</div>
              <div className="text-xl font-numeric font-bold">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
          <span className="text-sm font-bold text-muted uppercase tracking-widest">سجل المشتريات</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-2 text-muted hover:text-brand-primary disabled:opacity-30">
              <ChevronRight size={18} />
            </button>
            <span className="px-2 text-xs text-muted self-center">{page + 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={purchases.length < limit} className="p-2 text-muted hover:text-brand-primary disabled:opacity-30">
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="text-[10px] text-muted uppercase font-bold tracking-widest border-b border-white/5 bg-white/5">
                <th className="px-6 py-4">رقم الأمر</th>
                <th className="px-6 py-4">المورد</th>
                <th className="px-6 py-4 text-center">النوع</th>
                <th className="px-6 py-4 text-center">الحالة</th>
                <th className="px-6 py-4 text-left">الإجمالي</th>
                <th className="px-6 py-4 text-left">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-brand-primary" /></td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-muted text-sm">
                  <PackageCheck className="mx-auto mb-2 opacity-20" size={40} />
                  لا توجد أوامر شراء بعد
                </td></tr>
              ) : purchases.map(p => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-numeric text-sm font-bold text-brand-primary">{p.purchase_number}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold">
                        {p.supplier_name?.charAt(0) ?? <Truck size={12} />}
                      </div>
                      <span className="text-sm">{p.supplier_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${p.type === 'cash' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                      {p.type === 'cash' ? 'نقدي' : 'آجل'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">{statusBadge(p.status)}</td>
                  <td className="px-6 py-4 text-left font-numeric font-bold">{p.total.toLocaleString('ar-EG')} <span className="text-xs text-muted">ج</span></td>
                  <td className="px-6 py-4 text-left text-xs text-muted font-numeric">{new Date(p.created_at).toLocaleDateString('ar-EG')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-surface border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold">أمر شراء جديد</h2>
                  <p className="text-xs text-muted mt-0.5">سيتم تحديث المخزون والتكلفة المرجحة تلقائياً عند الحفظ</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/10 text-muted transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Row 1: Supplier + Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5">المورد *</label>
                    <select
                      value={draft.supplier_id}
                      onChange={e => setDraft(d => ({ ...d, supplier_id: e.target.value }))}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-primary transition-colors"
                    >
                      <option value="">— اختر المورد —</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5">نوع الشراء *</label>
                    <div className="flex gap-2">
                      {(['cash', 'credit'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setDraft(d => ({ ...d, type: t }))}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${
                            draft.type === t
                              ? t === 'cash' ? 'bg-success/10 text-success border-success/30' : 'bg-warning/10 text-warning border-warning/30'
                              : 'bg-black/20 border-white/10 text-muted hover:border-white/20'
                          }`}
                        >
                          {t === 'cash' ? '💵 نقدي' : '🕐 آجل'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 2: Reference + Tax */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5">رقم المرجع (اختياري)</label>
                    <input
                      type="text"
                      value={draft.reference_number ?? ''}
                      onChange={e => setDraft(d => ({ ...d, reference_number: e.target.value }))}
                      placeholder="رقم الفاتورة من المورد"
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5">نسبة الضريبة %</label>
                    <input
                      type="number" min={0} max={100}
                      value={draft.tax}
                      onChange={e => setDraft(d => ({ ...d, tax: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Product Search */}
                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5">إضافة منتج</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="ابحث باسم المنتج أو SKU..."
                      className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pr-9 pl-3 text-sm outline-none focus:border-brand-primary transition-colors"
                    />
                    {searchingProducts && <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-muted" size={14} />}
                    {productResults.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-surface border border-white/10 rounded-xl z-10 shadow-xl overflow-hidden">
                        {productResults.map(p => (
                          <button
                            key={p.id}
                            onClick={() => addProduct(p)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors text-sm text-right"
                          >
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted font-numeric">{p.cost_price.toLocaleString()} ج · {p.unit}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                {draftItems.length > 0 && (
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="bg-white/5 text-[10px] text-muted uppercase font-bold">
                          <th className="px-4 py-3">المنتج</th>
                          <th className="px-4 py-3 w-24 text-center">الكمية</th>
                          <th className="px-4 py-3 w-28 text-center">سعر الوحدة</th>
                          <th className="px-4 py-3 w-28 text-center">المخزن</th>
                          <th className="px-4 py-3 w-24 text-left">الإجمالي</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {draftItems.map((it, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2">
                              <div className="font-medium">{it.product_name}</div>
                              <div className="text-[10px] text-muted">{it.unit}</div>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number" min={1}
                                value={it.qty}
                                onChange={e => updateItem(i, 'qty', parseFloat(e.target.value) || 1)}
                                className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-center text-sm outline-none focus:border-brand-primary"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number" min={0} step={0.01}
                                value={it.price}
                                onChange={e => updateItem(i, 'price', parseFloat(e.target.value) || 0)}
                                className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-center text-sm outline-none focus:border-brand-primary"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <select
                                value={it.warehouse_id}
                                onChange={e => updateItem(i, 'warehouse_id', e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-brand-primary"
                              >
                                <option value="">— مخزن —</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2 text-left font-numeric font-bold text-brand-primary">
                              {(it.qty * it.price).toLocaleString('ar-EG')}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button onClick={() => removeItem(i)} className="text-muted hover:text-danger transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Totals */}
                {draftItems.length > 0 && (
                  <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm font-numeric">
                    <div className="flex justify-between text-muted"><span>الإجمالي الفرعي</span><span>{subtotal.toLocaleString('ar-EG')} ج</span></div>
                    <div className="flex justify-between text-muted"><span>الضريبة ({draft.tax}%)</span><span>{taxAmt.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج</span></div>
                    <div className="flex justify-between font-bold text-lg border-t border-white/10 pt-2"><span>الإجمالي</span><span className="text-brand-primary">{total.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج</span></div>
                    {draft.type === 'credit' && (
                      <div className="mt-2">
                        <label className="block text-xs font-bold text-muted mb-1">المبلغ المدفوع</label>
                        <input
                          type="number" min={0}
                          value={draft.paid_amount}
                          onChange={e => setDraft(d => ({ ...d, paid_amount: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-primary"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {saveError && (
                  <div className="flex items-center gap-2 text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">
                    <AlertCircle size={16} />
                    {saveError}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5">ملاحظات</label>
                  <textarea
                    rows={2}
                    value={draft.notes ?? ''}
                    onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-primary transition-colors resize-none"
                    placeholder="ملاحظات اختيارية..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-sm hover:bg-white/5 transition-all">
                  إلغاء
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-inverse rounded-xl text-sm font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-light disabled:opacity-60 transition-all"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                  تأكيد الاستلام
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PurchasesPage;
