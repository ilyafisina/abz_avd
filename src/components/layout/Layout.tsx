import React from 'react';
import { useAuth } from '../../contexts/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  FiMenu,
  FiLogOut,
  FiBarChart2,
  FiBox,
  FiClipboard,
  FiMapPin,
  FiTrendingUp,
  FiUsers,
  FiList,
  FiSettings,
  FiUser,
  FiHelpCircle,
  FiSun,
  FiMoon,
} from 'react-icons/fi';
import './Layout.css';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(window.innerWidth >= 768);
  const [theme, setTheme] = React.useState<'light' | 'dark' | 'auto'>(() => {
    try {
      const t = localStorage.getItem('appTheme');
      return (t === 'dark' || t === 'light' || t === 'auto') ? (t as 'light' | 'dark' | 'auto') : 'light';
    } catch {
      return 'light';
    }
  });

  React.useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      // Закрыть sidebar на мобильных, открыть на десктопе
      setSidebarOpen(!isMobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply theme class on mount / theme change
  React.useEffect(() => {
    let mq: MediaQueryList | null = null;
    try {
      const apply = (useDark: boolean) => {
        if (useDark) document.documentElement.classList.add('theme-dark'); else document.documentElement.classList.remove('theme-dark');
      };

      if (theme === 'auto') {
        mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
        apply(mq ? mq.matches : false);
        // save preference marker
        localStorage.setItem('appTheme', 'auto');
      } else {
        apply(theme === 'dark');
        localStorage.setItem('appTheme', theme);
      }
    } catch {
      // ignore
    }
  }, [theme]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="layout">
      <nav className="navbar glass">
        <div className="navbar-container">
          <div className="navbar-brand">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Открыть/закрыть меню"
            >
              <FiMenu size={24} />
            </button>
            <h2>АБЗ ВАД</h2>
          </div>

          <div className="navbar-user">
            <span className="user-info">
              {user?.firstName} {user?.lastName}
              <small>{getRoleLabel(user?.role || '')}</small>
            </span>
            <div className="actions">
              <button
                className="btn-theme-toggle"
                onClick={() => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))}
                title={theme === 'light' ? 'Включить тёмную тему' : 'Отключить тёмную тему'}
                aria-label="toggle-theme"
              >
                {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
              </button>

              <button className="btn-logout" onClick={handleLogout} title="Выход">
                <FiLogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {sidebarOpen && window.innerWidth < 768 && (
        <div className="sidebar-backdrop visible" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="layout-container">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''} glass`}>
          <div className="sidebar-content">
            <nav className="sidebar-nav">
              <div className="nav-section">
                <h3>Главное</h3>
                <a href="/dashboard" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                  <FiBarChart2 />
                  <span>Панель управления</span>
                </a>
              </div>

              {(user?.role === 'warehouseman' || user?.role === 'manager') && (
                <div className="nav-section">
                  <h3>Товары</h3>
                  <a href="/products" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <FiBox />
                    <span>Товары</span>
                  </a>
                  <a href="/requests" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <FiClipboard />
                    <span>Заявки</span>
                  </a>
                </div>
              )}

              {(user?.role === 'manager' || user?.role === 'admin') && (
                <div className="nav-section">
                  <h3>Управление</h3>
                  <a href="/locations" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <FiMapPin />
                    <span>Местоположения</span>
                  </a>
                  <a href="/reports" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <FiTrendingUp />
                    <span>Отчёты</span>
                  </a>
                </div>
              )}

              {user?.role === 'admin' && (
                <div className="nav-section">
                  <h3>Администрация</h3>
                  <a href="/users" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <FiUsers />
                    <span>Пользователи</span>
                  </a>
                  <a href="/logs" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <FiList />
                    <span>Логи системы</span>
                  </a>
                </div>
              )}

              <div className="nav-section">
                <h3>Профиль</h3>
                <a href="/profile" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                  <FiUser />
                  <span>Мой профиль</span>
                </a>
                <a href="/settings" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                  <FiSettings />
                  <span>Настройки</span>
                </a>
                <a href="/help" className="nav-link" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                  <FiHelpCircle />
                  <span>Помощь</span>
                </a>
              </div>
            </nav>
          </div>

          <div className="sidebar-footer">
            <p className="version">v1.0.0</p>
          </div>
        </aside>

        <main className="main-content"><div className="glass-wrap">{children}</div></main>
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
