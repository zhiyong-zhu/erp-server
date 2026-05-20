import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '@erp/shared';
import MainLayout from './layouts/MainLayout';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Sales = lazy(() => import('./pages/Sales'));
const Purchase = lazy(() => import('./pages/Purchase'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        }
      >
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
          />

          {/* Protected routes */}
          <Route element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/purchase" element={<Purchase />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
