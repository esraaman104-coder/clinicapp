import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  Phone, 
  CreditCard, 
  History,
  TrendingDown,
  TrendingUp,
  Loader2,
  DollarSign
} from 'lucide-react';
import api from '../lib/api';
import type { Customer } from '../types';

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filterDebtors, setFilterDebtors] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.phone.includes(searchQuery);
    const matchesDebt = filterDebtors ? c.balance > 0 : true;
    return matchesSearch && matchesDebt;
  });

  const totalBalance = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display">إدارة العملاء</h1>
          <p className="text-sm text-muted">إدارة المديونيات وكشوف الحسابات</p>
        </div>
        
        <button className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-inverse rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-light transition-all">
          <UserPlus size={20} />
          إضافة عميل جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-surface rounded-xl border border-white/5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-lg bg-brand-primary/10 text-brand-primary">
              <CreditCard size={24} />
            </div>
            <span className="text-[10px] bg-success/10 text-success px-2 py-1 rounded font-bold">نشط</span>
          </div>
          <div className="text-sm text-muted">إجمالي المديونيات</div>
          <div className="text-2xl font-numeric font-bold text-danger">{totalBalance.toLocaleString()} <span className="text-sm">ر.س</span></div>
        </div>

        <div className="p-6 bg-surface rounded-xl border border-white/5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-lg bg-info/10 text-info">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="text-sm text-muted">عدد العملاء</div>
          <div className="text-2xl font-numeric font-bold">{customers.length}</div>
        </div>

        <div className="p-6 bg-surface rounded-xl border border-white/5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-lg bg-warning/10 text-warning">
              <TrendingDown size={24} />
            </div>
          </div>
          <div className="text-sm text-muted">عملاء تجاوزوا الحد</div>
          <div className="text-2xl font-numeric font-bold">{customers.filter(c => c.balance > c.credit_limit).length}</div>
        </div>
      </div>

      <div className="bg-surface border border-white/5 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5">
          <div className="relative w-full md:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم الجوال..."
              className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pr-10 pl-3 focus:border-brand-primary outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div 
                onClick={() => setFilterDebtors(!filterDebtors)}
                className={`w-10 h-5 rounded-full relative transition-colors ${filterDebtors ? 'bg-brand-primary' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${filterDebtors ? 'left-1' : 'right-1'}`} />
              </div>
              <span className="text-sm text-muted group-hover:text-primary transition-colors">عرض المدينين فقط</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-muted">
              <Loader2 className="animate-spin mx-auto mb-2 text-brand-primary" />
              جاري تحميل قائمة العملاء...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted">
              لا يوجد عملاء مطابقين للبحث
            </div>
          ) : (
            filteredCustomers.map((c) => (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-brand-primary/50 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-full bg-brand-muted flex items-center justify-center text-brand-primary font-bold text-lg">
                    {c.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className={`text-xs px-2 py-1 rounded font-bold ${c.balance > 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                      {c.balance > 0 ? 'مدين' : 'خالص'}
                    </div>
                  </div>
                </div>

                <h3 className="font-bold text-lg mb-1 group-hover:text-brand-primary transition-colors">{c.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted mb-4">
                  <Phone size={14} />
                  <span className="font-numeric">{c.phone}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5 mb-4">
                  <div>
                    <div className="text-[10px] text-muted uppercase">الرصيد الحالي</div>
                    <div className={`font-numeric font-bold ${c.balance > 0 ? 'text-danger' : 'text-success'}`}>
                      {c.balance.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted uppercase">حد الائتمان</div>
                    <div className="font-numeric font-bold text-primary">
                      {c.credit_limit.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-brand-primary/10 rounded-lg text-xs font-semibold transition-all">
                    <History size={14} />
                    كشف حساب
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-inverse rounded-lg text-xs font-semibold transition-all">
                    <DollarSign size={14} />
                    تحصيل دفعة
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomersPage;
