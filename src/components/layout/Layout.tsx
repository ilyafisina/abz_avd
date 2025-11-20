import React from 'react';
import { useAuth } from '../../contexts/useAuth';
import { useNavigate } from 'react-router-dom';
import './Layout.css';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(window.innerWidth >= 768);

  React.useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      // Закрыть sidebar на мобильных, открыть на десктопе
      setSidebarOpen(!isMobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Открыть/закрыть меню"
            >
              ☰
            </button>
            <h2>АБЗ ВАД</h2>
          </div>

          <div className="navbar-user">
            <span className="user-info">
              {user?.firstName} {user?.lastName}
              <small>{getRoleLabel(user?.role || '')}</small>
            </span>
            <button className="btn-logout" onClick={handleLogout} title="Выход">
              🚪
            </button>
          </div>
        </div>
      </nav>

      {sidebarOpen && window.innerWidth < 768 && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="layout-container">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-content">
            <nav className="sidebar-nav">
              <div className="nav-section">
                <h3>Главное</h3>
                <a href="/dashboard" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                  📊 Панель управления
                </a>
              </div>

              {(user?.role === 'warehouseman' || user?.role === 'manager') && (
                <div className="nav-section">
                  <h3>Товары</h3>
                  <a href="/products" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    📦 Товары
                  </a>
                  <a href="/requests" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    📋 Заявки
                  </a>
                </div>
              )}

              {(user?.role === 'manager' || user?.role === 'admin') && (
                <div className="nav-section">
                  <h3>Управление</h3>
                  <a href="/locations" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    📍 Местоположения
                  </a>
                  <a href="/reports" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    📈 Отчёты
                  </a>
                </div>
              )}

              {user?.role === 'admin' && (
                <div className="nav-section">
                  <h3>Администрация</h3>
                  <a href="/users" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    👥 Пользователи
                  </a>
                  <a href="/logs" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    📜 Логи системы
                  </a>
                  <a href="/settings" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    ⚙️ Настройки
                  </a>
                </div>
              )}

              <div className="nav-section">
                <h3>Профиль</h3>
                <a href="/profile" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                  👤 Мой профиль
                </a>
                <a href="/help" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                  ❓ Помощь
                </a>
              </div>
            </nav>
          </div>

          <div className="sidebar-footer">
            <p className="version">v1.0.0</p>
          </div>
        </aside>

        <main className="main-content">{children}</main>
      </div>
    </div>
  );
};

function getRoleLabel(role: string): string {
  const roles: Record<string, string> = {
    warehouseman: 'Складовщик',
    manager: 'Менеджер',
    admin: 'Администратор',
  };
  return roles[role] || role;
}
