import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Store, 
  Settings as SettingsIcon,
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  Loader2,
  Lock
} from 'lucide-react';
import api from '../lib/api';

type Section = 'users' | 'branches' | 'system';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  branch_id: string | null;
}

const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeSection === 'users') {
      fetchUsers();
    }
  }, [activeSection]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">الإعدادات والتحكم</h1>
        <p className="text-sm text-muted">إدارة المستخدمين، الفروع، وصلاحيات النظام</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 space-y-2">
          {[
            { id: 'users', label: 'إدارة المستخدمين', icon: <Users size={18} /> },
            { id: 'branches', label: 'الفروع والمخازن', icon: <Store size={18} /> },
            { id: 'system', label: 'إعدادات النظام', icon: <SettingsIcon size={18} /> }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as Section)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeSection === item.id 
                  ? 'bg-brand-primary text-inverse shadow-lg shadow-brand-primary/20' 
                  : 'text-muted hover:text-primary hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          
          <div className="pt-4 mt-4 border-t border-white/5">
            <div className="px-4 py-2 text-[10px] text-muted uppercase font-bold tracking-widest">الأمان</div>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-muted hover:text-primary rounded-xl text-sm font-bold transition-all">
              <ShieldCheck size={18} />
              صلاحيات الأدوار
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {activeSection === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">قائمة المستخدمين</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-inverse rounded-lg text-sm font-bold transition-all">
                  <UserPlus size={18} />
                  إضافة مستخدم
                </button>
              </div>

              <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
                {isLoading ? (
                  <div className="py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-brand-primary" />
                  </div>
                ) : (
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5 text-xs text-muted">
                        <th className="px-6 py-4">المستخدم</th>
                        <th className="px-6 py-4">الدور</th>
                        <th className="px-6 py-4">الفرع</th>
                        <th className="px-6 py-4">الحالة</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold">{user.name}</div>
                            <div className="text-xs text-muted">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 text-sm font-numeric">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                              user.role === 'admin' ? 'bg-danger/10 text-danger' : 'bg-info/10 text-info'
                            }`}>
                              {user.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted">فرع المستودع الرئيسي</td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold ${user.is_active ? 'text-success' : 'text-danger'}`}>
                              ● {user.is_active ? 'نشط' : 'معطل'}
                            </span>
                          </td>
                          <td className="px-6 py-4 flex justify-end gap-2">
                            <button className="p-2 text-muted hover:text-brand-primary transition-all"><Edit2 size={16} /></button>
                            <button className="p-2 text-muted hover:text-danger transition-all"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeSection === 'branches' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-surface border border-brand-primary/20 rounded-2xl relative overflow-hidden">
                <div className="absolute top-4 left-4"><Store size={24} className="text-brand-primary" /></div>
                <h3 className="font-bold text-lg mb-1">الفرع الرئيسي</h3>
                <p className="text-xs text-muted mb-4">الرياض، حي السلي - طريق الخرج</p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-white/5 rounded text-[10px] text-muted">3 مستودعات</span>
                  <span className="px-2 py-1 bg-white/5 rounded text-[10px] text-muted">12 موظف</span>
                </div>
              </div>
              
              <button className="p-6 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-muted hover:text-brand-primary hover:border-brand-primary transition-all gap-2">
                <Plus size={24} />
                <span className="font-bold">إضافة فرع جديد</span>
              </button>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="bg-surface border border-white/5 rounded-2xl p-8 space-y-8">
              <div className="space-y-4">
                <h3 className="font-bold border-b border-white/5 pb-2">بيانات المؤسسة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-muted mr-1">اسم المؤسسة</label>
                    <input className="w-full bg-black/20 border border-white/10 rounded-xl p-3 outline-none" defaultValue="مؤسسة مواد البناء الكبرى" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted mr-1">الرقم الضريبي</label>
                    <input className="w-full bg-black/20 border border-white/10 rounded-xl p-3 outline-none" defaultValue="300012345600003" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="font-bold border-b border-white/5 pb-2">إعدادات الأمان</h3>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-lg"><Lock size={20} /></div>
                    <div>
                      <div className="font-bold">المصادقة الثنائية (2FA)</div>
                      <div className="text-xs text-muted text-right">زيادة أمان حسابات الإدارة عبر تأكيد الجوال</div>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-white/10 rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-muted rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
