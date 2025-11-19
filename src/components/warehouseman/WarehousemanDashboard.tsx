import React, { useState, useEffect } from 'react';
import { productService, requestService } from '../../services/mockService';
import type { Product, Request } from '../../types';
import './Warehouseman.css';

export const WarehousemanDashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'requests'>('products');

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
      setRequests(requestsData.filter(r => r.status !== 'completed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard warehouseman-dashboard">
      <h1>📦 Панель Складовщика</h1>
      <p className="subtitle">Управление товаром и просмотр заявок</p>

      {/* Dashboard Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', color: '#7f8c8d', fontSize: '12px', textTransform: 'uppercase' }}>📦 Всего товаров</p>
          <p style={{ margin: '0', color: '#2c3e50', fontSize: '28px', fontWeight: 'bold' }}>{products.length}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', color: '#7f8c8d', fontSize: '12px', textTransform: 'uppercase' }}>⚠️ Низкие запасы</p>
          <p style={{ margin: '0', color: '#e74c3c', fontSize: '28px', fontWeight: 'bold' }}>{products.filter(p => p.quantity <= p.minQuantity).length}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', color: '#7f8c8d', fontSize: '12px', textTransform: 'uppercase' }}>📋 Активные заявки</p>
          <p style={{ margin: '0', color: '#3498db', fontSize: '28px', fontWeight: 'bold' }}>{requests.filter(r => r.status === 'pending').length}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', color: '#7f8c8d', fontSize: '12px', textTransform: 'uppercase' }}>💰 Общая стоимость</p>
          <p style={{ margin: '0', color: '#27ae60', fontSize: '24px', fontWeight: 'bold' }}>₽{(products.reduce((sum, p) => sum + (p.quantity * p.price), 0) / 1000).toFixed(1)}k</p>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          📦 Товары
        </button>
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          📋 Заявки
        </button>
      </div>

      {isLoading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <>
          {activeTab === 'products' && (
            <ProductsList products={products} />
          )}
          {activeTab === 'requests' && (
            <RequestsList requests={requests} />
          )}
        </>
      )}
    </div>
  );
};

const ProductsList: React.FC<{ products: Product[] }> = ({ products }) => {
  const lowStockCount = products.filter(p => p.quantity <= p.minQuantity).length;

  return (
    <div className="section">
      <div className="section-header">
        <h2>Список товаров</h2>
        <span className={`low-stock-badge ${lowStockCount > 0 ? 'alert' : ''}`}>
          Низкий остаток: {lowStockCount}
        </span>
      </div>

      <div className="products-grid">
        {products.map(product => (
          <div
            key={product.id}
            className={`product-card ${product.quantity <= product.minQuantity ? 'low-stock' : ''}`}
          >
            <div className="product-header">
              <h3>{product.name}</h3>
              <span className="sku">SKU: {product.sku}</span>
            </div>

            <div className="product-details">
              <div className="detail-row">
                <span className="label">Категория:</span>
                <span className="value">{product.category}</span>
              </div>
              <div className="detail-row">
                <span className="label">Количество:</span>
                <span className="value quantity">{product.quantity} шт.</span>
              </div>
              <div className="detail-row">
                <span className="label">Минимум:</span>
                <span className="value">{product.minQuantity} шт.</span>
              </div>
              <div className="detail-row">
                <span className="label">Местоположение:</span>
                <span className="value location">{product.location}</span>
              </div>
              <div className="detail-row">
                <span className="label">Цена:</span>
                <span className="value price">₽{product.price}</span>
              </div>
            </div>

            {product.quantity <= product.minQuantity && (
              <div className="warning">⚠️ Требуется пополнение запасов</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const RequestsList: React.FC<{ requests: Request[] }> = ({ requests }) => {
  return (
    <div className="section">
      <h2>Активные заявки</h2>

      {requests.length === 0 ? (
        <div className="empty-state">
          <p>Нет активных заявок</p>
        </div>
      ) : (
        <div className="requests-table">
          <table>
            <thead>
              <tr>
                <th>Номер</th>
                <th>Тип</th>
                <th>Статус</th>
                <th>Товары</th>
                <th>Приоритет</th>
                <th>Создана</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(request => (
                <tr key={request.id}>
                  <td className="request-number">{request.requestNumber}</td>
                  <td>{getRequestTypeLabel(request.requestType)}</td>
                  <td><span className={`status status-${request.status}`}>{getStatusLabel(request.status)}</span></td>
                  <td>{request.products.length} товаров</td>
                  <td><span className={`priority priority-${request.priority || 'normal'}`}>{request.priority || 'normal'}</span></td>
                  <td>{formatDate(request.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
