import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { useNotification } from '../contexts/useNotification';
import { apiService } from '../services/apiService';
import './Pages.css';

export const ProfilePage = () => {
  const { user, logout, refreshUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSeenTime, setLastSeenTime] = useState<string>('');
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // Загружаем свежие данные пользователя при открытии профиля
  useEffect(() => {
    if (user?.id) {
      refreshUser();
    }
  }, []); // Только при монтировании компонента

  // Синхронизируем profileData когда меняется user
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user?.id, user?.firstName, user?.lastName, user?.email, user?.phone]);

  useEffect(() => {
    // Обновляем время последнего посещения
    if (user?.id) {
      updateLastSeen();
      const interval = setInterval(updateLastSeen, 5 * 60 * 1000); // каждые 5 минут
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  useEffect(() => {
    // Обновляем отображение времени каждую минуту
    if (user?.lastSeenAt) {
      updateTimeDisplay();
      const interval = setInterval(updateTimeDisplay, 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.lastSeenAt]);

  const updateLastSeen = async () => {
    if (user?.id) {
      try {
        await apiService.updateLastSeen(user.id);
        // Обновляем данные пользователя в AuthContext после обновления времени
        await refreshUser();
      } catch (error) {
        console.error('Ошибка при обновлении времени посещения:', error);
      }
    }
  };

  const updateTimeDisplay = () => {
    if (user?.lastSeenAt) {
      const now = new Date();
      const lastSeen = new Date(user.lastSeenAt);
      const diff = now.getTime() - lastSeen.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);

      if (minutes < 1) {
        setLastSeenTime('сейчас');
      } else if (minutes < 60) {
        setLastSeenTime(`${minutes} мин назад`);
      } else if (hours < 24) {
        setLastSeenTime(`${hours} ч назад`);
      } else {
        setLastSeenTime(new Date(user.lastSeenAt).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        }));
      }
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const updateData = {
        id: parseInt(user.id),
        username: user.username,
        email: profileData.email,
        phone: profileData.phone,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        role: user.role,
        warehouseId: user.warehouseId || null,
        isActive: true,
        passwordHash: '', // Пустая строка значит не менять пароль
      };

      const updated = await apiService.updateUser(user.id, updateData as any);
      if (updated) {
        setProfileData({
          firstName: updated.firstName || '',
          lastName: updated.lastName || '',
          email: updated.email || '',
          phone: updated.phone || '',
        });
        showSuccess('Данные профиля обновлены!');
        setIsEditing(false);
        // Обновляем пользователя в AuthContext
        await refreshUser();
      } else {
        showError('Ошибка при обновлении профиля');
      }
    } catch (error: any) {
      console.error('Ошибка при сохранении профиля:', error);
      const errorMessage = error?.response?.data?.error || 'Не удалось обновить профиль';
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
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
              <p className="muted-small">Телефон</p>
              <p className="bold">{user?.phone || '—'}</p>
            </div>
            <div>
              <p className="muted-small">Дата создания</p>
              <p className="bold">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—'}</p>
            </div>
            <div>
              <p className="muted-small">Статус</p>
              <div className="flex-row-gap">
                <p className={`bold status-text ${user?.isActive ? 'active' : 'inactive'}`}>
                  {user?.isActive ? 'Активен' : 'Неактивен'}
                </p>
                <span className={`role-badge ${user?.isOnline ? 'online' : 'offline'}`} style={{ padding: '2px 8px', fontSize: '12px', marginTop: '2px' }}>
                  {user?.isOnline ? '● Онлайн' : '○ Офлайн'}
                </span>
              </div>
            </div>
          </div>

          {user?.role === 'warehouseman' && user.warehouse && (
            <div className="mt-16 card-plain card-soft">
              <p className="muted-small">Место работы</p>
              <p className="bold">{user.warehouse.name}</p>
            </div>
          )}
        </div>

        <div className="card-plain">
          <h3 className="no-margin">Статистика</h3>
          <div className="flex-col-gap">
            <div className="stat-card info">
              <p className="muted-small muted-info">Последнее посещение</p>
              <p className="no-margin">{lastSeenTime}</p>
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
              <p className="muted-small">Email</p>
              <p className="bold">{profileData.email}</p>
            </div>
            <div>
              <p className="muted-small">Телефон</p>
              <p className="bold">{profileData.phone || '—'}</p>
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
                disabled={isSaving}
              />
            </div>
            <div className="form-group">
              <label>Фамилия</label>
              <input
                type="text"
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                disabled={isSaving}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                disabled={isSaving}
              />
            </div>
            {user?.role === 'admin' && (
              <div className="form-group">
                <label>Телефон</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  disabled={isSaving}
                  placeholder="+7 (999) 999-99-99"
                />
              </div>
            )}
            <div className="grid-full">
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
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
