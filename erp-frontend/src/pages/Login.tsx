import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email: username, // Assuming username input is used for email
        password: password
      });

      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('refresh_token', res.data.refresh_token);
      navigate('/');
    } catch (err) {
      const axiosErr = err as import('axios').AxiosError<{ detail: string }>;
      setError(axiosErr.response?.data?.detail || 'فشل تسجيل الدخول. تحقق من البيانات.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-display text-brand-primary font-black">ERP</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-primary">تسجيل الدخول</h1>
          <p className="text-muted mt-2">نظام إدارة مواد البناء المتكامل</p>
        </div>

        <div className="bg-surface border border-white/5 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-3 text-danger text-sm"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-muted mr-1">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  id="username"
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pr-12 pl-4 focus:border-brand-primary outline-none transition-all"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-muted mr-1">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  id="password"
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pr-12 pl-4 focus:border-brand-primary outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-primary hover:bg-brand-light text-inverse py-4 rounded-xl font-display font-bold text-lg transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : 'دخول للنظام'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-muted">جميع الحقوق محفوظة © 2026</p>
          </div>
        </div>
      </motion.div>

      <style>{`
        :root {
          --color-bg-base: #0F1117;
          --color-bg-surface: #171B26;
          --color-brand-primary: #C17A2B;
          --color-brand-light: #D4954A;
          --color-text-primary: #F0EDE8;
          --color-text-muted: #5C5A56;
          --color-danger: #E8455A;
        }
        body { background-color: var(--color-bg-base); font-family: 'IBM Plex Sans Arabic', sans-serif; }
      `}</style>
    </div>
  );
};

export default LoginPage;
