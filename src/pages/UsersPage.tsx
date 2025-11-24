import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { apiService } from '../services/apiService';
import './Pages.css';

export const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'warehouseman' as 'warehouseman' | 'manager' | 'admin',
    isActive: true,
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const data = await apiService.getUsers();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  let filteredUsers = users.filter(u => {
    const matchSearch = 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.email.trim()) {
      alert('Заполните все обязательные поля!');
      return;
    }

    if (editingId) {
      const updated = await apiService.updateUser(editingId, formData);
      if (updated) {
        setUsers(users.map(u => (u.id === editingId ? updated : u)));
      }
      setEditingId(null);
    }

    setFormData({
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      role: 'warehouseman',
      isActive: true,
    });
    setShowForm(false);
  };

  const handleEdit = (user: User) => {
    setFormData({
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      isActive: user.isActive,
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      const deleted = await apiService.deleteUser(id);
      if (deleted) {
        setUsers(users.filter(u => u.id !== id));
      }
    }
  };

  const getRoleLabel = (role: string) => {
    const roleMap: { [key: string]: string } = {
      warehouseman: '📦 Складовщик',
      manager: '👔 Менеджер',
      admin: '🔐 Администратор',
    };
    return roleMap[role] || role;
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Загрузка пользователей...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>👥 Управление пользователями</h1>
        <p>Управление учётными записями и ролями</p>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Поиск по имени, email, логину..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="filter-select">
            <option value="all">Все роли</option>
            <option value="warehouseman">Складовщик</option>
            <option value="manager">Менеджер</option>
            <option value="admin">Администратор</option>
          </select>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(!showForm); setEditingId(null); }}>
          {showForm ? '✕ Отмена' : '➕ Добавить пользователя'}
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <h2>{editingId ? 'Редактирование пользователя' : 'Добавление пользователя'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Логин *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Имя</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Фамилия</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Роль *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'warehouseman' | 'manager' | 'admin' })}
                  required
                >
                  <option value="warehouseman">Складовщик</option>
                  <option value="manager">Менеджер</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  Активен
                </label>
              </div>
            </div>
            <button type="submit" className="btn-primary">
              {editingId ? '💾 Сохранить' : '➕ Добавить'}
            </button>
          </form>
        </div>
      )}

      <div className="page-stats">
        <div className="stat-item">
          <span className="stat-label">Всего пользователей:</span>
          <span className="stat-value">{filteredUsers.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Активных:</span>
          <span className="stat-value">{filteredUsers.filter(u => u.isActive).length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Администраторов:</span>
          <span className="stat-value">{filteredUsers.filter(u => u.role === 'admin').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Менеджеров:</span>
          <span className="stat-value">{filteredUsers.filter(u => u.role === 'manager').length}</span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Логин</th>
              <th>Email</th>
              <th>Имя</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Дата создания</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '-'}</td>
                  <td>{getRoleLabel(user.role)}</td>
                  <td>
                    <span className={`status-dot ${user.isActive ? 'active' : 'inactive'}`} />
                    {user.isActive ? 'Активен' : 'Неактивен'}
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
                  <td>
                    <button className="btn-small" onClick={() => handleEdit(user)}>✏️ Ред.</button>
                    <button className="btn-small btn-danger" onClick={() => handleDelete(user.id)}>🗑️ Уд.</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="empty-cell">
                  Пользователи не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
