import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import type { User, Warehouse } from '../types';
import { apiService } from '../services/apiService';
import { EditUserModal } from '../components/EditUserModal';
import './Pages.css';

export const UserManagementPage = () => {
  const { user } = useAuth();
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
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'warehouseman' as 'warehouseman' | 'manager' | 'admin',
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
        alert('Не удалось загрузить пользователей');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

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
      role: 'warehouseman',
      warehouseId: isManager ? user?.warehouseId || '' : '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (userToEdit: User) => {
    setIsNew(false);
    setEditingUser(userToEdit);
    setFormData({
      username: userToEdit.username,
      email: userToEdit.email || '',
      role: userToEdit.role,
      warehouseId: userToEdit.warehouseId || '',
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
      role: 'warehouseman',
      warehouseId: '',
    });
  };

  const handleFormChange = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value } as any);
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      alert('Введите логин');
      return;
    }

    if (formData.role !== 'admin' && !formData.warehouseId) {
      alert('Выберите площадку для пользователя');
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        if (!formData.password) {
          alert('Введите пароль');
          setIsSaving(false);
          return;
        }
        // TODO: Implement createUser in apiService
        const created = await apiService.createUser?.(formData as any);
        if (created) {
          setUsers([...users, created]);
          alert('Пользователь успешно создан!');
          handleCloseModal();
        }
      } else if (editingUser) {
        // TODO: Implement updateUser in apiService
        const updated = await apiService.updateUser?.(editingUser.id, formData as any);
        if (updated) {
          setUsers(users.map(u => u.id === editingUser.id ? updated : u));
          alert('Пользователь успешно обновлён!');
          handleCloseModal();
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении пользователя:', error);
      alert('Не удалось сохранить пользователя');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

    try {
      // TODO: Implement deleteUser in apiService
      const deleted = await apiService.deleteUser?.(userId);
      if (deleted) {
        setUsers(users.filter(u => u.id !== userId));
        alert('Пользователь успешно удалён!');
      }
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      alert('Не удалось удалить пользователя');
    }
  };

  if (!isAdmin && !isManager) {
    return (
      <div className="page-container">
        <div className="alert alert-warning">
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

        .alert {
          padding: 16px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .alert-warning {
          background-color: #fff3cd;
          border: 1px solid #ffc107;
          color: #856404;
        }
      `}</style>
    </div>
  );
};
