import React, { useState, useEffect } from 'react';
import { productService, requestService } from '../../services/mockService';
import type { Product, Request } from '../../types';
import './Manager.css';

export const ManagerDashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'locations' | 'report'>('overview');
  const [newRequestForm, setNewRequestForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, requestsData] = await Promise.all([
        productService.getProducts(),
        requestService.getRequests(),
      ]);
      setProducts(productsData);
      setRequests(requestsData);
    } finally {
      setIsLoading(false);
    }
  };

  const totalValue = products.reduce((sum, p) => sum + p.quantity * p.price, 0);
  const totalProducts = products.length;
  const activeRequests = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="dashboard manager-dashboard">
      <h1>👔 Панель Менеджера</h1>
      <p className="subtitle">Управление заявками и мониторинг запасов</p>

      {/* Dashboard Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', color: '#7f8c8d', fontSize: '12px', textTransform: 'uppercase' }}>📦 Товары на складе</p>
          <p style={{ margin: '0', color: '#2c3e50', fontSize: '28px', fontWeight: 'bold' }}>{totalProducts}</p>
          <p style={{ margin: '8px 0 0 0', color: '#7f8c8d', fontSize: '11px' }}>Всего стоимость: ₽{(totalValue / 1000).toFixed(1)}k</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', color: '#7f8c8d', fontSize: '12px', textTransform: 'uppercase' }}>📋 В ожидании</p>
          <p style={{ margin: '0', color: '#f39c12', fontSize: '28px', fontWeight: 'bold' }}>{activeRequests}</p>
          <p style={{ margin: '8px 0 0 0', color: '#7f8c8d', fontSize: '11px' }}>Активные заявки</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', color: '#7f8c8d', fontSize: '12px', textTransform: 'uppercase' }}>✓ Одобрено</p>
          <p style={{ margin: '0', color: '#27ae60', fontSize: '28px', fontWeight: 'bold' }}>{requests.filter(r => r.status === 'approved').length}</p>
          <p style={{ margin: '8px 0 0 0', color: '#7f8c8d', fontSize: '11px' }}>Одобренные заявки</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', color: '#7f8c8d', fontSize: '12px', textTransform: 'uppercase' }}>⚠️ Критический</p>
          <p style={{ margin: '0', color: '#e74c3c', fontSize: '28px', fontWeight: 'bold' }}>{products.filter(p => p.quantity <= p.minQuantity).length}</p>
          <p style={{ margin: '8px 0 0 0', color: '#7f8c8d', fontSize: '11px' }}>Низкие запасы</p>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Обзор
        </button>
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          📋 Заявки
        </button>
        <button
          className={`tab-btn ${activeTab === 'locations' ? 'active' : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          📍 Местоположения
        </button>
        <button
          className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          📈 Отчёт
        </button>
      </div>

      {isLoading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewTab
              totalValue={totalValue}
              totalProducts={totalProducts}
              activeRequests={activeRequests}
              products={products}
            />
          )}
          {activeTab === 'requests' && (
            <RequestsTab
              requests={requests}
              newRequestForm={newRequestForm}
              setNewRequestForm={setNewRequestForm}
            />
          )}
          {activeTab === 'locations' && (
            <LocationsTab products={products} />
          )}
          {activeTab === 'report' && (
            <ReportTab products={products} requests={requests} />
          )}
        </>
      )}
    </div>
  );
};

const OverviewTab: React.FC<{
  totalValue: number;
  totalProducts: number;
  activeRequests: number;
  products: Product[];
}> = ({ totalValue, totalProducts, activeRequests, products }) => {
  const lowStockCount = products.filter(p => p.quantity <= p.minQuantity).length;

  return (
    <div className="section">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <p className="stat-label">Общая стоимость запасов</p>
            <p className="stat-value">₽{totalValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <p className="stat-label">Всего товаров</p>
            <p className="stat-value">{totalProducts}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <p className="stat-label">Активные заявки</p>
            <p className="stat-value">{activeRequests}</p>
          </div>
        </div>

        <div className={`stat-card ${lowStockCount > 0 ? 'alert' : ''}`}>
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <p className="stat-label">Низкий уровень запасов</p>
            <p className="stat-value">{lowStockCount}</p>
          </div>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="alert-section">
          <h3>⚠️ Товары с низким уровнем запасов:</h3>
          <ul className="low-stock-list">
            {products
              .filter(p => p.quantity <= p.minQuantity)
              .map(p => (
                <li key={p.id}>
                  <strong>{p.name}</strong> - {p.quantity}/{p.minQuantity} шт. в {p.location}
                </li>
              ))
            }
          </ul>
        </div>
      )}
    </div>
  );
};

const RequestsTab: React.FC<{
  requests: Request[];
  newRequestForm: boolean;
  setNewRequestForm: (v: boolean) => void;
}> = ({ requests, newRequestForm, setNewRequestForm }) => {
  return (
    <div className="section">
      <div className="section-header">
        <h2>Управление заявками</h2>
        <button className="btn btn-small" onClick={() => setNewRequestForm(!newRequestForm)}>
          ➕ Новая заявка
        </button>
      </div>

      {newRequestForm && (
        <div className="form-section">
          <h3>Создать новую заявку</h3>
          <p className="hint">Форма создания заявки (в разработке)</p>
        </div>
      )}

      <div className="requests-list">
        {requests.map(request => (
          <div key={request.id} className="request-item">
            <div className="request-header">
              <h3>{request.requestNumber}</h3>
              <span className={`status status-${request.status}`}>
                {getStatusLabel(request.status)}
              </span>
            </div>
            <div className="request-details">
              <p><strong>Тип:</strong> {getRequestTypeLabel(request.requestType)}</p>
              <p><strong>Товары:</strong> {request.products.length}</p>
              <p><strong>Создана:</strong> {formatDate(request.createdAt)}</p>
              {request.notes && <p><strong>Примечание:</strong> {request.notes}</p>}
            </div>
            <div className="request-actions">
              {request.status === 'pending' && (
                <>
                  <button className="btn btn-success btn-small">✅ Одобрить</button>
                  <button className="btn btn-danger btn-small">❌ Отклонить</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LocationsTab: React.FC<{ products: Product[] }> = ({ products }) => {
  const locations = Array.from(new Set(products.map(p => p.location))).sort();

  return (
    <div className="section">
      <h2>Товары по местоположениям</h2>
      <div className="locations-grid">
        {locations.map(location => (
          <div key={location} className="location-card">
            <h3>{location}</h3>
            <ul>
              {products
                .filter(p => p.location === location)
                .map(p => (
                  <li key={p.id}>
                    <span className="product-name">{p.name}</span>
                    <span className="product-qty">{p.quantity} шт.</span>
                  </li>
                ))
              }
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReportTab: React.FC<{ products: Product[]; requests: Request[] }> = ({ products, requests }) => {
  const completedRequests = requests.filter(r => r.status === 'completed').length;
  const averageStockValue = products.length > 0
    ? products.reduce((sum, p) => sum + p.quantity * p.price, 0) / products.length
    : 0;

  return (
    <div className="section">
      <h2>Отчёт о товарах</h2>
      <div className="report-grid">
        <div className="report-item">
          <span className="label">Всего товаров:</span>
          <span className="value">{products.length}</span>
        </div>
        <div className="report-item">
          <span className="label">Завершено заявок:</span>
          <span className="value">{completedRequests}</span>
        </div>
        <div className="report-item">
          <span className="label">Среднее значение товара:</span>
          <span className="value">₽{averageStockValue.toFixed(2)}</span>
        </div>
        <div className="report-item">
          <span className="label">Дата отчёта:</span>
          <span className="value">{new Date().toLocaleDateString('ru-RU')}</span>
        </div>
      </div>
    </div>
  );
};

function getRequestTypeLabel(type: string): string {
  const types: Record<string, string> = {
    sale: 'Продажа',
    purchase: 'Закупка',
    transfer: 'Перемещение',
    adjustment: 'Корректировка',
  };
  return types[type] || type;
}

function getStatusLabel(status: string): string {
  const statuses: Record<string, string> = {
    pending: 'Ожидание',
    approved: 'Одобрено',
    rejected: 'Отклонено',
    completed: 'Завершено',
  };
  return statuses[status] || status;
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
