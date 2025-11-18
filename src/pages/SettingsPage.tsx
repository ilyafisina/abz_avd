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
      setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>⚙️ Настройки системы</h1>
        <p>Конфигурация и параметры приложения</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: '0 0 200px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                style={{
                  padding: '12px',
                  border: activeTab === tab.id ? '2px solid #1976d2' : '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: activeTab === tab.id ? '#e3f2fd' : '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
          {activeTab === 'general' && (
            <div>
              <h2>🔧 Общие настройки</h2>
              <div className="form-group" style={{ marginTop: '16px' }}>
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
              <h2>📦 Настройки склада</h2>
              <div className="form-group" style={{ marginTop: '16px' }}>
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
                <p style={{ color: '#666', fontSize: '14px' }}>
                  📝 <strong>Информация:</strong> Здесь вы можете настроить параметры управления товарами и запасами на складе.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2>🔔 Уведомления</h2>
              <div className="form-group" style={{ marginTop: '16px' }}>
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
                <p style={{ color: '#666', fontSize: '14px' }}>
                  💡 <strong>Совет:</strong> Включите уведомления, чтобы получать важную информацию о товарах и заявках.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div>
              <h2>🎨 Внешний вид</h2>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Тема оформления</label>
                <select value={settings.theme} onChange={(e) => handleChange('theme', e.target.value)}>
                  <option value="light">☀️ Светлая</option>
                  <option value="dark">🌙 Тёмная</option>
                  <option value="auto">🔄 Автоматическая</option>
                </select>
              </div>
              <div className="form-group">
                <p style={{ color: '#666', fontSize: '14px' }}>
                  🎯 <strong>Текущее значение:</strong> {settings.theme === 'light' ? 'Светлая тема' : settings.theme === 'dark' ? 'Тёмная тема' : 'Автоматическая тема'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div>
              <h2>💾 Резервные копии</h2>
              <div className="form-group" style={{ marginTop: '16px' }}>
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
              <div className="form-group" style={{ marginTop: '20px' }}>
                <button className="btn-primary" style={{ width: '100%' }}>
                  💾 Создать резервную копию сейчас
                </button>
              </div>
              <div className="form-group">
                <p style={{ color: '#666', fontSize: '14px' }}>
                  📌 <strong>Последняя резервная копия:</strong> 2024-01-20 14:30:45
                </p>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div>
              <h2>🔌 API Интеграции</h2>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>API Ключ</label>
                <input
                  type="password"
                  value="sk_live_51234567890abcdefghijk"
                  readOnly
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>
              <div className="form-group">
                <button className="btn-primary">🔄 Генерировать новый ключ</button>
              </div>
              <div className="form-group" style={{ marginTop: '20px' }}>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  📖 <strong>Документация:</strong> <a href="#" style={{ color: '#1976d2' }}>Прочитать API документацию</a>
                </p>
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleSave}>
              💾 Сохранить
            </button>
            {saved && (
              <span style={{ color: '#4caf50', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                ✓ Сохранено успешно
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
