import { useState } from 'react';
import './Pages.css';

export const SettingsPage = () => {
  const [settings, setSettings] = useState({
    warehouseName: 'АБЗ ВАД',
    location: 'г. Москва',
    timezone: 'UTC+3',
    dateFormat: 'DD.MM.YYYY',
    currency: 'RUB',
    language: 'ru',
    theme: 'light',
    notifications: true,
    emailNotifications: true,
    lowStockAlert: 50,
    autoBackup: true,
    backupInterval: 'daily',
  });

  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);

  const handleChange = (key: string, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    // Имитация сохранения
    setTimeout(() => {
      setSaved(true);
      // Apply theme selection immediately
      try {
        if (settings.theme === 'auto') {
          localStorage.setItem('appTheme', 'auto');
          // apply system preference
          const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) document.documentElement.classList.add('theme-dark'); else document.documentElement.classList.remove('theme-dark');
        } else {
          localStorage.setItem('appTheme', settings.theme as string);
          if (settings.theme === 'dark') document.documentElement.classList.add('theme-dark'); else document.documentElement.classList.remove('theme-dark');
        }
      } catch {
        // ignore storage errors
      }
      setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>⚙️ Настройки системы</h1>
        <p>Конфигурация и параметры приложения</p>
      </div>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          {[
            { id: 'general', label: '🔧 Общие' },
            { id: 'warehouse', label: '📦 Склад' },
            { id: 'notifications', label: '🔔 Уведомления' },
            { id: 'appearance', label: '🎨 Внешний вид' },
            { id: 'backup', label: '💾 Резервные копии' },
            { id: 'api', label: '🔌 API' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <div className="settings-content form-card">
          {activeTab === 'general' && (
            <div>
              <h2 className="settings-section-title">🔧 Общие настройки</h2>
              <div className="form-group mt-16">
                <label>Название склада</label>
                <input
                  type="text"
                  value={settings.warehouseName}
                  onChange={(e) => handleChange('warehouseName', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Место расположения</label>
                <input
                  type="text"
                  value={settings.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Часовой пояс</label>
                <select value={settings.timezone} onChange={(e) => handleChange('timezone', e.target.value)}>
                  <option value="UTC+0">UTC+0 (GMT)</option>
                  <option value="UTC+1">UTC+1</option>
                  <option value="UTC+2">UTC+2</option>
                  <option value="UTC+3">UTC+3 (Москва)</option>
                  <option value="UTC+4">UTC+4</option>
                  <option value="UTC+5">UTC+5</option>
                  <option value="UTC+6">UTC+6</option>
                  <option value="UTC+7">UTC+7</option>
                  <option value="UTC+8">UTC+8</option>
                  <option value="UTC+9">UTC+9</option>
                </select>
              </div>
              <div className="form-group">
                <label>Формат даты</label>
                <select value={settings.dateFormat} onChange={(e) => handleChange('dateFormat', e.target.value)}>
                  <option value="DD.MM.YYYY">ДД.МММ.ГГГГ</option>
                  <option value="DD/MM/YYYY">ДД/МММ/ГГГГ</option>
                  <option value="YYYY-MM-DD">ГГГГ-МММ-ДД</option>
                </select>
              </div>
              <div className="form-group">
                <label>Валюта</label>
                <select value={settings.currency} onChange={(e) => handleChange('currency', e.target.value)}>
                  <option value="RUB">RUB (₽) - Российский рубль</option>
                  <option value="USD">USD ($) - Доллар США</option>
                  <option value="EUR">EUR (€) - Евро</option>
                </select>
              </div>
              <div className="form-group">
                <label>Язык интерфейса</label>
                <select value={settings.language} onChange={(e) => handleChange('language', e.target.value)}>
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'warehouse' && (
            <div>
              <h2 className="settings-section-title">📦 Настройки склада</h2>
              <div className="form-group mt-16">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.lowStockAlert > 0}
                    onChange={(e) => handleChange('lowStockAlert', e.target.checked ? 50 : 0)}
                  />
                  Уведомлять о низком запасе
                </label>
              </div>
              {settings.lowStockAlert > 0 && (
                <div className="form-group">
                  <label>Минимальное количество товара для уведомления</label>
                  <input
                    type="number"
                    value={settings.lowStockAlert}
                    onChange={(e) => handleChange('lowStockAlert', parseInt(e.target.value))}
                  />
                </div>
              )}
              <div className="form-group">
                <p className="muted">
                  📝 <strong>Информация:</strong> Здесь вы можете настроить параметры управления товарами и запасами на складе.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 className="settings-section-title">🔔 Уведомления</h2>
              <div className="form-group mt-16">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => handleChange('notifications', e.target.checked)}
                  />
                  Включить уведомления
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                  />
                  Отправлять на email
                </label>
              </div>
              <div className="form-group">
                <p className="muted">
                  💡 <strong>Совет:</strong> Включите уведомления, чтобы получать важную информацию о товарах и заявках.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div>
              <h2 className="settings-section-title">🎨 Внешний вид</h2>
              <div className="form-group mt-16">
                <label>Тема оформления</label>
                <select value={settings.theme} onChange={(e) => handleChange('theme', e.target.value)}>
                  <option value="light">☀️ Светлая</option>
                  <option value="dark">🌙 Тёмная</option>
                  <option value="auto">🔄 Автоматическая</option>
                </select>
              </div>
              <div className="form-group">
                <p className="muted">
                  🎯 <strong>Текущее значение:</strong> {settings.theme === 'light' ? 'Светлая тема' : settings.theme === 'dark' ? 'Тёмная тема' : 'Автоматическая тема'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div>
              <h2 className="settings-section-title">💾 Резервные копии</h2>
              <div className="form-group mt-16">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.autoBackup}
                    onChange={(e) => handleChange('autoBackup', e.target.checked)}
                  />
                  Автоматические резервные копии
                </label>
              </div>
              {settings.autoBackup && (
                <div className="form-group">
                  <label>Интервал резервного копирования</label>
                  <select value={settings.backupInterval} onChange={(e) => handleChange('backupInterval', e.target.value)}>
                    <option value="hourly">Каждый час</option>
                    <option value="daily">Ежедневно</option>
                    <option value="weekly">Еженедельно</option>
                    <option value="monthly">Ежемесячно</option>
                  </select>
                </div>
              )}
              <div className="form-group mt-20">
                <button className="btn-primary full-width">
                  💾 Создать резервную копию сейчас
                </button>
              </div>
              <div className="form-group">
                <p className="muted">
                  📌 <strong>Последняя резервная копия:</strong> 2024-01-20 14:30:45
                </p>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div>
              <h2 className="settings-section-title">🔌 API Интеграции</h2>
              <div className="form-group mt-16">
                <label>API Ключ</label>
                <input
                  type="password"
                  value="sk_live_51234567890abcdefghijk"
                  readOnly
                  className="monospace"
                />
              </div>
              <div className="form-group">
                <button className="btn-primary">🔄 Генерировать новый ключ</button>
              </div>
              <div className="form-group mt-20">
                <p className="muted">
                  📖 <strong>Документация:</strong> <a href="#" className="link-accent">Прочитать API документацию</a>
                </p>
              </div>
            </div>
          )}

          <div className="actions-row">
            <button className="btn-primary" onClick={handleSave}>
              💾 Сохранить
            </button>
            {saved && (
              <span className="saved-badge">✓ Сохранено успешно</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
