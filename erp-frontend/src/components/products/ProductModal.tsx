import React, { useState, useEffect } from 'react';
import { productsApi, categoriesApi } from '../../lib/api';
import type { Category, Product } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';



interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
}

const UNIT_OPTIONS = ['قطعة', 'كجم', 'طن', 'متر', 'متر مربع', 'متر مكعب', 'لتر', 'جالون', 'كيس', 'رول'];

export default function ProductModal({ isOpen, onClose, onSuccess, product }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('قطعة');
  const [costPrice, setCostPrice] = useState('0');
  const [salePrice, setSalePrice] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [minStock, setMinStock] = useState('0');

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (product) {
        setName(product.name);
        setSku(product.sku || '');
        setUnit(product.unit);
        setCostPrice(String(product.cost_price));
        setSalePrice(String(product.sale_price));
        setCategoryId(product.category_id || '');
        setMinStock(String(product.min_stock));
      } else {
        setName('');
        setSku('');
        setUnit('قطعة');
        setCostPrice('0');
        setSalePrice('0');
        setCategoryId('');
        setMinStock('0');
      }
      setError('');
    }
  }, [isOpen, product]);

  const loadCategories = async () => {
    try {
      const res = await categoriesApi.list({ limit: 100 });
      setCategories(res.data.filter((c: Category) => c.is_active === true));
    } catch {
      // silent fail - categories are optional
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('اسم المنتج مطلوب'); return; }
    if (!unit.trim()) { setError('الوحدة مطلوبة'); return; }
    if (Number(salePrice) < Number(costPrice)) {
      setError('سعر البيع يجب أن يكون أكبر من أو يساوي سعر التكلفة');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        unit: unit.trim(),
        cost_price: Number(costPrice),
        sale_price: Number(salePrice),
        category_id: categoryId || undefined,
        min_stock: Number(minStock),
        is_active: true
      };
      if (product) {
        await productsApi.update(product.id, data);
      } else {
        await productsApi.create(data);
      }
      onSuccess();
    } catch (err) {
      const axiosErr = err as import('axios').AxiosError<{ detail: string }>;
      setError(axiosErr?.response?.data?.detail || 'حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const margin = Number(costPrice) > 0
    ? (((Number(salePrice) - Number(costPrice)) / Number(costPrice)) * 100).toFixed(1)
    : '0';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? 'تعديل منتج' : 'إضافة منتج جديد'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Row 1: Name + SKU */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="اسم المنتج *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: أسمنت بورتلاند 50 كجم"
            required
          />
          <Input
            label="SKU / الباركود"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="مثال: CEM-001"
          />
        </div>

        {/* Row 2: Category + Unit */}
        <div className="grid grid-cols-2 gap-4" dir="rtl">
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary block">التصنيف</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-primary font-body outline-none focus:border-brand-primary transition-all"
            >
              <option value="">بدون تصنيف</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary block">الوحدة *</label>
            <div className="flex gap-2">
              <select
                value={UNIT_OPTIONS.includes(unit) ? unit : '__custom__'}
                onChange={(e) => {
                  if (e.target.value !== '__custom__') setUnit(e.target.value);
                }}
                className="bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-primary font-body outline-none focus:border-brand-primary transition-all"
              >
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                <option value="__custom__">أخرى...</option>
              </select>
              {!UNIT_OPTIONS.includes(unit) && (
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="وحدة مخصصة"
                />
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Prices + Min Stock */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="سعر التكلفة *"
            type="number"
            step="0.01"
            min="0"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            required
          />
          <div>
            <Input
              label="سعر البيع *"
              type="number"
              step="0.01"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              required
            />
            {Number(costPrice) > 0 && (
              <p className={`text-xs mt-1 font-numeric text-right ${Number(margin) >= 0 ? 'text-success' : 'text-danger'}`}>
                هامش الربح: {margin}%
              </p>
            )}
          </div>
          <Input
            label="الحد الأدنى للمخزون"
            type="number"
            step="0.001"
            min="0"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
          />
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
            <p className="text-sm text-danger text-right">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
          <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            {product ? 'تحديث المنتج' : 'إضافة المنتج'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
