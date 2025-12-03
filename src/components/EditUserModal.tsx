import React from 'react';
import type { User } from '../types';
import '../components/modal.css';

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  isNew?: boolean;
  formData: {
    username: string;
    password?: string;
    email: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    role: 'admin' | 'manager' | 'warehouseman';
    warehouseId?: number | string;
  };
  warehouses: Array<{ id: number; name: string }>;
  onFormChange: (field: string, value: string | number) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  userRole?: 'admin' | 'manager' | 'warehouseman';
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  formData,
  warehouses,
  onFormChange,
  onSave,
  onClose,
  isLoading = false,
  isNew = false,
  userRole = 'admin',
}) => {
  if (!isOpen) return null;

  const isManagerCreating = userRole === 'manager' && isNew;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isNew ? 'Создание пользователя' : 'Редактирование пользователя'}</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        {isManagerCreating && (
          <div style={{ padding: '0 16px', marginBottom: '12px', fontSize: '13px', color: '#666' }}>
            Вы можете создавать пользователей только роли "Складовщик" для вашей площадки.
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="user-username">Логин *</label>
            <input
              id="user-username"
              type="text"
              value={formData.username}
              onChange={(e) => onFormChange('username', e.target.value)}
              placeholder="Введите логин"
              disabled={isLoading}
              required
            />
          </div>

          {isNew && (
            <div className="form-group">
              <label htmlFor="user-password">Пароль *</label>
              <input
                id="user-password"
                type="password"
                value={formData.password || ''}
                onChange={(e) => onFormChange('password', e.target.value)}
                placeholder="Введите пароль"
                disabled={isLoading}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="user-email">Email</label>
            <input
              id="user-email"
              type="email"
              value={formData.email}
              onChange={(e) => onFormChange('email', e.target.value)}
              placeholder="email@example.com"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="user-phone">Номер телефона</label>
            <input
              id="user-phone"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => onFormChange('phone', e.target.value)}
              placeholder="+7 (999) 999-99-99"
              disabled={isLoading}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="user-firstName">Имя</label>
              <input
                id="user-firstName"
                type="text"
                value={formData.firstName || ''}
                onChange={(e) => onFormChange('firstName', e.target.value)}
                placeholder="Введите имя"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="user-lastName">Фамилия</label>
              <input
                id="user-lastName"
                type="text"
                value={formData.lastName || ''}
                onChange={(e) => onFormChange('lastName', e.target.value)}
                placeholder="Введите фамилию"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="user-role">Роль *</label>
            <select
              id="user-role"
              value={formData.role}
              onChange={(e) => onFormChange('role', e.target.value)}
              disabled={isLoading || isManagerCreating}
              required
            >
              {isManagerCreating ? (
                <option value="warehouseman">Складовщик</option>
              ) : (
                <>
                  <option value="admin">Администратор</option>
                  <option value="manager">Менеджер</option>
                  <option value="warehouseman">Складовщик</option>
                </>
              )}
            </select>
          </div>

          {formData.role !== 'admin' && userRole !== 'manager' && (
            <div className="form-group">
              <label htmlFor="user-warehouse">
                {formData.role === 'manager' ? 'Основная площадка' : 'Площадка'} *
              </label>
              <select
                id="user-warehouse"
                value={formData.warehouseId || ''}
                onChange={(e) => onFormChange('warehouseId', parseInt(e.target.value) || '')}
                disabled={isLoading}
                required
              >
                <option value="">Выберите площадку</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Сохранение...' : isNew ? 'Создать' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
