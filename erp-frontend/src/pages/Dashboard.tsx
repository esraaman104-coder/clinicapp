import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  AlertCircle,
  Calendar,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';

interface DashboardStats {
  summary: {
    total_sales: number;
    invoice_count: number;
    total_profit: number;
    low_stock_count: number;
  };
  top_selling: Array<{
    name: string;
    total_qty: number;
    total_amount: number;
  }>;
  chart_data: Array<{
    date: string;
    amount: number;
  }>;
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const colorMap: Record<string, { bg: string; hover: string; iconBg: string; iconText: string }> = {
    brand: { 
      bg: 'bg-brand-primary/5', 
      hover: 'group-hover:bg-brand-primary/10', 
      iconBg: 'bg-brand-primary/10', 
      iconText: 'text-brand-primary' 
    },
    success: { 
      bg: 'bg-success/5', 
      hover: 'group-hover:bg-success/10', 
      iconBg: 'bg-success/10', 
      iconText: 'text-success' 
    },
    info: { 
      bg: 'bg-info/5', 
      hover: 'group-hover:bg-info/10', 
      iconBg: 'bg-info/10', 
      iconText: 'text-info' 
    },
    danger: { 
      bg: 'bg-danger/5', 
      hover: 'group-hover:bg-danger/10', 
      iconBg: 'bg-danger/10', 
      iconText: 'text-danger' 
    },
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/reports/dashboard');
        setStats(res.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary" size={40} />
      </div>
    );
  }

  if (!stats) return <div>خطأ في تحميل البيانات</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold">لوحة القيادة</h1>
          <p className="text-sm text-muted">ملخص الأداء لليوم {new Date().toLocaleDateString('ar-SA')}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-muted">
          <Calendar size={16} />
          <span>تحديث تلقائي</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'مبيعات اليوم', value: stats.summary.total_sales, sub: 'ر.س', icon: <ShoppingCart />, color: 'brand' },
          { label: 'أرباح اليوم', value: stats.summary.total_profit, sub: 'ر.س', icon: <TrendingUp />, color: 'success' },
          { label: 'عدد الفواتير', value: stats.summary.invoice_count, sub: 'فاتورة', icon: <Package />, color: 'info' },
          { label: 'نواقص المخزن', value: stats.summary.low_stock_count, sub: 'صنف', icon: <AlertCircle />, color: 'danger' },
        ].map((kpi, i) => {
          const colors = colorMap[kpi.color as keyof typeof colorMap] || colorMap.brand;
          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 bg-surface border border-white/5 rounded-2xl relative overflow-hidden group"
            >
              <div className={`absolute -right-4 -top-4 w-24 h-24 ${colors.bg} rounded-full blur-2xl ${colors.hover} transition-all`} />
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colors.iconBg} ${colors.iconText}`}>
                  {kpi.icon}
                </div>
                <ArrowUpRight size={16} className="text-muted group-hover:text-primary transition-colors" />
              </div>
              <div className="text-sm text-muted mb-1">{kpi.label}</div>
              <div className="text-2xl font-numeric font-bold flex items-baseline gap-1">
                {kpi.value.toLocaleString()}
                <span className="text-xs font-normal text-muted">{kpi.sub}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart (Simplified SVG Chart) */}
        <div className="lg:col-span-2 p-6 bg-surface border border-white/5 rounded-2xl flex flex-col">
          <h3 className="font-bold mb-6">منحنى المبيعات (7 أيام)</h3>
          <div className="flex-1 h-64 relative flex items-end gap-2 group">
            {stats.chart_data.map((d, i) => {
              const max = Math.max(...stats.chart_data.map(x => x.amount), 1);
              const height = (d.amount / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar">
                  <div className="w-full relative bg-white/5 rounded-t-lg overflow-hidden h-full flex items-end">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      className="w-full bg-brand-primary/20 group-hover/bar:bg-brand-primary/40 transition-all relative"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary shadow-[0_0_10px_rgba(193,122,43,0.5)]" />
                    </motion.div>
                  </div>
                  <div className="text-[10px] text-muted rotate-45 md:rotate-0 font-numeric">{d.date.split('-').slice(1).join('/')}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="p-6 bg-surface border border-white/5 rounded-2xl">
          <h3 className="font-bold mb-6">الأصناف الأكثر مبيعاً</h3>
          <div className="space-y-4">
            {stats.top_selling.map((p, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-transparent hover:border-white/10 transition-all">
                <div className="w-10 h-10 rounded-lg bg-brand-muted flex items-center justify-center text-brand-primary font-bold">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold truncate">{p.name}</div>
                  <div className="text-xs text-muted font-numeric">{p.total_qty} وحدة مباعة</div>
                </div>
                <div className="text-sm font-numeric font-bold text-success">
                  {p.total_amount.toLocaleString()}
                </div>
              </div>
            ))}
            {stats.top_selling.length === 0 && (
              <div className="py-12 text-center text-muted text-sm italic">لا توجد مبيعات مسجلة اليوم</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
