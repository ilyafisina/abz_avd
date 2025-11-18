import { useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import './Pages.css';

export const ProfilePage = () => {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '+7 (999) 123-45-67',
    telegram: '@example_user',
    warehouseArea: (user as any)?.warehouseArea || 'Зона A',
  });

  const handleSave = () => {
    // Имитация сохранения
    setIsEditing(false);
  };

  const getRoleBadgeColor = (role?: string): string => {
    switch(role) {
      case 'admin': return '#d32f2f';
      case 'manager': return '#1976d2';
      case 'warehouseman': return '#f57c00';
      default: return '#757575';
    }
  };

  const getRoleLabel = (role?: string): string => {
    switch(role) {
      case 'admin': return '🔐 Администратор';
      case 'manager': return '👔 Менеджер';
      case 'warehouseman': return '📦 Складовщик';
      default: return 'Пользователь';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>👤 Профиль пользователя</h1>
        <p>Управление личной информацией и параметрами учётной записи</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: getRoleBadgeColor(user?.role),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              color: 'white'
            }}>
              👤
            </div>
            <div>
              <h2 style={{ margin: '0 0 8px 0' }}>{user?.username}</h2>
              <span style={{
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: '20px',
                backgroundColor: getRoleBadgeColor(user?.role),
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px' }}>Email</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{user?.email}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px' }}>Дата создания</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—'}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px' }}>Статус</p>
              <p style={{ margin: 0, fontWeight: 'bold', color: user?.isActive ? '#4caf50' : '#ff9800' }}>
                {user?.isActive ? '✓ Активен' : '✗ Неактивен'}
              </p>
            </div>
          </div>

          {user?.role === 'warehouseman' && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px' }}>Зона склада</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{profileData.warehouseArea}</p>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
          <h3 style={{ marginTop: 0 }}>📊 Статистика</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 4px 0', color: '#1976d2', fontSize: '12px', fontWeight: 'bold' }}>Последнее посещение</p>
              <p style={{ margin: 0 }}>Сегодня в 14:32</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f3e5f5', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 4px 0', color: '#7b1fa2', fontSize: '12px', fontWeight: 'bold' }}>Привилегии</p>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {user?.role === 'admin' ? '🔐 Полный доступ' : 
                 user?.role === 'manager' ? '👔 Управление' :
                 '📦 Просмотр и операции'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>📋 Контактные данные</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-primary"
          >
            {isEditing ? '✕ Отмена' : '✏️ Редактировать'}
          </button>
        </div>

        {!isEditing ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px' }}>Имя</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{profileData.firstName || '—'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px' }}>Фамилия</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{profileData.lastName || '—'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px' }}>Телефон</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{profileData.phone}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px' }}>Telegram</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{profileData.telegram}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Имя</label>
              <input
                type="text"
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Фамилия</label>
              <input
                type="text"
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Телефон</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Telegram</label>
              <input
                type="text"
                value={profileData.telegram}
                onChange={(e) => setProfileData({ ...profileData, telegram: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn-primary">💾 Сохранить</button>
            </div>
          </form>
        )}
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
        <button className="btn-primary">🔐 Изменить пароль</button>
        <button className="btn-danger" onClick={logout}>🚪 Выход</button>
      </div>
    </div>
  );
};
