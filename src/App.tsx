import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { Layout } from './components/layout/Layout';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { WarehousemanDashboard } from './components/warehouseman/WarehousemanDashboard';
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProductsPage } from './pages/ProductsPage';
import { RequestsPage } from './pages/RequestsPage';
import { LocationsPage } from './pages/LocationsPage';
import './App.css';

const DashboardRouter = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <Routes>
        <Route
          path="/dashboard"
          element={
            user?.role === 'warehouseman' ? (
              <WarehousemanDashboard />
            ) : user?.role === 'manager' ? (
              <ManagerDashboard />
            ) : user?.role === 'admin' ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/locations" element={<LocationsPage />} />
        <Route path="/reports" element={<div>Страница отчётов (в разработке)</div>} />
        <Route path="/users" element={<div>Страница пользователей (в разработке)</div>} />
        <Route path="/logs" element={<div>Страница логов (в разработке)</div>} />
        <Route path="/settings" element={<div>Страница настроек (в разработке)</div>} />
        <Route path="/profile" element={<div>Страница профиля (в разработке)</div>} />
        <Route path="/help" element={<div>Страница помощи (в разработке)</div>} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
