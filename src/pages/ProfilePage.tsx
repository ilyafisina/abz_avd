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

  const getRoleLabel = (role?: string): string => {
    switch(role) {
      case 'admin': return 'Администратор';
      case 'manager': return 'Менеджер';
      case 'warehouseman': return 'Складовщик';
      default: return 'Пользователь';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Профиль</h1>
        <p>Управление личной информацией и параметрами учётной записи</p>
      </div>

      <div className="two-col-grid">
        <div className="card-plain">
          <div className="profile-header">
            <div className={`avatar role-${user?.role || 'default'}`}>
              {getInitials(user)}
            </div>
            <div>
              <h2 className="no-margin">{user?.username}</h2>
              <span className={`role-badge role-${user?.role || 'default'}`}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
          </div>

          <div className="profile-meta">
            <div>
              <p className="muted-small">Email</p>
              <p className="bold">{user?.email}</p>
            </div>
            <div>
              <p className="muted-small">Дата создания</p>
              <p className="bold">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—'}</p>
            </div>
            <div>
              <p className="muted-small">Статус</p>
              <p className={`bold status-text ${user?.isActive ? 'active' : 'inactive'}`}>
                {user?.isActive ? 'Активен' : 'Неактивен'}
              </p>
            </div>
          </div>

          {user?.role === 'warehouseman' && (
            <div className="mt-16 card-plain card-soft">
              <p className="muted-small">Зона склада</p>
              <p className="bold">{profileData.warehouseArea}</p>
            </div>
          )}
        </div>

        <div className="card-plain">
          <h3 className="no-margin">Статистика</h3>
          <div className="flex-col-gap">
            <div className="stat-card info">
              <p className="muted-small muted-info">Последнее посещение</p>
              <p className="no-margin">Сегодня в 14:32</p>
            </div>
            <div className="stat-card purple">
              <p className="muted-small muted-purple">Привилегии</p>
              <p className="small-text">
                {user?.role === 'admin' ? 'Полный доступ' : 
                 user?.role === 'manager' ? 'Управление' :
                 'Просмотр и операции'}
              </p>
            </div>
          </div>
        </div>
      </div>

        <div className="card-plain glass glass-lg glass-hover">
        <div className="justify-space">
          <h3 className="no-margin">Контактные данные</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-primary"
          >
            {isEditing ? 'Отмена' : 'Редактировать'}
          </button>
        </div>

        {!isEditing ? (
          <div className="grid-2">
            <div>
              <p className="muted-small">Имя</p>
              <p className="bold">{profileData.firstName || '—'}</p>
            </div>
            <div>
              <p className="muted-small">Фамилия</p>
              <p className="bold">{profileData.lastName || '—'}</p>
            </div>
            <div>
              <p className="muted-small">Телефон</p>
              <p className="bold">{profileData.phone}</p>
            </div>
            <div>
              <p className="muted-small">Telegram</p>
              <p className="bold">{profileData.telegram}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="grid-2">
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
            <div className="grid-full">
              <button type="submit" className="btn-primary">Сохранить</button>
            </div>
          </form>
        )}
      </div>

      <div className="profile-actions">
        <button className="btn-primary">Изменить пароль</button>
        <button className="btn-danger" onClick={logout}>Выход</button>
      </div>
    </div>
  );
};

function getInitials(user: any) {
  if (!user) return '';
  const first = user.firstName || '';
  const last = user.lastName || '';
  const a = first.trim().charAt(0) || '';
  const b = last.trim().charAt(0) || '';
  const initials = (a + b).toUpperCase();
  return initials || (user.username ? user.username.slice(0,2).toUpperCase() : '');
}
