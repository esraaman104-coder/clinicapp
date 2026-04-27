import { useState, useEffect, type FormEvent } from 'react';
import { categoriesApi } from '../../lib/api';
import type { Category } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

const PREDEFINED_COLORS = [
  '#C17A2B', '#2ECC82', '#E8455A', '#4A9EF5',
  '#F5A623', '#9B59B6', '#1ABC9C', '#E67E22'
];



interface CategoryManagerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onCategoriesChange: () => void;
}

export default function CategoryManager({ isOpen, onClose, onCategoriesChange }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PREDEFINED_COLORS[0]);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) loadCategories();
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await categoriesApi.list({ limit: 100 });
      setCategories(res.data);
    } catch {
      setError('فشل تحميل التصنيفات');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setColor(PREDEFINED_COLORS[0]);
    setDescription('');
    setError('');
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setColor(cat.color || PREDEFINED_COLORS[0]);
    setDescription(cat.description || '');
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!globalThis.confirm('هل أنت متأكد من أرشفة هذا التصنيف؟')) return;
    try {
      await categoriesApi.delete(id);
      await loadCategories();
      onCategoriesChange();
    } catch {
      setError('فشل حذف التصنيف');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('اسم التصنيف مطلوب'); return; }
    try {
      setSubmitLoading(true);
      setError('');
      const data = { name: name.trim(), color, description: description.trim() || undefined, is_active: true };
      if (editingId) {
        await categoriesApi.update(editingId, data);
      } else {
        await categoriesApi.create(data);
      }
      resetForm();
      await loadCategories();
      onCategoriesChange();
    } catch (err) {
      const axiosErr = err as import('axios').AxiosError<{ detail: string }>;
      setError(axiosErr?.response?.data?.detail || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إدارة التصنيفات" size="lg">
      <div className="grid grid-cols-2 gap-6">

        {/* ─── Form Section ─── */}
        <div>
          <h3 className="text-base font-bold text-brand-primary mb-4">
            {editingId ? 'تعديل تصنيف' : 'تصنيف جديد'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="اسم التصنيف"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: مواد بناء، إضاءة..."
              required
            />

            {/* Color Picker */}
            <div className="space-y-2" dir="rtl">
              <label htmlFor="color-hex-input" className="text-sm font-medium text-secondary block">اللون المميز</label>
              <div className="flex gap-2 flex-wrap">
                {PREDEFINED_COLORS.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    title={c}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-elevated scale-110' : 'opacity-70 hover:opacity-100'}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  id="color-picker-native"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border border-white/10"
                  aria-label="اختر لون من المنقي"
                />
                <Input
                  id="color-hex-input"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#C17A2B"
                />
              </div>
            </div>

            <Input
              label="الوصف (اختياري)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للتصنيف..."
            />

            {error && <p className="text-xs text-danger text-right">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" variant="primary" isLoading={submitLoading} fullWidth>
                {editingId ? 'حفظ التعديلات' : 'إضافة التصنيف'}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm}>إلغاء</Button>
              )}
            </div>
          </form>
        </div>

        {/* ─── List Section ─── */}
        <div className="border-r border-white/10 pr-6">
          <h3 className="text-base font-bold text-secondary mb-4">
            التصنيفات الحالية ({categories.filter(c => c.is_active).length})
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {loading ? (
              <p className="text-center text-muted py-4">جاري التحميل...</p>
            ) : null}
            {!loading && categories.length === 0 ? (
              <p className="text-center text-muted py-4">لا توجد تصنيفات بعد</p>
            ) : null}
            {!loading && categories.length > 0 ? (
              categories.map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div>
                      <span className={`text-sm font-medium ${cat.is_active ? 'text-primary' : 'text-muted line-through'}`}>
                        {cat.name}
                      </span>
                      {cat.description && (
                        <p className="text-xs text-muted">{cat.description}</p>
                      )}
                    </div>
                  </div>
                  {cat.is_active && (
                    <div className="flex gap-2 mr-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(cat)}
                        className="text-xs text-info hover:text-info/80 transition-colors px-2 py-1"
                      >تعديل</button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        className="text-xs text-danger hover:text-danger/80 transition-colors px-2 py-1"
                      >أرشفة</button>
                    </div>
                  )}
                </div>
              ))
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}
