import React, { useState, useEffect, useCallback } from 'react';
import {
  FiBox,
  FiAlertTriangle,
  FiClipboard,
  FiDollarSign,
  FiUsers,
  FiBarChart2,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/useAuth';
import { apiService } from '../../services/apiService';
import type { Product, Request, Warehouse } from '../../types';
import './Dashboard.css';

interface DashboardStats {
  totalValue: number;
  totalProducts: number;
  activeRequests: number;
  lowStockCount: number;
  warehouseCount?: number;
  totalUsers?: number;
  systemStatus?: string;
  recentActivity?: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | 'all'>(() => {
    // Менеджер и складовщик видят только свой склад
    // Администратор видит все
    if (user?.role === 'manager' || user?.role === 'warehouseman') {
      return user?.warehouseId || 'all';
    }
    return 'all';
  });

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsData, requestsData, warehousesData, usersData] = await Promise.all([
        apiService.getProducts(),
        apiService.getRequests(),
        apiService.getWarehouses(),
        user?.role === 'admin' ? apiService.getUsers() : Promise.resolve([]),
      ]);

      setProducts(productsData);
      setRequests(requestsData);
      setWarehouses(warehousesData);

      // Фильтруем по складу если нужно
      let filteredProducts = productsData;
      let filteredRequests = requestsData;

      if (user?.role === 'manager') {
        // Менеджер видит только свой склад
        filteredProducts = productsData.filter(p => p.warehouseId === user.warehouseId);
        filteredRequests = requestsData.filter(r => r.warehouseId === user.warehouseId);
      } else if (user?.role === 'warehouseman') {
        // Складовщик видит только свой склад
        filteredProducts = productsData.filter(p => p.warehouseId === user.warehouseId);
        filteredRequests = requestsData.filter(r => r.warehouseId === user.warehouseId);
      } else if (user?.role === 'admin' && selectedWarehouse !== 'all') {
        // Админ может выбрать конкретный склад
        filteredProducts = productsData.filter(p => p.warehouseId === selectedWarehouse);
        filteredRequests = requestsData.filter(r => r.warehouseId === selectedWarehouse);
      }

      const lowStockCount = filteredProducts.filter(p => p.quantity <= p.minQuantity).length;
      const totalValue = filteredProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
      const activeRequests = filteredRequests.filter(r => 
        ['pending', 'approved', 'in_transit'].includes(r.status)
      ).length;

      setStats({
        totalValue,
        totalProducts: filteredProducts.length,
        activeRequests,
        lowStockCount,
        warehouseCount: warehousesData.length,
        totalUsers: usersData.length,
        systemStatus: 'Online',
        recentActivity: filteredRequests.length,
      });

      setProducts(filteredProducts);
      setRequests(filteredRequests);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.role, user?.warehouseId, selectedWarehouse]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getDashboardTitle = () => {
    const roleLabels: Record<string, string> = {
      warehouseman: '📦 Панель Складовщика',
      manager: '📊 Панель Менеджера',
      admin: '⚙️ Панель Администратора',
    };
    return roleLabels[user?.role || ''] || 'Панель управления';
  };

  return (
    <div className="unified-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>{getDashboardTitle()}</h1>
          <p className="subtitle">Полный обзор системы управления складом</p>
        </div>
        <div className="header-controls">
          {user?.role === 'admin' && (
            <select 
              value={selectedWarehouse} 
              onChange={(e) => setSelectedWarehouse(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="filter-select"
            >
              <option value="all">Все склады</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
          {(user?.role === 'manager' || user?.role === 'warehouseman') && (
            <div className="warehouse-label">
              Склад: <strong>{warehouses.find(w => w.id === user.warehouseId)?.name || 'Неизвестно'}</strong>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка данных...</p>
        </div>
      ) : stats ? (
        <>
          {/* Main Stats Grid */}
          <div className="stats-grid">
            <StatCard
              icon={<FiBox />}
              label="Товаров"
              value={stats.totalProducts}
              trend={stats.totalProducts > 0 ? '+5' : '0'}
              color="primary"
            />
            <StatCard
              icon={<FiDollarSign />}
              label="Общая стоимость"
              value={`₽${(stats.totalValue / 1000).toFixed(1)}k`}
              trend={'+12%'}
              color="success"
            />
            <StatCard
              icon={<FiClipboard />}
              label="Активные заявки"
              value={stats.activeRequests}
              trend={stats.activeRequests > 0 ? `${stats.activeRequests}` : '0'}
              color="info"
            />
            <StatCard
              icon={<FiAlertTriangle />}
              label="Низкий уровень"
              value={stats.lowStockCount}
              trend={stats.lowStockCount > 0 ? 'Требуется внимание' : 'В норме'}
              color={stats.lowStockCount > 0 ? 'warning' : 'success'}
            />
            
            {user?.role === 'admin' && (
              <>
                <StatCard
                  icon={<FiUsers />}
                  label="Пользователей"
                  value={stats.totalUsers || 0}
                  color="primary"
                />
                <StatCard
                  icon={<FiBarChart2 />}
                  label="Складов"
                  value={stats.warehouseCount || 0}
                  color="info"
                />
              </>
            )}
          </div>

          {/* Alert Section */}
          {stats.lowStockCount > 0 && (
            <div className="alert-banner warning">
              <FiAlertTriangle size={20} />
              <div className="alert-content">
                <h3>Внимание: товары с низким уровнем запасов</h3>
                <p>{stats.lowStockCount} товаров требуют пополнения запасов</p>
              </div>
              <button className="btn-small">Подробнее</button>
            </div>
          )}

          {/* Content Sections */}
          <div className="dashboard-content">
            {/* Left Column */}
            <div className="content-column primary">
              <RecentRequestsSection requests={requests.slice(0, 5)} />
              <LowStockProductsSection products={products.filter(p => p.quantity <= p.minQuantity).slice(0, 8)} />
            </div>

            {/* Right Column */}
            <div className="content-column secondary">
              {user?.role === 'admin' && (
                <RecentActivitySection requests={requests} />
              )}
              <WarehouseOverviewSection warehouses={warehouses} products={products} />
              <QuickActionsSection role={user?.role || ''} />
            </div>
          </div>

          {/* Analytics Section */}
          {(user?.role === 'manager' || user?.role === 'admin') && (
            <div className="analytics-section">
              <h2>Аналитика</h2>
              <div className="analytics-cards">
                <AnalyticsCard
                  title="Выполненные заявки"
                  value={requests.filter(r => r.status === 'завершено').length}
                  total={requests.length}
                  percentage={((requests.filter(r => r.status === 'завершено').length / requests.length) * 100).toFixed(0)}
                />
                <AnalyticsCard
                  title="Товары в пути"
                  value={requests.filter(r => r.status === 'в_пути').length}
                  total={requests.length}
                  percentage={((requests.filter(r => r.status === 'в_пути').length / requests.length) * 100).toFixed(0)}
                />
                <AnalyticsCard
                  title="Отклоненные заявки"
                  value={requests.filter(r => r.status === 'отменено').length}
                  total={requests.length}
                  percentage={((requests.filter(r => r.status === 'отменено').length / requests.length) * 100).toFixed(0)}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="error-state">
          <p>Не удалось загрузить данные</p>
        </div>
      )}
    </div>
  );
};

// Sub-components
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  color: 'primary' | 'success' | 'warning' | 'info';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend, color }) => (
  <div className={`stat-card stat-${color}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-body">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {trend && <p className="stat-trend">{trend}</p>}
    </div>
  </div>
);

interface RecentRequestsSectionProps {
  requests: Request[];
}

const RecentRequestsSection: React.FC<RecentRequestsSectionProps> = ({ requests }) => (
  <div className="section-card">
    <div className="section-header">
      <h3>Последние заявки</h3>
      <a href="/requests" className="link-more">Все заявки →</a>
    </div>
    <div className="requests-list">
      {requests.length > 0 ? (
        requests.map(req => (
          <div key={req.id} className="request-item">
            <div className="request-number">{req.requestNumber}</div>
            <div className="request-info">
              <p className="request-type">Заявка #{req.id}</p>
              <p className="request-date">{new Date(req.createdAt).toLocaleDateString('ru-RU')}</p>
            </div>
            <span className={`status-badge status-${req.status}`}>
              {getStatusLabel(req.status)}
            </span>
          </div>
        ))
      ) : (
        <p className="empty-state">Нет активных заявок</p>
      )}
    </div>
  </div>
);

interface LowStockProductsSectionProps {
  products: Product[];
}

const LowStockProductsSection: React.FC<LowStockProductsSectionProps> = ({ products }) => (
  <div className="section-card alert">
    <div className="section-header">
      <h3>Низкий уровень запасов</h3>
      <a href="/products" className="link-more">Управление →</a>
    </div>
    <div className="products-list">
      {products.length > 0 ? (
        products.map(product => (
          <div key={product.id} className="product-item">
            <div className="product-name">{product.name}</div>
            <div className="product-quantity">
              <span className="current">{product.quantity}</span>
              <span className="separator">/</span>
              <span className="min">{product.minQuantity}</span>
            </div>
          </div>
        ))
      ) : (
        <p className="empty-state">Все товары в норме ✓</p>
      )}
    </div>
  </div>
);

interface RecentActivitySectionProps {
  requests: Request[];
}

const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({ requests }) => {
  const statuses = {
    черновик: requests.filter(r => r.status === 'черновик').length,
    на_согласовании: requests.filter(r => r.status === 'на_согласовании').length,
    в_пути: requests.filter(r => r.status === 'в_пути').length,
    завершено: requests.filter(r => r.status === 'завершено').length,
    отменено: requests.filter(r => r.status === 'отменено').length,
  };

  return (
    <div className="section-card">
      <div className="section-header">
        <h3>Статистика заявок</h3>
      </div>
      <div className="activity-stats">
        <ActivityItem label="На рассмотрении" count={statuses.черновик} color="warning" />
        <ActivityItem label="На согласовании" count={statuses.на_согласовании} color="info" />
        <ActivityItem label="В пути" count={statuses.в_пути} color="primary" />
        <ActivityItem label="Завершено" count={statuses.завершено} color="success" />
        <ActivityItem label="Отменено" count={statuses.отменено} color="danger" />
      </div>
    </div>
  );
};

interface ActivityItemProps {
  label: string;
  count: number;
  color: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ label, count, color }) => (
  <div className="activity-item">
    <div className={`activity-badge activity-${color}`}>{count}</div>
    <span className="activity-label">{label}</span>
  </div>
);

interface WarehouseOverviewSectionProps {
  warehouses: Warehouse[];
  products: Product[];
}

const WarehouseOverviewSection: React.FC<WarehouseOverviewSectionProps> = ({ warehouses, products }) => (
  <div className="section-card">
    <div className="section-header">
      <h3>Склады</h3>
      <a href="/locations" className="link-more">Управление →</a>
    </div>
    <div className="warehouses-list">
      {warehouses.slice(0, 4).map(warehouse => {
        const warehouseProducts = products.filter(p => p.warehouseId === warehouse.id);
        const totalValue = warehouseProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
        return (
          <div key={warehouse.id} className="warehouse-item">
            <h4>{warehouse.name}</h4>
            <div className="warehouse-info">
              <span>Товаров: {warehouseProducts.length}</span>
              <span>₽{(totalValue / 1000).toFixed(1)}k</span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

interface QuickActionsSectionProps {
  role: string;
}

const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({ role }) => {
  const actions = {
    warehouseman: [
      { label: 'Товары', href: '/products' },
      { label: 'Заявки', href: '/requests' },
    ],
    manager: [
      { label: 'Новая заявка', href: '/requests' },
      { label: 'Отчеты', href: '/reports' },
      { label: 'Местоположения', href: '/locations' },
    ],
    admin: [
      { label: 'Пользователи', href: '/users' },
      { label: 'Логи системы', href: '/logs' },
      { label: 'Отчеты', href: '/reports' },
    ],
  };

  const roleActions = actions[role as keyof typeof actions] || actions.warehouseman;

  return (
    <div className="section-card">
      <div className="section-header">
        <h3>Быстрые действия</h3>
      </div>
      <div className="quick-actions">
        {roleActions.map((action, idx) => (
          <a key={idx} href={action.href} className="quick-action-btn">
            <span className="label">{action.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

interface AnalyticsCardProps {
  title: string;
  value: number;
  total: number;
  percentage: string;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ title, value, total, percentage }) => (
  <div className="analytics-card">
    <h4>{title}</h4>
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
    </div>
    <div className="analytics-info">
      <span className="value">{value} из {total}</span>
      <span className="percentage">{percentage}%</span>
    </div>
  </div>
);

// Helper functions
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'На рассмотрении',
    approved: 'Одобрено',
    in_transit: 'В пути',
    completed: 'Завершено',
    rejected: 'Отклонено',
  };
  return labels[status] || status;
}
