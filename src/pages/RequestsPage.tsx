import { useState, useEffect } from 'react';
import type { Request, Warehouse, RequestProduct, RequestType, RequestStatus } from '../types';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/useAuth';
import { useNotification } from '../contexts/useNotification';
import jsPDF from 'jspdf';
import './Pages.css';

export const RequestsPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [requests, setRequests] = useState<Request[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<RequestType | 'all'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [formData, setFormData] = useState({
    requestType: 'transfer' as RequestType,
    notes: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    products: [] as RequestProduct[],
    fromWarehouseId: undefined as number | undefined,
    toWarehouseId: undefined as number | undefined,
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true);
      try {
        const [warehousesData, requestsData] = await Promise.all([
          apiService.getWarehouses(),
          apiService.getRequests(),
        ]);

        setWarehouses(warehousesData);

        let filtered = requestsData;
        if (!isAdmin && user?.warehouseId) {
          filtered = requestsData.filter(
            (r) => r.warehouseId === user.warehouseId || r.transferWarehouseId === user.warehouseId
          );
        }

        setRequests(filtered);
        setLoading(false);

        if (!isAdmin && user?.warehouseId && !formData.fromWarehouseId) {
          setFormData((prev) => ({
            ...prev,
            fromWarehouseId: user.warehouseId,
          }));
        }
      } catch (error) {
        console.error('Ошибка при загрузке запросов:', error);
        setLoading(false);
      }
    };

    void loadRequests();
  }, [isAdmin, user?.warehouseId, formData.fromWarehouseId]);

  const filteredRequests = requests.filter((r) => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchType = filterType === 'all' || r.requestType === filterType;
    return matchStatus && matchType;
  });

  filteredRequests.sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'priority') {
      const priorityMap: Record<string, number> = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityMap[a.priority || 'normal'] || 2;
      const bPriority = priorityMap[b.priority || 'normal'] || 2;
      return bPriority - aPriority;
    }
    return 0;
  });

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.products.length === 0) {
      showError('Добавьте товары в заявку!');
      return;
    }

    try {
      const timestamp = new Date();
      const newRequest: Request = {
        id: `REQ-${timestamp.getTime()}`,
        requestNumber: `REQ-${timestamp.getTime()}`,
        requestType: formData.requestType,
        status: 'pending',
        warehouseId: formData.fromWarehouseId || user?.warehouseId || 1,
        transferWarehouseId: formData.toWarehouseId,
        products: formData.products,
        createdBy: user?.id || 'unknown',
        createdAt: timestamp,
        notes: formData.notes,
        priority: formData.priority,
      };

      setRequests([newRequest, ...requests]);
      showSuccess('Заявка успешно создана!');
      resetForm();
    } catch (error) {
      console.error('Ошибка при создании заявки:', error);
      showError('Ошибка при создании заявки');
    }
  };

  const resetForm = () => {
    setFormData({
      requestType: 'transfer',
      notes: '',
      priority: 'normal',
      products: [],
      fromWarehouseId: !isAdmin && user?.warehouseId ? user.warehouseId : undefined,
      toWarehouseId: undefined,
    });
    setShowForm(false);
  };

  const generateTTN = (request: Request) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let currentY = 15;

    pdf.setFontSize(16);
    pdf.text('ТОВАРОТРАНСПОРТНАЯ НАКЛАДНАЯ (ТТН)', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    pdf.setFontSize(10);
    pdf.text(`Номер: ${request.requestNumber}`, 15, currentY);
    pdf.text(`Дата: ${new Date(request.createdAt).toLocaleDateString('ru-RU')}`, pageWidth - 50, currentY);
    currentY += 8;

    pdf.text(`Тип: ${getTypeLabel(request.requestType)}`, 15, currentY);
    pdf.text(`Статус: ${getStatusLabel(request.status)}`, pageWidth / 2, currentY);
    currentY += 8;

    const fromWarehouse = warehouses.find((w) => w.id === request.warehouseId);
    const toWarehouse = warehouses.find((w) => w.id === request.transferWarehouseId);

    if (fromWarehouse) {
      pdf.text(`От площадки: ${fromWarehouse.name}`, 15, currentY);
      currentY += 6;
    }
    if (toWarehouse) {
      pdf.text(`На площадку: ${toWarehouse.name}`, 15, currentY);
      currentY += 6;
    }

    currentY += 8;
    pdf.setFontSize(9);
    pdf.text('Товары в заявке:', 15, currentY);
    currentY += 6;

    const pageMargin = 15;
    const colWidths = { product: 60, qty: 30, location: 50, sig: 35 };

    pdf.setFillColor(200, 200, 200);
    pdf.text('Товар', pageMargin, currentY);
    pdf.text('Кол-во', pageMargin + colWidths.product, currentY);
    pdf.text('Место', pageMargin + colWidths.product + colWidths.qty, currentY);
    currentY += 6;

    request.products.forEach((product) => {
      pdf.setFontSize(8);
      const productText = product.productName.substring(0, 30);
      pdf.text(productText, pageMargin, currentY);
      pdf.text(product.quantity.toString(), pageMargin + colWidths.product, currentY);
      pdf.text(product.location || '-', pageMargin + colWidths.product + colWidths.qty, currentY);
      currentY += 5;
    });

    if (request.notes) {
      currentY += 3;
      pdf.setFontSize(9);
      pdf.text(`Примечания: ${request.notes.substring(0, 80)}`, 15, currentY);
    }

    currentY += 10;
    pdf.setFontSize(8);
    pdf.text('_____________________', 15, currentY);
    pdf.text('Подпись отправителя', 15, currentY + 4);

    pdf.save(`TTN-${request.requestNumber}.pdf`);
  };

  const handleStatusChange = async (requestId: string, newStatus: RequestStatus) => {
    try {
      setRequests(
        requests.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
      );
      showSuccess('Статус обновлён!');
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
      showError('Ошибка при обновлении статуса');
    }
  };

  const getTypeLabel = (type: RequestType): string => {
    const labels: Record<RequestType, string> = {
      transfer: 'Передача между площадками',
      incoming: 'Прием товара',
      writeoff: 'Списание товара',
      adjustment: 'Корректировка',
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: RequestStatus): string => {
    const labels: Record<RequestStatus, string> = {
      pending: 'Ожидание',
      approved: 'Одобрено',
      completed: 'Завершено',
      rejected: 'Отклонено',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority?: string): string => {
    switch (priority) {
      case 'high':
        return '#e74c3c';
      case 'normal':
        return '#f39c12';
      case 'low':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Загрузка заявок...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Управление заявками</h1>
        <button
          className="btn-primary"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? 'Отмена' : '+ Новая заявка'}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h3>Создать новую заявку</h3>
          <form onSubmit={handleCreateRequest}>
            <div className="form-grid">
              <div className="form-group">
                <label>Тип заявки *</label>
                <select
                  value={formData.requestType}
                  onChange={(e) => setFormData({ ...formData, requestType: e.target.value as RequestType })}
                  required
                >
                  <option value="transfer">Передача между площадками</option>
                  <option value="incoming">Прием товара</option>
                  <option value="writeoff">Списание товара</option>
                  <option value="adjustment">Корректировка</option>
                </select>
              </div>

              <div className="form-group">
                <label>Приоритет *</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'normal' | 'high' })}
                  required
                >
                  <option value="low">Низкий</option>
                  <option value="normal">Обычный</option>
                  <option value="high">Высокий</option>
                </select>
              </div>

              {isAdmin && (
                <div className="form-group">
                  <label>От площадки *</label>
                  <select
                    value={formData.fromWarehouseId || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fromWarehouseId: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
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

              {formData.requestType === 'transfer' && (
                <div className="form-group">
                  <label>На площадку *</label>
                  <select
                    value={formData.toWarehouseId || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        toWarehouseId: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    required
                  >
                    <option value="">Выберите площадку</option>
                    {warehouses
                      .filter((w) => w.id !== formData.fromWarehouseId)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Примечания</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Дополнительные примечания..."
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', padding: '12px', backgroundColor: '#ecf0f1', borderRadius: '4px' }}>
                <p style={{ marginBottom: '12px', fontWeight: 'bold' }}>
                  Товары в заявке: {formData.products.length}
                </p>
                {formData.products.length > 0 && (
                  <table style={{ width: '100%', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Товар</th>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Кол-во</th>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Место</th>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.products.map((product, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #bdc3c7' }}>
                          <td style={{ padding: '4px' }}>{product.productName}</td>
                          <td style={{ padding: '4px' }}>{product.quantity}</td>
                          <td style={{ padding: '4px' }}>{product.location || '-'}</td>
                          <td style={{ padding: '4px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  products: formData.products.filter((_, i) => i !== idx),
                                });
                              }}
                              style={{
                                padding: '2px 6px',
                                fontSize: '11px',
                                backgroundColor: '#e74c3c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                              }}
                            >
                              Удал.
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      products: [
                        ...formData.products,
                        {
                          productId: `PROD-${Date.now()}`,
                          productName: '',
                          quantity: 1,
                        },
                      ],
                    });
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    backgroundColor: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  + Добавить товар
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>
              Создать заявку
            </button>
          </form>
        </div>
      )}

      <div className="filters-bar">
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value as RequestStatus | 'all')}
        >
          <option value="all">Все статусы</option>
          <option value="pending">Ожидание</option>
          <option value="approved">Одобрено</option>
          <option value="completed">Завершено</option>
          <option value="rejected">Отклонено</option>
        </select>

        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value as RequestType | 'all')}
        >
          <option value="all">Все типы</option>
          <option value="transfer">Передача</option>
          <option value="incoming">Прием</option>
          <option value="writeoff">Списание</option>
          <option value="adjustment">Корректировка</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="newest">Новые сначала</option>
          <option value="priority">По приоритету</option>
        </select>
      </div>

      <div className="requests-list">
        {filteredRequests.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Номер</th>
                <th>Тип</th>
                <th>Товаров</th>
                <th>Статус</th>
                <th>Приоритет</th>
                <th>Площадка</th>
                <th>Дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => {
                const fromWarehouse = warehouses.find((w) => w.id === request.warehouseId);
                return (
                  <tr key={request.id}>
                    <td className="request-id">{request.requestNumber}</td>
                    <td>{getTypeLabel(request.requestType)}</td>
                    <td>{request.products.length}</td>
                    <td>
                      <select
                        value={request.status}
                        onChange={(e) => handleStatusChange(request.id, e.target.value as RequestStatus)}
                        className="status-select"
                        style={{ padding: '4px' }}
                      >
                        <option value="pending">Ожидание</option>
                        <option value="approved">Одобрено</option>
                        <option value="completed">Завершено</option>
                        <option value="rejected">Отклонено</option>
                      </select>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: getPriorityColor(request.priority),
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        {request.priority === 'high' ? 'В' : request.priority === 'normal' ? 'О' : 'Н'}
                      </span>
                    </td>
                    <td>{fromWarehouse?.name || 'Неизвестно'}</td>
                    <td>{new Date(request.createdAt).toLocaleDateString('ru-RU')}</td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="btn-small"
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Просмотр
                      </button>
                      <button
                        onClick={() => generateTTN(request)}
                        className="btn-small"
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#27ae60',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        ТТН
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>Заявки не найдены</p>
          </div>
        )}
      </div>

      {selectedRequest && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            overflowY: 'auto',
          }}
          onClick={() => setSelectedRequest(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '90%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              margin: '40px auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Заявка {selectedRequest.requestNumber}</h3>
            <p>
              <strong>Тип:</strong> {getTypeLabel(selectedRequest.requestType)}
            </p>
            <p>
              <strong>Статус:</strong> {getStatusLabel(selectedRequest.status)}
            </p>
            <p>
              <strong>Приоритет:</strong>{' '}
              {selectedRequest.priority === 'high' ? 'Высокий' : selectedRequest.priority === 'normal' ? 'Обычный' : 'Низкий'}
            </p>
            <p>
              <strong>Дата создания:</strong>{' '}
              {new Date(selectedRequest.createdAt).toLocaleDateString('ru-RU')}
            </p>
            {selectedRequest.notes && (
              <p>
                <strong>Примечания:</strong> {selectedRequest.notes}
              </p>
            )}
            <p>
              <strong>Товары ({selectedRequest.products.length}):</strong>
            </p>
            <table style={{ width: '100%', fontSize: '13px', marginBottom: '16px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Товар</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Кол-во</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Место</th>
                </tr>
              </thead>
              <tbody>
                {selectedRequest.products.map((product, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #ecf0f1' }}>
                    <td style={{ padding: '6px' }}>{product.productName}</td>
                    <td style={{ padding: '6px' }}>{product.quantity}</td>
                    <td style={{ padding: '6px' }}>{product.location || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => generateTTN(selectedRequest)}
                className="btn-primary"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Скачать ТТН
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                className="btn-secondary"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
