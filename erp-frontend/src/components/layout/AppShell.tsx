import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Truck, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Box,
  History,
  ShoppingBag
} from 'lucide-react';
import { authApi } from '../../lib/api';
import type { CurrentUser } from '../../types';

const AppShell: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await authApi.getCurrentUser();
        setCurrentUser(res.data);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'لوحة التحكم', path: '/' },
    { icon: <ShoppingCart size={20} />, label: 'المبيعات', path: '/sales' },
    { icon: <ShoppingBag size={20} />, label: 'المشتريات', path: '/purchases' },
    { icon: <Box size={20} />, label: 'المنتجات', path: '/products' },
    { icon: <Package size={20} />, label: 'المخزون', path: '/stock' },
    { icon: <Users size={20} />, label: 'العملاء', path: '/customers' },
    { icon: <Truck size={20} />, label: 'الموردين', path: '/suppliers' },
    { icon: <BarChart3 size={20} />, label: 'التقارير', path: '/reports' },
    { icon: <History size={20} />, label: 'سجل الأحداث', path: '/logs' },
    { icon: <Settings size={20} />, label: 'الإعدادات', path: '/settings' },
  ];

  return (
    <div className={`app-shell ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[350] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">نظام ERP المتطور</div>
          <div className="sidebar-logo-sub">مواد البناء والتشييد</div>
        </div>

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setIsSidebarOpen(false)}
            >
              <span className="flex items-center gap-3">
                {item.icon}
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="nav-item w-full text-danger hover:bg-danger/10"
          >
            <span className="flex items-center gap-3">
              <LogOut size={20} />
              تسجيل الخروج
            </span>
          </button>
        </div>
      </aside>

      {/* Topbar */}
      <header className="app-topbar px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            className="md:hidden p-2 text-secondary hover:text-primary"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h2 className="text-lg font-display hidden md:block">لوحة التحكم الرئيسية</h2>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-secondary hover:text-primary relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
          </button>
          
          <div className="flex items-center gap-3 pr-4 border-r border-white/10">
            {isLoading ? (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="text-left">
                  <div className="h-4 w-24 bg-white/10 rounded mb-1" />
                  <div className="h-3 w-16 bg-white/5 rounded" />
                </div>
                <div className="w-9 h-9 rounded-full bg-white/10" />
              </div>
            ) : (
              <>
                <div className="text-left text-primary">
                  <div className="text-sm font-semibold">{currentUser?.name || '...'}</div>
                  <div className="text-xs text-muted">المركز الرئيسي</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center text-inverse font-bold">
                  {currentUser?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
                </div>
              </>
            )}
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="app-content">
        <Outlet />
      </main>

      <style>{`
        .app-shell {
          display: grid;
          grid-template-columns: 240px 1fr;
          grid-template-rows: 64px 1fr;
          grid-template-areas:
            "sidebar topbar"
            "sidebar content";
          height: 100vh;
          overflow: hidden;
          background: var(--color-bg-base);
          direction: rtl;
        }

        .app-sidebar {
          grid-area: sidebar;
          background: var(--color-sidebar-bg);
          border-left: 1px solid var(--color-border-default);
          display: flex;
          flex-direction: column;
          z-index: var(--z-sidebar);
          transition: transform 0.3s ease;
        }

        .app-topbar {
          grid-area: topbar;
          background: var(--color-bg-surface);
          border-bottom: 1px solid var(--color-border-default);
          z-index: var(--z-topbar);
        }

        .app-content {
          grid-area: content;
          overflow-y: auto;
          padding: var(--space-6);
        }

        .sidebar-logo {
          padding: var(--space-6) var(--space-5);
          margin-bottom: var(--space-4);
          border-bottom: 1px solid var(--color-border-default);
        }

        .sidebar-logo-mark {
          font-family: var(--font-display);
          font-size: var(--text-md);
          font-weight: 800;
          color: var(--color-brand-primary);
        }

        .sidebar-logo-sub {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          margin-top: 4px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: var(--space-3) var(--space-4);
          margin: 2px var(--space-2);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: all 0.2s ease;
          font-size: var(--text-sm);
          font-weight: 500;
          border: none;
          background: transparent;
        }

        .nav-item:hover {
          background: var(--color-sidebar-item-hover);
          color: var(--color-text-primary);
        }

        .nav-item.active {
          background: var(--color-sidebar-item-active);
          color: var(--color-brand-primary);
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .app-shell {
            grid-template-columns: 1fr;
            grid-template-areas:
              "topbar"
              "content";
          }
          .app-sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            right: 0;
            width: 240px;
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default AppShell;
