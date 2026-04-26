import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/Login'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const SalesPage = lazy(() => import('./pages/Sales'));
const StockPage = lazy(() => import('./pages/Stock'));
const CustomersPage = lazy(() => import('./pages/Customers'));
const SuppliersPage = lazy(() => import('./pages/Suppliers'));
const ReportsPage = lazy(() => import('./pages/Reports'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const AuditLogPage = lazy(() => import('./pages/AuditLog'));
const ProductsPage = lazy(() => import('./pages/Products'));
const PurchasesPage = lazy(() => import('./pages/Purchases'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="stock" element={<StockPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="logs" element={<AuditLogPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="purchases" element={<PurchasesPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
