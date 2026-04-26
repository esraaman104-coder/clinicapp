import React, { useState } from 'react';
import { 
  BarChart3, 
  PieChart, 
  FileText, 
  Download, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'profit' | 'inventory'>('sales');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">التقارير التحليلية</h1>
          <p className="text-sm text-muted">تقارير مفصلة عن أداء العمليات المالية والمخزنية</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button className="flex items-center gap-3 px-4 py-2 bg-surface border border-white/10 rounded-xl text-sm hover:border-brand-primary transition-all">
               <span>الشهر الحالي</span>
            </button>
          </div>
          <button className="flex items-center gap-2 px-6 py-2 bg-brand-primary text-inverse rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-light transition-all">
            <Download size={18} />
            تصدير PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-surface border border-white/5 rounded-2xl w-fit">
        {[
          { id: 'sales', label: 'المبيعات', icon: <BarChart3 size={18} /> },
          { id: 'profit', label: 'الأرباح', icon: <PieChart size={18} /> },
          { id: 'inventory', label: 'المخزون', icon: <FileText size={18} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-brand-primary text-inverse shadow-lg' 
                : 'text-muted hover:text-primary hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          {/* Summary Mini-Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'إجمالي المبيعات', value: '450,200', trend: '+12%', up: true },
              { label: 'عدد العمليات', value: '1,240', trend: '+5%', up: true },
              { label: 'متوسط الفاتورة', value: '363', trend: '-2%', up: false },
              { label: 'المرتجعات', value: '12,400', trend: '+1%', up: false }
            ].map((s) => (
              <div key={s.label} className="p-4 bg-surface border border-white/5 rounded-2xl">
                <div className="text-xs text-muted mb-1">{s.label}</div>
                <div className="flex items-center justify-between">
                  <div className="text-xl font-numeric font-bold">{s.value} <span className="text-[10px] text-muted">ر.س</span></div>
                  <div className={`flex items-center text-[10px] font-bold ${s.up ? 'text-success' : 'text-danger'}`}>
                    {s.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {s.trend}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Report Table */}
          <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="font-bold flex items-center gap-2">
                <Filter size={18} className="text-brand-primary" />
                تفاصيل مبيعات الفترة
              </h3>
              <div className="text-xs text-muted">يعرض آخر 100 عملية</div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="text-xs text-muted uppercase border-b border-white/5">
                    <th className="px-6 py-4">التاريخ</th>
                    <th className="px-6 py-4">رقم الفاتورة</th>
                    <th className="px-6 py-4">العميل</th>
                    <th className="px-6 py-4 text-center">النوع</th>
                    <th className="px-6 py-4 text-center">المبلغ</th>
                    <th className="px-6 py-4 text-left">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 text-xs font-numeric">2026-04-{25-i} 14:30</td>
                      <td className="px-6 py-4 font-bold text-sm">INV-20260425-000{i+1}</td>
                      <td className="px-6 py-4 text-sm">عميل نقدي</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-brand-primary/10 text-brand-primary text-[10px] rounded font-bold">نقدي</span>
                      </td>
                      <td className="px-6 py-4 text-center font-numeric font-bold">1,250.00</td>
                      <td className="px-6 py-4 text-left">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-success/10 text-success text-[10px] rounded font-bold">
                          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                          مكتمل
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-white/5 text-center">
              <button className="text-brand-primary text-xs font-bold hover:underline">عرض المزيد من العمليات</button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ReportsPage;
