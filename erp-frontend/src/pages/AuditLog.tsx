import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Terminal,
  Activity
} from 'lucide-react';
import api from '../lib/api';

interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  module: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  old_value?: unknown;
  new_value?: unknown;
  ip_address?: string;
  timestamp: string;
}

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [moduleFilter, setModuleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  useEffect(() => {
    fetchLogs();
  }, [moduleFilter, page]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/logs', {
        params: {
          module: moduleFilter || undefined,
          limit,
          offset: page * limit
        }
      });
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    (log.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.module || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDetails = (log: AuditLog) => {
    if (!log.new_value && !log.old_value) return '-';
    return JSON.stringify(log.new_value ?? log.old_value ?? {}, null, 2);
  };

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      auth: 'bg-info/10 text-info',
      sales: 'bg-success/10 text-success',
      stock: 'bg-warning/10 text-warning',
      customers: 'bg-brand-primary/10 text-brand-primary',
      categories: 'bg-purple-500/10 text-purple-500',
      products: 'bg-blue-500/10 text-blue-500',
    };
    return colors[module] || 'bg-white/10 text-muted';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">سجل العمليات (Audit Log)</h1>
          <p className="text-sm text-muted">مراقبة كافة التغييرات والتحركات الأمنية في النظام</p>
        </div>
      </div>

      <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5">
          <div className="relative w-full md:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="ابحث بالمستخدم أو العملية..."
              className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pr-10 pl-3 focus:border-brand-primary outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <select 
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(0);
              }}
              className="bg-black/20 border border-white/10 rounded-lg py-2 px-4 text-sm outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="">كافة الموديولات</option>
              <option value="auth">تسجيل الدخول</option>
              <option value="sales">المبيعات</option>
              <option value="stock">المخزن</option>
              <option value="customers">العملاء</option>
              <option value="products">المنتجات</option>
              <option value="categories">التصنيفات</option>
            </select>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <div className="flex gap-1">
              <button 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 text-muted hover:text-brand-primary disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              <span className="flex items-center px-2 text-xs font-numeric font-bold text-muted">
                {page + 1}
              </span>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={logs.length < limit}
                className="p-2 text-muted hover:text-brand-primary disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="text-[10px] text-muted uppercase font-bold tracking-widest border-b border-white/5 bg-white/5">
                <th className="px-6 py-4">التاريخ والوقت</th>
                <th className="px-6 py-4">المستخدم</th>
                <th className="px-6 py-4">الموديول</th>
                <th className="px-6 py-4 text-center">العملية</th>
                <th className="px-6 py-4 text-left">التفاصيل الجديدة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-brand-primary mb-2" />
                    <span className="text-sm text-muted">جاري تحميل السجلات...</span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-muted text-sm italic">
                    <Activity className="mx-auto mb-2 opacity-20" size={48} />
                    لا توجد سجلات مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[11px] font-numeric text-muted group-hover:text-primary transition-colors">
                        <Clock size={14} className="text-brand-primary" />
                        {new Date(log.timestamp).toLocaleString('ar-EG')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-[10px] font-bold border border-brand-primary/20">
                          {log.user_name?.charAt(0) || <Terminal size={12} />}
                        </div>
                        <span className="text-sm font-medium">{log.user_name || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getModuleColor(log.module)}`}>
                        {log.module}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-bold text-primary">
                        {log.action}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div 
                        className="max-w-md truncate text-[11px] text-muted font-numeric bg-black/10 px-2 py-1 rounded border border-white/5 group-hover:border-white/10 transition-all" 
                        title={formatDetails(log)}
                      >
                        {formatDetails(log)}
                      </div>
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

export default AuditLogPage;
