import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Package, 
  AlertTriangle, 
  ArrowRightLeft, 
  Filter,
  Download,
  Loader2,
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { stockApi } from '../lib/api';
import type { StockItem } from '../types';

const StockPage: React.FC = () => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [isLoadingLow, setIsLoadingLow] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'low'>('all');

  useEffect(() => {
    fetchStock();
  }, [filterType]);

  const fetchStock = async () => {
    const isLowFilter = filterType === 'low';
    const setLoading = isLowFilter ? setIsLoadingLow : setIsLoadingAll;

    try {
      setLoading(true);
      const res = isLowFilter 
        ? await stockApi.lowStock({ limit: 100 })
        : await stockApi.list({ limit: 100 });
      
      setStock(res.data);
    } catch (err) {
      console.error('Failed to fetch stock', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = stock.filter(item => 
    item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">إدارة المخزون</h1>
          <p className="text-sm text-muted">متابعة الكميات والجرد لجميع الفروع والمخازن</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-all">
            <Download size={18} />
            تصدير الجرد
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-inverse rounded-lg text-sm font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-light transition-all">
            <Plus size={18} />
            إضافة مخزون
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'إجمالي الأصناف', value: stock.length, icon: <Package />, color: 'brand' },
          { 
            label: 'نواقص المخزن', 
            value: stock.filter(s => s.quantity <= (s.min_stock || 0)).length, 
            icon: <AlertTriangle />, 
            color: 'danger' 
          },
          { label: 'حركات اليوم', value: '14', icon: <ArrowRightLeft />, color: 'info' }
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-surface rounded-xl border border-white/5 flex items-center gap-4 shadow-sm">
            <div className={`p-3 rounded-lg ${
              stat.color === 'brand' ? 'bg-brand-primary/10 text-brand-primary' : 
              stat.color === 'danger' ? 'bg-danger/10 text-danger' : 'bg-info/10 text-info'
            }`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-sm text-muted font-medium">{stat.label}</div>
              <div className="text-2xl font-numeric font-bold">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-white/5 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5">
          <div className="relative w-full md:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="ابحث بالاسم أو SKU..."
              className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pr-10 pl-3 focus:border-brand-primary outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                filterType === 'all' ? 'bg-brand-primary/10 text-brand-primary font-bold' : 'text-muted hover:bg-white/5'
              }`}
            >
              الكل
            </button>
            <button 
              onClick={() => setFilterType('low')}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                filterType === 'low' ? 'bg-danger/10 text-danger font-bold' : 'text-muted hover:bg-white/5'
              }`}
            >
              النواقص
            </button>
            <div className="w-px h-6 bg-white/10 mx-2" />
            <button className="p-2 text-muted hover:text-primary transition-colors">
              <Filter size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-sm font-semibold text-muted">المنتج</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted text-center">SKU</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted text-center">الفئة</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted text-center">المخزن</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted text-center">الكمية</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted text-center">الحالة</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(filterType === 'low' ? isLoadingLow : isLoadingAll) ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    <Loader2 className="animate-spin mx-auto mb-2 text-brand-primary" />
                    جاري تحميل المخزون...
                  </td>
                </tr>
              ) : filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    لا توجد أصناف تطابق البحث
                  </td>
                </tr>
              ) : (
                filteredStock.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-primary">{item.product_name}</div>
                      <div className="text-[10px] text-muted font-bold uppercase">{item.unit}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-numeric text-sm">{item.sku}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-brand-primary/5 text-brand-primary rounded text-xs font-medium border border-brand-primary/10">
                        {item.category_name || 'بدون فئة'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-medium">{item.warehouse_name}</div>
                      <div className="text-[10px] text-muted">{item.branch_name}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-numeric font-bold text-lg">{item.quantity}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-24 h-1.5 bg-black/20 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((item.quantity / (item.min_stock * 3 || 50)) * 100, 100)}%` }}
                            className={`h-full rounded-full ${
                              item.quantity <= (item.min_stock || 0) ? 'bg-danger' : 
                              item.quantity <= (item.min_stock * 2 || 20) ? 'bg-warning' : 'bg-success'
                            }`}
                          />
                        </div>
                        <span className={`text-[10px] font-bold uppercase ${
                          item.quantity <= (item.min_stock || 0) ? 'text-danger' : 
                          item.quantity <= (item.min_stock * 2 || 20) ? 'text-warning' : 'text-success'
                        }`}>
                          {item.quantity <= (item.min_stock || 0) ? 'حرج' : 
                           item.quantity <= (item.min_stock * 2 || 20) ? 'منخفض' : 'جيد'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <button className="text-muted hover:text-brand-primary transition-colors p-2 rounded-full hover:bg-brand-primary/10">
                        <ArrowRightLeft size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockPage;
