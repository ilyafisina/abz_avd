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
import { PrintProductsPage } from './pages/PrintProductsPage';
import { RequestsPage } from './pages/RequestsPage';
import { LocationsPage } from './pages/LocationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { HelpPage } from './pages/HelpPage';
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
        <Route path="/print-products" element={<PrintProductsPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/locations" element={<LocationsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/help" element={<HelpPage />} />
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
