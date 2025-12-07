import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { useNotification } from '../contexts/useNotification';
import type { User, Warehouse } from '../types';
import { apiService } from '../services/apiService';
import { EditUserModal } from '../components/EditUserModal';
import './Pages.css';

export const UsersPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterWarehouse, setFilterWarehouse] = useState<number | string>('all');
  const [selectedUserReport, setSelectedUserReport] = useState<User | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    passwordHash: '',
    role: 'warehouseman' as 'admin' | 'manager' | 'warehouseman',
    warehouseId: '' as string | number,
  });

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [usersData, warehousesData] = await Promise.all([
          apiService.getUsers(),
          apiService.getWarehouses(),
        ]);
        
        setUsers(usersData);
        setWarehouses(warehousesData);
      } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
        showError('Не удалось загрузить пользователей');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    const loadReportData = async () => {
      if (selectedUserReport?.id) {
        try {
          setReportLoading(true);
          const userData = await apiService.getUser(selectedUserReport.id);
          if (userData) {
            setSelectedUserReport(userData);
          }
        } catch (error) {
          console.error('Ошибка при загрузке данных отчета:', error);
        } finally {
          setReportLoading(false);
        }
      }
    };

    loadReportData();
  }, [selectedUserReport?.id]);

  const getFilteredUsers = () => {
    let filtered = users;

    // Менеджер видит только пользователей своей площадки
    if (isManager && user?.warehouseId) {
      filtered = filtered.filter(
        u => u.warehouseId === user.warehouseId || u.role === 'admin'
      );
    }

    // Фильтруем по поиску
    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Фильтруем по роли
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }

    // Фильтруем по площадке
    if (filterWarehouse !== 'all') {
      filtered = filtered.filter(u => u.warehouseId === parseInt(String(filterWarehouse)));
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  const handleOpenNew = () => {
    setIsNew(true);
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      email: '',
      phone: '',
      firstName: '',
      lastName: '',
      passwordHash: '',
      role: 'warehouseman',
      warehouseId: isManager ? user?.warehouseId || '' : '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (userToEdit: User) => {
    setIsNew(false);
    setEditingUser(userToEdit);
    setFormData({
      username: userToEdit.username || '',
      email: userToEdit.email || '',
      phone: userToEdit.phone ? String(userToEdit.phone) : '',
      firstName: userToEdit.firstName || '',
      lastName: userToEdit.lastName || '',
      passwordHash: userToEdit.passwordHash || '',
      role: userToEdit.role as 'admin' | 'manager' | 'warehouseman',
      warehouseId: userToEdit.warehouseId || '',
      password: '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      email: '',
      phone: '',
      firstName: '',
      lastName: '',
      passwordHash: '',
      role: 'warehouseman',
      warehouseId: '',
    });
  };

  const handleFormChange = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value } as any);
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      showError('Введите логин');
      return;
    }

    // Проверка прав менеджера - может создавать только warehouseman
    if (isManager && formData.role !== 'warehouseman') {
      showError('Менеджеры могут создавать только пользователей роли "Складовщик"');
      return;
    }

    if ((formData.role as string) !== 'admin' && !formData.warehouseId) {
      showError('Выберите площадку для пользователя');
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        if (!formData.password) {
          showError('Введите пароль');
          setIsSaving(false);
          return;
        }
        const created = await apiService.createUser(formData as any);
        if (created) {
          setUsers([...users, created]);
          showSuccess('Пользователь успешно создан!');
          handleCloseModal();
        } else {
          showError('Ошибка при создании пользователя');
        }
      } else if (editingUser) {
        // При обновлении:
        // - Если пароль введён - отправляем новый пароль для хеширования
        // - Если пароль пустой - отправляем пустую строку, backend сохранит старый хеш
        const updateData: any = {
          id: parseInt(editingUser.id),
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          warehouseId: formData.warehouseId ? parseInt(String(formData.warehouseId)) : null,
          isActive: true,
          // Отправляем пароль только если он новый, иначе пустую строку
          passwordHash: formData.password || '',
        };
        const updated = await apiService.updateUser(editingUser.id, updateData);
        if (updated) {
          setUsers(users.map(u => u.id === editingUser.id ? updated : u));
          showSuccess('Пользователь успешно обновлён!');
          handleCloseModal();
        } else {
          showError('Ошибка при обновлении пользователя');
        }
      }
    } catch (error: any) {
      console.error('Ошибка при сохранении пользователя:', error);
      // Проверяем, есть ли сообщение об ошибке от backend
      const errorMessage = error?.response?.data?.error || 'Не удалось сохранить пользователя';
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

    try {
      const deleted = await apiService.deleteUser(userId);
      if (deleted) {
        setUsers(users.filter(u => u.id !== userId));
        showSuccess('Пользователь успешно удалён!');
      } else {
        showError('Ошибка при удалении пользователя');
      }
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      showError('Не удалось удалить пользователя');
    }
  };

  if (!isAdmin && !isManager) {
    return (
      <div className="page-container">
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          margin: '20px 0',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          color: '#856404',
        }}>
          <h2>Доступ запрещён</h2>
          <p>Только администраторы и менеджеры могут управлять пользователями</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Загрузка пользователей...</div>
      </div>
    );
  }

  const formatLastSeen = (lastSeenDate: Date): string => {
    const now = new Date();
    const diff = now.getTime() - lastSeenDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'сейчас';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;
    const h = lastSeenDate.getHours();
    const m = lastSeenDate.getMinutes();
    const hStr = h < 10 ? '0' + h : h;
    const mStr = m < 10 ? '0' + m : m;
    return lastSeenDate.toLocaleDateString('ru-RU') + ' ' + hStr + ':' + mStr;
  };

  const getOnlineStatus = (user: User): boolean => {
    // Бэк должен вернуть правильный isOnline, но дополнительно проверим на фронтенде
    if (!user.lastSeenAt) {
      return user.isOnline ?? false;
    }
    try {
      const lastSeenDate = new Date(user.lastSeenAt);
      if (isNaN(lastSeenDate.getTime())) {
        return user.isOnline ?? false;
      }
      const diffMinutes = (new Date().getTime() - lastSeenDate.getTime()) / 60000;
      return diffMinutes <= 30;
    } catch {
      return user.isOnline ?? false;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Управление пользователями</h1>
        <button className="btn-primary" onClick={handleOpenNew}>
          + Добавить пользователя
        </button>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Поиск по логину или email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="all">Все роли</option>
          <option value="admin">Администратор</option>
          <option value="manager">Менеджер</option>
          <option value="warehouseman">Складовщик</option>
        </select>

        {isAdmin && (
          <select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)}>
            <option value="all">Все площадки</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
      </div>

      <EditUserModal
        isOpen={showModal}
        user={editingUser}
        isNew={isNew}
        formData={formData}
        warehouses={warehouses}
        onFormChange={handleFormChange}
        onSave={handleSave}
        onClose={handleCloseModal}
        isLoading={isSaving}
        userRole={user?.role as any}
      />

      <div className="users-table">
        {filteredUsers.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Логин</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Площадка</th>
                <th style={{ textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const warehouseName = u.warehouseId
                  ? warehouses.find(w => w.id === u.warehouseId)?.name || 'Неизвестно'
                  : 'Все площадки';
                
                const roleLabel = {
                  admin: 'Администратор',
                  manager: 'Менеджер',
                  warehouseman: 'Складовщик',
                }[u.role];

                return (
                  <tr key={u.id}>
                    <td className="bold">{u.username}</td>
                    <td>{u.email || '-'}</td>
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {roleLabel}
                      </span>
                    </td>
                    <td>{warehouseName}</td>
                    <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {isAdmin && (
                        <button
                          onClick={() => setSelectedUserReport(u)}
                          className="btn-small"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: '#27ae60',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Отчет
                        </button>
                      )}
                      {(isAdmin || (isManager && u.role !== 'admin')) && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="btn-small"
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              backgroundColor: 'var(--primary-blue)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            ✏ Редакт.
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="btn-small"
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                backgroundColor: '#e74c3c',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              🗑 Удал.
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>Пользователи не найдены</p>
          </div>
        )}
      </div>

      {selectedUserReport && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedUserReport(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Отчет по пользователю</h2>
              <button
                onClick={() => setSelectedUserReport(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px 0' }}>Логин</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>{selectedUserReport.username}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px 0' }}>Email</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>{selectedUserReport.email}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px 0' }}>Имя</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>{selectedUserReport.firstName || '—'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px 0' }}>Фамилия</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>{selectedUserReport.lastName || '—'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px 0' }}>Телефон</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>{selectedUserReport.phone || '—'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px 0' }}>Роль</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
                  {selectedUserReport.role === 'admin' ? 'Администратор' :
                   selectedUserReport.role === 'manager' ? 'Менеджер' :
                   'Складовщик'}
                </p>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--surface-secondary)', padding: '16px', borderRadius: '6px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '20px' }}>{getOnlineStatus(selectedUserReport) ? '🟢 Онлайн' : '⚪ Офлайн'}</span>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px 0' }}>Последнее посещение</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
                  {selectedUserReport.lastSeenAt ? formatLastSeen(new Date(selectedUserReport.lastSeenAt)) : '—'}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px 0' }}>Статус</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: selectedUserReport.isActive ? '#27ae60' : '#e74c3c' }}>
                  {selectedUserReport.isActive ? '✓ Активен' : '✗ Неактивен'}
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px 0' }}>Дата создания</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
                  {selectedUserReport.createdAt ? new Date(selectedUserReport.createdAt).toLocaleDateString('ru-RU') : '—'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedUserReport(null)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'var(--primary-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
              disabled={reportLoading}
            >
              {reportLoading ? 'Загрузка...' : 'Закрыть'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .users-table table {
          width: 100%;
          border-collapse: collapse;
          background-color: var(--surface-primary);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .users-table thead {
          background-color: var(--surface-secondary);
          font-weight: 600;
          text-align: left;
        }

        .users-table th {
          padding: 12px 16px;
          border-bottom: 2px solid var(--border-primary);
        }

        .users-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-primary);
        }

        .users-table tbody tr:hover {
          background-color: var(--surface-secondary);
        }

        .users-table .bold {
          font-weight: 600;
          color: var(--text-primary);
        }

        .role-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .role-badge.admin {
          background-color: #e74c3c;
          color: white;
        }

        .role-badge.manager {
          background-color: #3498db;
          color: white;
        }

        .role-badge.warehouseman {
          background-color: #95a5a6;
          color: white;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};
