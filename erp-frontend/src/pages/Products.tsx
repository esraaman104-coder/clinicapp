import { useState, useEffect, useCallback } from 'react';
import { productsApi, categoriesApi } from '../lib/api';
import type { Product, Category } from '../types';
import ProductModal from '../components/products/ProductModal';
import CategoryManager from '../components/products/CategoryManager';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Plus, Tag, Search, Pencil, Trash2, Package } from 'lucide-react';



const LIMIT = 20;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Load products
  const loadProducts = useCallback(async (resetOffset = false) => {
    try {
      setLoading(true);
      const currentOffset = resetOffset ? 0 : offset;
      const params: { limit: number; offset: number; search?: string; category_id?: string } = { limit: LIMIT, offset: currentOffset };
      if (search.trim()) params.search = search.trim();
      if (selectedCategory) params.category_id = selectedCategory;

      const res = await productsApi.list(params);
      const newProducts: Product[] = res.data;

      if (resetOffset) {
        setProducts(newProducts);
        setOffset(0);
      } else {
        setProducts(prev => (currentOffset === 0 ? newProducts : [...prev, ...newProducts]));
      }
      setHasMore(newProducts.length === LIMIT);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, offset]);

  const loadCategories = async () => {
    try {
      const res = await categoriesApi.list({ limit: 100 });
      setCategories(res.data.filter((c: Category) => c.is_active === true));
    } catch {
      // silent fail
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    const handler = setTimeout(() => { loadProducts(true); }, 300);
    return () => clearTimeout(handler);
  }, [search, selectedCategory]);

  const handleDeleteProduct = async (id: string) => {
    if (!globalThis.confirm('هل أنت متأكد من أرشفة هذا المنتج؟')) return;
    try {
      await productsApi.delete(id);
      loadProducts(true);
    } catch (err) {
      console.error('Failed to delete product', err);
      globalThis.alert('فشل حذف المنتج');
    }
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleModalSuccess = () => {
    setShowProductModal(false);
    setEditingProduct(null);
    loadProducts(true);
  };

  const handleLoadMore = () => {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
  };

  useEffect(() => {
    if (offset > 0) loadProducts(false);
  }, [offset]);

  const formatPrice = (val: number) =>
    val.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getMargin = (cost: number, sale: number) => {
    if (cost <= 0) return null;
    return (((sale - cost) / cost) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary flex items-center gap-3">
            <Package className="text-brand-primary" size={28} />
            إدارة المنتجات
          </h1>
          <p className="text-secondary text-sm mt-1">
            {products.length} منتج مسجل
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            icon={<Tag size={16} />}
            onClick={() => setShowCategoryManager(true)}
          >
            إدارة التصنيفات
          </Button>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
          >
            منتج جديد
          </Button>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="flex gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="بحث بالاسم أو SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-primary placeholder:text-muted outline-none focus:border-brand-primary transition-all font-body"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-primary font-body outline-none focus:border-brand-primary transition-all min-w-[160px]"
        >
          <option value="">كل التصنيفات</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* ─── Products Table ─── */}
      <div className="bg-bg-surface border border-white/7 rounded-2xl overflow-hidden">
        <table className="w-full" dir="rtl">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="text-right text-xs font-medium text-muted py-4 px-5">المنتج</th>
              <th className="text-right text-xs font-medium text-muted py-4 px-5">التصنيف</th>
              <th className="text-right text-xs font-medium text-muted py-4 px-5">الوحدة</th>
              <th className="text-right text-xs font-medium text-muted py-4 px-5">سعر التكلفة</th>
              <th className="text-right text-xs font-medium text-muted py-4 px-5">سعر البيع</th>
              <th className="text-right text-xs font-medium text-muted py-4 px-5">الهامش</th>
              <th className="text-right text-xs font-medium text-muted py-4 px-5">الحد الأدنى</th>
              <th className="text-right text-xs font-medium text-muted py-4 px-5">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && products.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-muted">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                    <span>جاري التحميل...</span>
                  </div>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-muted">
                    <Package size={40} className="opacity-30" />
                    <p className="text-sm">لا توجد منتجات</p>
                    {(search || selectedCategory) && (
                      <button
                        onClick={() => { setSearch(''); setSelectedCategory(''); }}
                        className="text-xs text-brand-primary hover:underline"
                      >
                        مسح الفلاتر
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              products.map(product => {
                const margin = getMargin(product.cost_price, product.sale_price);
                return (
                  <tr
                    key={product.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Product name + SKU */}
                    <td className="py-4 px-5">
                      <div className="font-medium text-sm text-primary">{product.name}</div>
                      {product.sku ? (
                        <div className="text-xs text-muted font-numeric mt-0.5">{product.sku}</div>
                      ) : null}
                    </td>

                    {/* Category */}
                    <td className="py-4 px-5">
                      {product.category_name ? (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-white/10"
                          style={{ color: product.category_color || '#C17A2B', backgroundColor: `${product.category_color || '#C17A2B'}18` }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: product.category_color || '#C17A2B' }} />
                          {product.category_name}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="py-4 px-5">
                      <Badge variant="secondary">{product.unit}</Badge>
                    </td>

                    {/* Cost Price */}
                    <td className="py-4 px-5">
                      <span className="font-numeric text-sm text-secondary">{formatPrice(product.cost_price)}</span>
                    </td>

                    {/* Sale Price */}
                    <td className="py-4 px-5">
                      <span className="font-numeric text-sm font-medium text-brand-primary">{formatPrice(product.sale_price)}</span>
                    </td>

                    {/* Margin */}
                    <td className="py-4 px-5">
                      {margin !== null ? (
                        <span className={`font-numeric text-xs px-2 py-0.5 rounded-full ${Number(margin) >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {margin}%
                        </span>
                      ) : <span className="text-muted text-xs">—</span>}
                    </td>

                    {/* Min Stock */}
                    <td className="py-4 px-5">
                      <span className="font-numeric text-sm text-secondary">{product.min_stock} {product.unit}</span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="p-1.5 text-muted hover:text-info hover:bg-info/10 rounded-lg transition-all"
                          title="تعديل"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                          title="أرشفة"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Load More */}
        {hasMore && products.length > 0 && !loading && (
          <div className="flex justify-center p-4 border-t border-white/5">
            <Button variant="ghost" size="sm" onClick={handleLoadMore} isLoading={loading}>
              تحميل المزيد
            </Button>
          </div>
        )}
      </div>

      {/* ─── Modals ─── */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
        onSuccess={handleModalSuccess}
        product={editingProduct}
      />
      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        onCategoriesChange={() => { loadCategories(); loadProducts(true); }}
      />
    </div>
  );
}
