import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Truck, 
  Phone, 
  Wallet, 
  History,
  ArrowUpRight,
  Plus,
  Loader2,
  MapPin
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  balance: number;
}

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch (err) {
      console.error('Failed to fetch suppliers', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.phone.includes(searchQuery)
  );

  const totalPayable = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display">إدارة الموردين</h1>
          <p className="text-sm text-muted">إدارة المشتريات والمدفوعات للموردين</p>
        </div>
        
        <button className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-inverse rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-light transition-all">
          <Plus size={20} />
          إضافة مورد جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-surface rounded-xl border border-white/5">
          <div className="p-3 w-fit rounded-lg bg-brand-primary/10 text-brand-primary mb-4">
            <Wallet size={24} />
          </div>
          <div className="text-sm text-muted">إجمالي مستحقات الموردين</div>
          <div className="text-2xl font-numeric font-bold text-warning">{totalPayable.toLocaleString()} <span className="text-sm">ر.س</span></div>
        </div>

        <div className="p-6 bg-surface rounded-xl border border-white/5">
          <div className="p-3 w-fit rounded-lg bg-info/10 text-info mb-4">
            <Truck size={24} />
          </div>
          <div className="text-sm text-muted">عدد الموردين المسجلين</div>
          <div className="text-2xl font-numeric font-bold">{suppliers.length}</div>
        </div>

        <div className="p-6 bg-surface rounded-xl border border-white/5">
          <div className="p-3 w-fit rounded-lg bg-success/10 text-success mb-4">
            <ArrowUpRight size={24} />
          </div>
          <div className="text-sm text-muted">مشتريات الشهر الحالي</div>
          <div className="text-2xl font-numeric font-bold">128,400 <span className="text-sm">ر.س</span></div>
        </div>
      </div>

      <div className="bg-surface border border-white/5 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5">
          <div className="relative w-full md:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="البحث باسم المورد أو الهاتف..."
              className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pr-10 pl-3 focus:border-brand-primary outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-muted">
              <Loader2 className="animate-spin mx-auto mb-2 text-brand-primary" />
              جاري تحميل قائمة الموردين...
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted">
              لا يوجد موردين مطابقين للبحث
            </div>
          ) : (
            filteredSuppliers.map((s) => (
              <motion.div 
                key={s.id}
                whileHover={{ scale: 1.01 }}
                className="bg-white/5 border border-white/10 rounded-xl p-5 flex gap-5 items-center group"
              >
                <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-muted group-hover:text-brand-primary transition-colors">
                  <Truck size={32} />
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg group-hover:text-brand-primary transition-colors">{s.name}</h3>
                    <div className="text-left font-numeric">
                      <div className="text-[10px] text-muted uppercase">المستحقات</div>
                      <div className="text-warning font-bold">{s.balance.toLocaleString()} ر.س</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Phone size={14} className="text-brand-primary" />
                      <span className="font-numeric">{s.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <MapPin size={14} className="text-brand-primary" />
                      <span>{s.address || 'العنوان غير مسجل'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-5 pt-4 border-t border-white/5">
                    <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                      <History size={14} />
                      سجل المشتريات
                    </button>
                    <button className="px-4 py-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-inverse rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                      <Wallet size={14} />
                      دفع مستحقات
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SuppliersPage;
