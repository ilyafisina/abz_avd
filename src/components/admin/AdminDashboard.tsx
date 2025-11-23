import React, { useState, useEffect } from 'react';
import { userService, loggingService, productService } from '../../services/mockService';
import type { User, SystemLog, Product } from '../../types';
import './Admin.css';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'warehouse' | 'settings'>('users');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, logsData, productsData] = await Promise.all([
        userService.getUsers(),
        loggingService.getLogs(),
        productService.getProducts(),
      ]);
      setUsers(usersData);
      setLogs(logsData);
      setProducts(productsData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard admin-dashboard">
      <h1>Панель администратора</h1>
      <p className="subtitle">Управление системой, пользователями и логами</p>

      {/* Dashboard Stats */}
      <div className="stats-grid">
        <div className="card-plain">
          <p className="muted-small muted-uppercase">👥 Пользователи</p>
          <p className="stat-value blue">{users.length}</p>
          <p className="small-text">Активных: {users.filter(u => u.isActive).length}</p>
        </div>
        <div className="card-plain">
          <p className="muted-small muted-uppercase">События системы</p>
          <p className="stat-value purple">{logs.length}</p>
          <p className="small-text">За последние 30 дней</p>
        </div>
        <div className="card-plain">
          <p className="muted-small muted-uppercase">Товаров</p>
          <p className="stat-value dark">{products.length}</p>
          <p className="small-text">Всего категорий: {new Set(products.map(p => p.category)).size}</p>
        </div>
        <div className="card-plain">
          <p className="muted-small muted-uppercase">Система</p>
          <p className="stat-value green">✓ Online</p>
          <p className="small-text">Статус: Работает</p>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Пользователи
        </button>
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📜 Логи системы
        </button>
        <button
          className={`tab-btn ${activeTab === 'warehouse' ? 'active' : ''}`}
          onClick={() => setActiveTab('warehouse')}
        >
          🏢 Управление площадкой
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Настройки
        </button>
      </div>

      {isLoading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <>
          {activeTab === 'users' && <UsersTab users={users} />}
          {activeTab === 'logs' && <LogsTab logs={logs} />}
          {activeTab === 'warehouse' && <WarehouseTab products={products} />}
          {activeTab === 'settings' && <SettingsTab />}
        </>
      )}
    </div>
  );
};

const UsersTab: React.FC<{ users: User[] }> = ({ users }) => {
  return (
    <div className="section">
      <div className="section-header">
        <h2>Управление пользователями</h2>
        <button className="btn btn-small">➕ Добавить пользователя</button>
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Имя пользователя</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Создана</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="user-name">
                    <strong>{user.firstName} {user.lastName}</strong>
                    <small>@{user.username}</small>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`badge role-${user.role}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td>
                  <span className={`badge ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
                <td>{formatDate(user.createdAt)}</td>
                <td className="actions">
                  <button className="btn-action edit">✏️</button>
                  <button className="btn-action delete">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LogsTab: React.FC<{ logs: SystemLog[] }> = ({ logs }) => {
  const sortedLogs = [...logs].reverse().slice(0, 50);

  return (
    <div className="section">
      <h2>Логи системы</h2>
      <p className="info">Показаны последние 50 записей</p>

      <div className="logs-table">
        <table>
          <thead>
            <tr>
              <th>Время</th>
              <th>Пользователь</th>
              <th>Действие</th>
              <th>Тип сущности</th>
              <th>ID сущности</th>
            </tr>
          </thead>
          <tbody>
            {sortedLogs.map(log => (
              <tr key={log.id}>
                <td className="timestamp">{formatDate(log.timestamp)}</td>
                <td className="username">{log.userName}</td>
                <td className="action">{log.action}</td>
                <td>
                  <span className={`entity-type entity-${log.entityType}`}>
                    {log.entityType}
                  </span>
                </td>
                <td className="entity-id">{log.entityId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const WarehouseTab: React.FC<{ products: Product[] }> = ({ products }) => {
  const categories = Array.from(new Set(products.map(p => p.category)));
  const totalValue = products.reduce((sum, p) => sum + p.quantity * p.price, 0);

  return (
    <div className="section">
      <h2>Управление площадкой</h2>

      <div className="warehouse-stats">
        <div className="warehouse-stat">
          <span className="label">Всего товаров</span>
          <span className="value">{products.length}</span>
        </div>
        <div className="warehouse-stat">
          <span className="label">Категорий</span>
          <span className="value">{categories.length}</span>
        </div>
        <div className="warehouse-stat">
          <span className="label">Общая стоимость</span>
          <span className="value">₽{totalValue.toLocaleString()}</span>
        </div>
        <div className="warehouse-stat">
          <span className="label">Средний размер товара</span>
          <span className="value">₽{(totalValue / products.length).toFixed(2)}</span>
        </div>
      </div>

      <div className="warehouse-section">
        <h3>Категории товаров</h3>
        <div className="categories-grid">
          {categories.map(category => {
            const categoryProducts = products.filter(p => p.category === category);
            const categoryValue = categoryProducts.reduce((sum, p) => sum + p.quantity * p.price, 0);
            return (
              <div key={category} className="category-card">
                <h4>{category}</h4>
                <p>Товаров: {categoryProducts.length}</p>
                <p>Сумма: ₽{categoryValue.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="warehouse-actions">
        <button className="btn btn-primary">Сгенерировать отчёт</button>
        <button className="btn btn-primary">📥 Импортировать данные</button>
        <button className="btn btn-primary">📤 Экспортировать данные</button>
      </div>
    </div>
  );
};

const SettingsTab: React.FC = () => {
  return (
    <div className="section">
      <h2>Настройки системы</h2>

      <div className="settings-group">
        <h3>Основные настройки</h3>
        <div className="setting-item">
          <label>Название организации</label>
          <input type="text" defaultValue="АБЗ ВАД" />
        </div>
        <div className="setting-item">
          <label>Email поддержки</label>
          <input type="email" defaultValue="support@abzvad.com" />
        </div>
        <div className="setting-item">
          <label>Телефон</label>
          <input type="tel" defaultValue="+7 (XXX) XXX-XX-XX" />
        </div>
      </div>

      <div className="settings-group">
        <h3>Безопасность</h3>
        <div className="setting-item">
          <label>Требовать двухфакторную аутентификацию</label>
          <input type="checkbox" />
        </div>
        <div className="setting-item">
          <label>Время сеанса (минуты)</label>
          <input type="number" defaultValue="60" />
        </div>
      </div>

      <div className="settings-group">
        <h3>Логирование</h3>
        <div className="setting-item">
          <label>Уровень логирования</label>
          <select>
            <option>INFO</option>
            <option>DEBUG</option>
            <option>WARNING</option>
            <option>ERROR</option>
          </select>
        </div>
        <div className="setting-item">
          <label>Хранить логи (дней)</label>
          <input type="number" defaultValue="90" />
        </div>
      </div>

      <button className="btn btn-primary">💾 Сохранить настройки</button>
    </div>
  );
};

function getRoleLabel(role: string): string {
  const roles: Record<string, string> = {
    warehouseman: 'Складовщик',
    manager: 'Менеджер',
    admin: 'Администратор',
  };
  return roles[role] || role;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
