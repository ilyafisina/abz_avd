import { useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import './Pages.css';

export const SettingsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const [settings, setSettings] = useState({
    theme: 'light',
    notifications: true,
    emailNotifications: true,
    language: 'ru',
    timezone: 'UTC+3',
    dateFormat: 'DD.MM.YYYY',
    currency: 'RUB',
    warehouseName: 'АБЗ ВАД',
    location: 'г. Москва',
    lowStockAlert: 50,
    autoBackup: true,
    backupInterval: 'daily',
  });

  const [activeTab, setActiveTab] = useState('appearance');
  const [saved, setSaved] = useState(false);

  const handleChange = (key: string, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setTimeout(() => {
      setSaved(true);
      try {
        if (settings.theme === 'auto') {
          localStorage.setItem('appTheme', 'auto');
          const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) document.documentElement.classList.add('theme-dark'); 
          else document.documentElement.classList.remove('theme-dark');
        } else {
          localStorage.setItem('appTheme', settings.theme as string);
          if (settings.theme === 'dark') document.documentElement.classList.add('theme-dark'); 
          else document.documentElement.classList.remove('theme-dark');
        }
      } catch {
        // ignore
      }
      setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  const getTabs = () => {
    const commonTabs = [
      { id: 'appearance', label: 'Внешний вид' },
      { id: 'notifications', label: 'Уведомления' },
    ];
    
    if (isAdmin) {
      return [...commonTabs, { id: 'regional', label: 'Региональные' }, { id: 'warehouse', label: 'Склад' }, { id: 'backup', label: 'Резервные копии' }, { id: 'system', label: 'Система' }];
    }
    
    if (isManager) {
      return [...commonTabs, { id: 'regional', label: 'Региональные' }];
    }
    
    return commonTabs;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Настройки</h1>
        <p>Настройте параметры приложения</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', marginTop: '32px' }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {getTabs().map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                backgroundColor: activeTab === tab.id ? 'var(--primary-blue)' : 'var(--surface-secondary)',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-primary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {activeTab === 'appearance' && (
            <div style={{ backgroundColor: 'var(--surface-primary)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-primary)' }}>
              <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', fontWeight: '600' }}>Внешний вид</h2>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Тема</label>
                  <select value={settings.theme} onChange={(e) => handleChange('theme', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)' }}>
                    <option value="light">☀️ Светлая</option>
                    <option value="dark">🌙 Тёмная</option>
                    <option value="auto">🔄 Автоматическая</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Язык</label>
                  <select value={settings.language} onChange={(e) => handleChange('language', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)' }}>
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div style={{ backgroundColor: 'var(--surface-primary)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-primary)' }}>
              <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', fontWeight: '600' }}>Уведомления</h2>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--surface-secondary)', borderRadius: '8px' }}>
                  <input type="checkbox" checked={settings.notifications} onChange={(e) => handleChange('notifications', e.target.checked)} style={{ width: '20px', height: '20px' }} />
                  <label style={{ cursor: 'pointer', fontSize: '14px', margin: 0, flex: 1 }}>Внутренние уведомления</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--surface-secondary)', borderRadius: '8px' }}>
                  <input type="checkbox" checked={settings.emailNotifications} onChange={(e) => handleChange('emailNotifications', e.target.checked)} style={{ width: '20px', height: '20px' }} />
                  <label style={{ cursor: 'pointer', fontSize: '14px', margin: 0, flex: 1 }}>Email уведомления</label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'regional' && (isManager || isAdmin) && (
            <div style={{ backgroundColor: 'var(--surface-primary)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-primary)' }}>
              <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', fontWeight: '600' }}>Региональные</h2>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Часовой пояс</label>
                  <select value={settings.timezone} onChange={(e) => handleChange('timezone', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)' }}>
                    <option value="UTC+0">UTC+0</option>
                    <option value="UTC+3">UTC+3 (Москва)</option>
                    <option value="UTC+5">UTC+5</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Формат даты</label>
                  <select value={settings.dateFormat} onChange={(e) => handleChange('dateFormat', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)' }}>
                    <option value="DD.MM.YYYY">ДД.МММ.ГГГГ</option>
                    <option value="DD/MM/YYYY">ДД/МММ/ГГГГ</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Валюта</label>
                  <select value={settings.currency} onChange={(e) => handleChange('currency', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)' }}>
                    <option value="RUB">RUB (₽)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'warehouse' && isAdmin && (
            <div style={{ backgroundColor: 'var(--surface-primary)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-primary)' }}>
              <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', fontWeight: '600' }}>Склад</h2>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Название</label>
                  <input type="text" value={settings.warehouseName} onChange={(e) => handleChange('warehouseName', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Локация</label>
                  <input type="text" value={settings.location} onChange={(e) => handleChange('location', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--surface-secondary)', borderRadius: '8px' }}>
                  <input type="checkbox" checked={settings.lowStockAlert > 0} onChange={(e) => handleChange('lowStockAlert', e.target.checked ? 50 : 0)} style={{ width: '20px', height: '20px' }} />
                  <label style={{ cursor: 'pointer', fontSize: '14px', margin: 0, flex: 1 }}>Уведомлять о низком запасе</label>
                </div>
                {settings.lowStockAlert > 0 && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Минимальное кол-во</label>
                    <input type="number" value={settings.lowStockAlert} onChange={(e) => handleChange('lowStockAlert', parseInt(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'backup' && isAdmin && (
            <div style={{ backgroundColor: 'var(--surface-primary)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-primary)' }}>
              <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', fontWeight: '600' }}>Резервные копии</h2>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--surface-secondary)', borderRadius: '8px' }}>
                  <input type="checkbox" checked={settings.autoBackup} onChange={(e) => handleChange('autoBackup', e.target.checked)} style={{ width: '20px', height: '20px' }} />
                  <label style={{ cursor: 'pointer', fontSize: '14px', margin: 0, flex: 1 }}>Автоматические копии</label>
                </div>
                {settings.autoBackup && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Интервал</label>
                    <select value={settings.backupInterval} onChange={(e) => handleChange('backupInterval', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)' }}>
                      <option value="hourly">Каждый час</option>
                      <option value="daily">Ежедневно</option>
                      <option value="weekly">Еженедельно</option>
                    </select>
                  </div>
                )}
                <button style={{ padding: '12px 16px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--primary-blue)', color: '#ffffff', fontWeight: '500', cursor: 'pointer' }}>Создать копию сейчас</button>
              </div>
            </div>
          )}

          {activeTab === 'system' && isAdmin && (
            <div style={{ backgroundColor: 'var(--surface-primary)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-primary)' }}>
              <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', fontWeight: '600' }}>Система</h2>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--surface-secondary)', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Версия</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>1.0.0</p>
                </div>
                <button style={{ padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)', fontWeight: '500', cursor: 'pointer' }}>Проверить обновления</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
            <button onClick={handleSave} style={{ padding: '12px 24px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--primary-blue)', color: '#ffffff', fontWeight: '500', cursor: 'pointer' }}>Сохранить</button>
            {saved && <span style={{ fontSize: '14px', color: 'var(--color-success)', fontWeight: '500' }}>✓ Сохранено</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
