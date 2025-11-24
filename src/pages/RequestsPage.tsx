import { useState, useEffect, useCallback } from 'react';
import type { Request } from '../types';
import { apiService } from '../services/apiService';
import './Pages.css';

export const RequestsPage = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [formData, setFormData] = useState({
    requestType: 'transfer' as 'transfer' | 'receipt' | 'shipment' | 'inventory',
    description: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    products: [] as string[],
  });

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const data = await apiService.getRequests();
    setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  let filteredRequests = requests.filter((r) => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchType = filterType === 'all' || r.requestType === filterType;
    return matchStatus && matchType;
  });

  filteredRequests.sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'priority') {
      const priorityMap: { [key: string]: number } = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityMap[a.priority || 'normal'] || 2;
      const bPriority = priorityMap[b.priority || 'normal'] || 2;
      return bPriority - aPriority;
    }
    return 0;
  });

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      alert('Заполните описание заявки!');
      return;
    }

    const newRequest = await apiService.createRequest({
      requestType: 'transfer',
      products: [],
      status: 'pending',
      warehouse: 'zone-a',
      createdBy: 'manager1',
      priority: 'normal',
    });

    setRequests([newRequest, ...requests]);
    setFormData({
      requestType: 'transfer',
      description: '',
      priority: 'normal',
      products: [],
    });
    setShowForm(false);
  };

  const handleApprove = async (id: string) => {
    const updated = await apiService.updateRequestStatus(id, 'approved');
    if (updated) {
      setRequests(requests.map((r) => (r.requestNumber === id ? updated : r)));
    }
  };

  const handleReject = async (id: string) => {
    const updated = await apiService.updateRequestStatus(id, 'rejected');
    if (updated) {
      setRequests(requests.map((r) => (r.requestNumber === id ? updated : r)));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: '⏳ В ожидании',
      approved: '✓ Одобрена',
      rejected: '✗ Отклонена',
      completed: '✓✓ Выполнена',
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Загрузка заявок...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📋 Управление заявками</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setShowForm(!showForm);
            setSelectedRequest(null);
          }}
        >
          {showForm ? 'Отмена' : '+ Новая заявка'}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>Создание новой заявки</h2>
          <form onSubmit={handleCreateRequest} className="request-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Тип заявки *</label>
                <select
                  value={formData.requestType}
                  onChange={(e) => setFormData({ ...formData, requestType: e.target.value as 'transfer' | 'receipt' | 'shipment' | 'inventory' })}
                  required
                >
                  <option value="transfer">Перемещение</option>
                  <option value="receipt">Поступление</option>
                  <option value="shipment">Отпуск</option>
                  <option value="inventory">Инвентаризация</option>
                </select>
              </div>
              <div className="form-group">
                <label>Приоритет</label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as 'low' | 'normal' | 'high',
                    })
                  }
                >
                  <option value="low">Низкий</option>
                  <option value="normal">Обычный</option>
                  <option value="high">Высокий</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Описание *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Описание заявки"
                rows={4}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-success">
                Создать заявку
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedRequest(null)}>✕</button>
            <h2>Детали заявки {selectedRequest.requestNumber}</h2>
            <div className="request-details">
              <p>
                <strong>Тип:</strong> {selectedRequest.requestType}
              </p>
              <p>
                <strong>Статус:</strong> {getStatusBadge(selectedRequest.status)}
              </p>
              <p>
                <strong>Приоритет:</strong> {selectedRequest.priority}
              </p>
              <p>
                <strong>Создана:</strong> {new Date(selectedRequest.createdAt).toLocaleString('ru-RU')}
              </p>
              <p>
                <strong>Товаров:</strong> {selectedRequest.products?.length || 0}
              </p>
              {selectedRequest.status === 'pending' && (
                <div className="modal-actions">
                  <button className="btn-success" onClick={() => handleApprove(selectedRequest.requestNumber)}>
                    Одобрить
                  </button>
                  <button className="btn-danger" onClick={() => handleReject(selectedRequest.requestNumber)}>
                    Отклонить
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="filters-bar">
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="pending">В ожидании</option>
          <option value="approved">Одобрены</option>
          <option value="rejected">Отклонены</option>
          <option value="completed">Выполнены</option>
        </select>
        <select
          className="filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">Все типы</option>
          <option value="transfer">Перемещение</option>
          <option value="receipt">Поступление</option>
          <option value="shipment">Отпуск</option>
          <option value="inventory">Инвентаризация</option>
        </select>
        <select
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Новые первыми</option>
          <option value="priority">По приоритету</option>
        </select>
      </div>

      <div className="requests-list">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <div
              key={request.requestNumber}
              className={`request-card priority-${request.priority || 'normal'}`}
              onClick={() => setSelectedRequest(request)}
            >
              <div className="request-card-header">
                <div className="request-number">Заявка #{request.requestNumber}</div>
                <div className={`status-badge ${request.status}`}>{getStatusBadge(request.status)}</div>
              </div>
              <div className="request-card-body">
                <p className="request-type">
                  📌 <strong>{request.requestType}</strong>
                </p>
                <p className="request-description">Заявка на {request.requestType}</p>
                <div className="request-meta">
                  <span className="meta-item">
                    🏷️ Приоритет: <strong>{request.priority || 'normal'}</strong>
                  </span>
                  <span className="meta-item">
                    📦 Товаров: <strong>{request.products?.length || 0}</strong>
                  </span>
                  <span className="meta-item">
                    📅 {new Date(request.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>📭 Заявок не найдено</p>
          </div>
        )}
      </div>

      <div className="page-stats">
        <div className="stat-item">
          <span className="stat-label">Всего заявок:</span>
          <span className="stat-value">{filteredRequests.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">В ожидании:</span>
          <span className="stat-value">{filteredRequests.filter((r) => r.status === 'pending').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Одобрены:</span>
          <span className="stat-value">{filteredRequests.filter((r) => r.status === 'approved').length}</span>
        </div>
      </div>
    </div>
  );
};
