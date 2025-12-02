import { useState, useEffect } from 'react';
import type { Request, Warehouse, RequestProduct, RequestType, RequestStatus, Product } from '../types';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/useAuth';
import { useNotification } from '../contexts/useNotification';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './Pages.css';
import './RequestsActions.css';

export const RequestsPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [requests, setRequests] = useState<Request[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<RequestType | 'all'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [formData, setFormData] = useState({
    requestType: 'transfer' as RequestType,
    notes: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    products: [] as RequestProduct[],
    fromWarehouseId: undefined as number | undefined,
    toWarehouseId: undefined as number | undefined,
  });
  const [editFormData, setEditFormData] = useState({
    requestType: 'transfer' as RequestType,
    notes: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    products: [] as RequestProduct[],
    fromWarehouseId: undefined as number | undefined,
    toWarehouseId: undefined as number | undefined,
  });
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>();
  const [selectedProductQuantity, setSelectedProductQuantity] = useState(1);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true);
      try {
        const [warehousesData, requestsData, productsData] = await Promise.all([
          apiService.getWarehouses(),
          apiService.getRequests(),
          apiService.getProducts(),
        ]);

        setWarehouses(warehousesData);
        setProducts(productsData);

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
            requestType: 'transfer',
          }));
        }
      } catch (error) {
        console.error('Ошибка при загрузке запросов:', error);
        setLoading(false);
      }
    };

    void loadRequests();
  }, [isAdmin, user?.warehouseId, formData.fromWarehouseId]);

  // Для менеджера автоматически устанавливаем тип заявки как 'transfer'
  useEffect(() => {
    if (!isAdmin && showForm && formData.requestType !== 'transfer') {
      setFormData((prev) => ({
        ...prev,
        requestType: 'transfer',
      }));
    }
  }, [showForm, isAdmin, formData.requestType]);

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

    if (!user?.id) {
      showError('Ошибка: пользователь не авторизован');
      return;
    }

    if (formData.products.length === 0) {
      showError('Добавьте товары в заявку!');
      return;
    }

    try {
      // Создание новой заявки на бэкенде
      await apiService.createRequest({
        requestType: formData.requestType,
        status: 'pending',
        warehouseId: formData.fromWarehouseId || user.warehouseId || 1,
        transferWarehouseId: formData.toWarehouseId,
        products: formData.products,
        createdBy: String(user.id),
        notes: formData.notes,
        priority: formData.priority,
      });

      // Перезагружаем список заявок с бэкенда
      const updatedRequests = await apiService.getRequests();
      setRequests(updatedRequests);
      showSuccess('Заявка успешно создана!');
      resetForm();
    } catch (error) {
      console.error('Ошибка при создании заявки:', error);
      showError('Ошибка при создании заявки');
    }
  };

  const handleEditRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRequest || editFormData.products.length === 0) {
      showError('Добавьте товары в заявку!');
      return;
    }

    try {
      // Обновление существующей заявки
      await apiService.updateRequest(selectedRequest.id, {
        warehouseId: editFormData.fromWarehouseId || user?.warehouseId || 1,
        transferWarehouseId: editFormData.toWarehouseId,
        products: editFormData.products,
        notes: editFormData.notes,
        priority: editFormData.priority,
        status: 'pending',
      });

      // Перезагружаем список заявок с бэкенда
      const updatedRequests = await apiService.getRequests();
      setRequests(updatedRequests);
      showSuccess('Заявка успешно обновлена!');
      resetEditForm();
    } catch (error) {
      console.error('Ошибка при обновлении заявки:', error);
      showError('Ошибка при обновлении заявки');
    }
  };

  const resetForm = () => {
    setFormData({
      requestType: !isAdmin ? 'transfer' : 'transfer',
      notes: '',
      priority: 'normal',
      products: [],
      fromWarehouseId: !isAdmin && user?.warehouseId ? user.warehouseId : undefined,
      toWarehouseId: undefined,
    });
    setShowForm(false);
  };

  const resetEditForm = () => {
    setEditFormData({
      requestType: 'transfer',
      notes: '',
      priority: 'normal',
      products: [],
      fromWarehouseId: undefined,
      toWarehouseId: undefined,
    });
    setSelectedRequest(null);
    setShowEditModal(false);
  };

  const generateTTN = async (request: Request) => {
    const fromWarehouse = warehouses.find((w) => w.id === request.warehouseId);
    const toWarehouse = request.transferWarehouseId ? warehouses.find((w) => w.id === request.transferWarehouseId) : null;
    
    let totalQuantity = 0;
    request.products.forEach((product) => {
      totalQuantity += product.quantity;
    });

    // Создаём HTML для PDF
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #000;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px;">ООО "ЛОГИСТИЧЕСКИЙ ЦЕНТР"</h2>
          <p style="margin: 5px 0; font-size: 12px;">АД: г. Москва, ул. Логистическая, д. 1</p>
          <p style="margin: 5px 0; font-size: 12px;">Тел: +7 (495) 123-45-67 | Email: info@logistics.ru</p>
          <hr style="border: none; border-top: 1px solid #000; margin: 10px 0;" />
          <h1 style="margin: 10px 0; font-size: 16px;">ТОВАРОТРАНСПОРТНАЯ НАКЛАДНАЯ (ТТН)</h1>
        </div>

        <div style="margin-bottom: 15px;">
          <h3 style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">ДАННЫЕ ДОКУМЕНТА</h3>
          <table style="width: 100%; font-size: 11px;">
            <tr>
              <td style="width: 50%;">Номер ТТН: ${request.requestNumber}</td>
              <td>Дата: ${new Date(request.createdAt).toLocaleDateString('ru-RU')}</td>
            </tr>
            <tr>
              <td>Тип операции: ${getTypeLabel(request.requestType)}</td>
              <td>Статус: ${getStatusLabel(request.status)}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 15px;">
          <h3 style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">СТОРОНЫ ТРАНСПОРТИРОВКИ</h3>
          <table style="width: 100%; font-size: 11px;">
            <tr>
              <td style="width: 50%; padding: 5px; border: 1px solid #000; vertical-align: top;">
                <strong>От (отправитель):</strong><br/>
                ${fromWarehouse?.name || 'Неизвестно'}<br/>
                <strong>Адрес:</strong> ${fromWarehouse?.location || 'Не указан'}
              </td>
              <td style="width: 50%; padding: 5px; border: 1px solid #000; vertical-align: top;">
                <strong>Кому (получатель):</strong><br/>
                ${toWarehouse?.name || 'Не указано'}<br/>
                <strong>Адрес:</strong> ${toWarehouse?.location || 'Не указан'}
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 15px;">
          <h3 style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">СПИСОК ТОВАРОВ</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">№</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Наименование товара</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: center;">Кол-во</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Место хранения</th>
              </tr>
            </thead>
            <tbody>
              ${request.products.map((product, idx) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 5px;">${idx + 1}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${product.productName}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: center;">${product.quantity}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${product.location || '-'}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold;">
                <td colspan="2" style="border: 1px solid #000; padding: 5px; text-align: right;">ИТОГО:</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${totalQuantity}</td>
                <td style="border: 1px solid #000; padding: 5px;">Товаров: ${request.products.length}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${request.notes ? `
          <div style="margin-bottom: 15px;">
            <h3 style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">ПРИМЕЧАНИЯ</h3>
            <p style="margin: 5px 0; font-size: 11px; padding: 10px; border: 1px solid #000; background-color: #fafafa;">
              ${request.notes}
            </p>
          </div>
        ` : ''}

        <div style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div style="text-align: center; flex: 1;">
            <div style="height: 40px; border-top: 1px solid #000;"></div>
            <p style="margin: 3px 0; font-size: 10px;">Подпись отправителя</p>
          </div>
          <div style="text-align: center; flex: 1;">
            <div style="height: 40px; border-top: 1px solid #000;"></div>
            <p style="margin: 3px 0; font-size: 10px;">Подпись менеджера</p>
          </div>
          <div style="text-align: center; flex: 1;">
            <div style="height: 40px; border-top: 1px solid #000;"></div>
            <p style="margin: 3px 0; font-size: 10px;">Подпись получателя</p>
          </div>
        </div>

        <div style="margin-top: 20px; text-align: center; font-size: 9px; color: #666;">
          <p style="margin: 0;">Документ создан: ${new Date().toLocaleString('ru-RU')}</p>
        </div>
      </div>
    `;

    // Создаём временный div для html2canvas
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.width = '210mm';
    element.style.background = 'white';
    document.body.appendChild(element);

    try {
      // Конвертируем HTML в canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Создаём PDF из canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 10;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 5;

      // Добавляем изображение на первую страницу
      pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 10;

      // Добавляем дополнительные страницы если нужно
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 5;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`TTN-${request.requestNumber}.pdf`);
    } finally {
      document.body.removeChild(element);
    }
  };

  const handleStatusChange = async (request: Request, newStatus: RequestStatus) => {
    try {
      // Извлекаем числовой ID из request.id (например: "REQ-1234567890" -> "1234567890")
      const numericId = request.id.includes('-') ? request.id.split('-')[1] : request.id;
      
      const result = await apiService.updateRequestStatus(
        numericId,
        newStatus,
        parseInt(user?.id || '1')
      );
      
      if (result) {
        setRequests(
          requests.map((r) => (r.id === request.id ? result : r))
        );
        showSuccess(`Статус изменён на ${getStatusLabel(newStatus)}`);
      }
    } catch (error: unknown) {
      console.error('Ошибка при обновлении статуса:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при обновлении статуса';
      showError(errorMessage);
    }
  };

  const canApproveRequest = (request: Request): boolean => {
    if (isAdmin) return request.status === 'pending';
    if (user?.role === 'manager' && request.warehouseId === user?.warehouseId) {
      return request.status === 'pending';
    }
    return false;
  };

  const canCompleteRequest = (request: Request): boolean => {
    if (isAdmin) return request.status === 'in_transit' || request.status === 'approved';
    if (user?.role === 'manager' && request.transferWarehouseId === user?.warehouseId) {
      return request.status === 'in_transit';
    }
    return false;
  };

  const canRejectRequest = (request: Request): boolean => {
    if (isAdmin) return request.status === 'pending' || request.status === 'approved';
    if (user?.role === 'manager' && request.warehouseId === user?.warehouseId) {
      return request.status === 'pending';
    }
    return false;
  };

  const getActionButtons = (request: Request) => {
    const buttons = [];

    if (request.status === 'pending') {
      // Кнопка редактирования доступна при статусе "Ожидание"
      if (isAdmin || (user?.role === 'manager' && request.warehouseId === user?.warehouseId)) {
        buttons.push(
          <button
            key="edit"
            onClick={async () => {
              const fullRequest = await apiService.getRequestById(request.id);
              if (fullRequest) {
                setEditFormData({
                  requestType: fullRequest.requestType,
                  notes: fullRequest.notes || '',
                  priority: fullRequest.priority as 'low' | 'normal' | 'high',
                  products: fullRequest.products,
                  fromWarehouseId: fullRequest.warehouseId,
                  toWarehouseId: fullRequest.transferWarehouseId,
                });
                setSelectedRequest(fullRequest);
              }
            }}
            className="btn-small btn-info"
            title="Редактировать заявку"
          >
            ✎ Редактировать
          </button>
        );
      }
      if (canApproveRequest(request)) {
        buttons.push(
          <button
            key="approve"
            onClick={() => handleStatusChange(request, 'approved')}
            className="btn-approve"
            title="Одобрить заявку"
          >
            ✓ Одобрить
          </button>
        );
      }
      if (canRejectRequest(request)) {
        buttons.push(
          <button
            key="reject"
            onClick={() => handleStatusChange(request, 'rejected')}
            className="btn-reject"
            title="Отклонить заявку"
          >
            ✗ Отклонить
          </button>
        );
      }
    } else if (request.status === 'approved') {
      // Кнопка возврата в ожидание для редактирования
      if (isAdmin || (user?.role === 'manager' && request.warehouseId === user?.warehouseId)) {
        buttons.push(
          <button
            key="edit-pending"
            onClick={() => handleStatusChange(request, 'pending')}
            className="btn-secondary"
            title="Вернуть в ожидание для редактирования"
          >
            ↶ На редакцию
          </button>
        );
        buttons.push(
          <button
            key="intransit"
            onClick={() => handleStatusChange(request, 'in_transit')}
            className="btn-inprogress"
            title="Товар в пути"
          >
            → В пути
          </button>
        );
      }
    } else if (request.status === 'in_transit') {
      if (canCompleteRequest(request)) {
        buttons.push(
          <button
            key="complete"
            onClick={() => handleStatusChange(request, 'completed')}
            className="btn-complete"
            title="Принять доставку"
          >
            ✓ Принято
          </button>
        );
      }
    } else if (request.status === 'rejected') {
      if (isAdmin || (user?.role === 'manager' && request.warehouseId === user?.warehouseId)) {
        buttons.push(
          <button
            key="cancel"
            onClick={() => handleStatusChange(request, 'pending')}
            className="btn-secondary"
            title="Вернуть в ожидание"
          >
            ↶ Отмена
          </button>
        );
      }
    }

    return buttons;
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
      in_transit: 'В пути',
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
          <h3>{selectedRequest?.status === 'pending' ? `Редактирование заявки ${selectedRequest?.requestNumber}` : 'Создать новую заявку'}</h3>
          <form onSubmit={handleCreateRequest}>
            <div className="form-grid">
              {isAdmin && (
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
              )}

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

              {!isAdmin && (
                <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ marginRight: '8px', color: 'var(--text-primary)' }}>От площадки:</label>
                  <span style={{ padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: '4px', border: '1px solid var(--border-primary)' }}>
                    {warehouses.find((w) => w.id === formData.fromWarehouseId)?.name || 'Загрузка...'}
                  </span>
                </div>
              )}

              {(isAdmin ? formData.requestType === 'transfer' : true) && (
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

              <div style={{ gridColumn: '1 / -1', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                <p style={{ marginBottom: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  Товары в заявке: {formData.products.length}
                </p>
                
                <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: 'var(--surface-primary)', borderRadius: '4px', border: '1px solid var(--border-primary)' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '12px', color: 'var(--text-primary)' }}>Добавить товар:</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <select
                      id="productSelect"
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-primary)',
                        fontSize: '12px',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                      }}
                    >
                      <option value="">-- Выберите товар --</option>
                      {apiService && products
                        .filter(p => !formData.fromWarehouseId || p.warehouseId === formData.fromWarehouseId)
                        .map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} (Кол-во: {product.quantity})
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      id="productQty"
                      min="1"
                      defaultValue="1"
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-primary)',
                        fontSize: '12px',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                      }}
                      placeholder="Кол-во"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const selectEl = document.getElementById('productSelect') as HTMLSelectElement;
                        const qtyEl = document.getElementById('productQty') as HTMLInputElement;
                        const selectedProductId = selectEl?.value;
                        const quantity = parseInt(qtyEl?.value || '1');

                        if (selectedProductId) {
                          const product = products.find(p => p.id === selectedProductId);
                          if (product) {
                            setFormData({
                              ...formData,
                              products: [
                                ...formData.products,
                                {
                                  productId: product.id,
                                  productName: product.name,
                                  quantity: quantity,
                                  location: product.location,
                                },
                              ],
                            });
                            selectEl.value = '';
                            qtyEl.value = '1';
                          }
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        backgroundColor: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Добавить в заявку
                    </button>
                  </div>
                </div>

                {formData.products.length > 0 && (
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                        <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Товар</th>
                        <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Кол-во</th>
                        <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Место</th>
                        <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.products.map((product, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                          <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{product.productName}</td>
                          <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{product.quantity}</td>
                          <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{product.location || '-'}</td>
                          <td style={{ padding: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  products: formData.products.filter((_, i) => i !== idx),
                                });
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                backgroundColor: 'var(--accent-danger)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                              }}
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>
              {selectedRequest?.status === 'pending' ? 'Обновить заявку' : 'Создать заявку'}
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
          <option value="in_transit">В пути</option>
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
          <table className="data-table requests-table">
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
                const toWarehouse = request.transferWarehouseId ? warehouses.find((w) => w.id === request.transferWarehouseId) : null;
                const statusColor = {
                  pending: '#f39c12',
                  approved: '#3498db',
                  in_transit: '#9b59b6',
                  completed: '#27ae60',
                  rejected: '#e74c3c',
                }[request.status] || '#95a5a6';

                return (
                  <tr key={request.id} style={{ borderLeft: `4px solid ${statusColor}` }}>
                    <td className="request-id" style={{ fontWeight: 'bold' }}>{request.requestNumber}</td>
                    <td>{getTypeLabel(request.requestType)}</td>
                    <td style={{ textAlign: 'center' }}>{request.products.length}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          backgroundColor: statusColor,
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: getPriorityColor(request.priority),
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      >
                        {request.priority === 'high' ? 'В' : request.priority === 'normal' ? 'О' : 'Н'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <div>{fromWarehouse?.name || 'Неизвестно'}</div>
                        {toWarehouse && <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>→ {toWarehouse.name}</div>}
                      </div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{new Date(request.createdAt).toLocaleDateString('ru-RU')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                          onClick={async () => {
                            const fullRequest = await apiService.getRequestById(request.id);
                            if (fullRequest) {
                              setSelectedRequest(fullRequest);
                            }
                          }}
                          className="btn-small btn-info"
                          title="Просмотр деталей"
                        >
                          👁️
                        </button>
                        <button
                          onClick={async () => {
                            const fullRequest = await apiService.getRequestById(request.id);
                            if (fullRequest) {
                              generateTTN(fullRequest);
                            }
                          }}
                          className="btn-small btn-success"
                          title="Скачать ТТН"
                        >
                          📄
                        </button>
                        {getActionButtons(request)}
                      </div>
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
            backgroundColor: 'rgba(0,0,0,0.7)',
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
              backgroundColor: '#1e1e1e',
              color: '#e0e0e0',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '700px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              margin: '40px auto',
              border: '1px solid #404040',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#4ECDC4' }}>{selectedRequest.requestNumber}</h2>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  backgroundColor: '#404040',
                  color: '#4ECDC4',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {getStatusLabel(selectedRequest.status)}
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Тип</p>
                  <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-primary)' }}>{getTypeLabel(selectedRequest.requestType)}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Приоритет</p>
                  <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: selectedRequest.priority === 'high' ? '#e74c3c' : selectedRequest.priority === 'normal' ? '#f39c12' : '#3498db',
                        marginRight: '8px',
                      }}
                    />
                    {selectedRequest.priority === 'high' ? 'Высокий' : selectedRequest.priority === 'normal' ? 'Обычный' : 'Низкий'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Создана</p>
                  <p style={{ margin: 0, color: 'var(--text-primary)' }}>{new Date(selectedRequest.createdAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Автор</p>
                  <p style={{ margin: 0, color: 'var(--text-primary)' }}>{selectedRequest.createdBy}</p>
                </div>
              </div>
            </div>

            {selectedRequest.transferWarehouseId && (
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Маршрут</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{warehouses.find((w) => w.id === selectedRequest.warehouseId)?.name || 'Неизвестно'}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>→</span>
                  <span style={{ color: 'var(--text-primary)' }}>{warehouses.find((w) => w.id === selectedRequest.transferWarehouseId)?.name || 'Неизвестно'}</span>
                </div>
              </div>
            )}

            {selectedRequest.notes && (
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Примечания</p>
                <p style={{ margin: 0, color: 'var(--text-primary)' }}>{selectedRequest.notes}</p>
              </div>
            )}

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Товары ({selectedRequest.products.length})</p>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Товар</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>Кол-во</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Место</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRequest.products.length > 0 ? (
                    selectedRequest.products.map((product, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                        <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{product.productName}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text-primary)' }}>{product.quantity} шт</td>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{product.location || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ padding: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Товары не добавлены
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => generateTTN(selectedRequest)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  flex: 1,
                  fontWeight: 'bold',
                  transition: 'background-color 0.3s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
              >
                📄 Скачать ТТН
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'var(--surface-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  flex: 1,
                  fontWeight: 'bold',
                  transition: 'background-color 0.3s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-primary)')}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedRequest && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            overflowY: 'auto',
          }}
          onClick={() => resetEditForm()}
        >
          <div
            style={{
              backgroundColor: '#1e1e1e',
              color: '#e0e0e0',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '700px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              margin: '40px auto',
              border: '1px solid #404040',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 20px 0', color: '#4ECDC4', fontSize: '20px' }}>
              Редактирование заявки {selectedRequest.requestNumber}
            </h2>

            <form onSubmit={handleEditRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Площадка отправления
                  </label>
                  <select
                    value={editFormData.fromWarehouseId || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, fromWarehouseId: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #404040',
                      backgroundColor: '#2a2a2a',
                      color: '#e0e0e0',
                      fontSize: '14px',
                    }}
                  >
                    <option value="">Выберите площадку</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Площадка назначения
                  </label>
                  <select
                    value={editFormData.toWarehouseId || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, toWarehouseId: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #404040',
                      backgroundColor: '#2a2a2a',
                      color: '#e0e0e0',
                      fontSize: '14px',
                    }}
                  >
                    <option value="">Выберите площадку</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Приоритет
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['low', 'normal', 'high'] as const).map((p) => (
                    <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="priority"
                        value={p}
                        checked={editFormData.priority === p}
                        onChange={() => setEditFormData({ ...editFormData, priority: p })}
                      />
                      <span style={{ fontSize: '12px' }}>
                        {p === 'high' ? 'Высокий' : p === 'normal' ? 'Обычный' : 'Низкий'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Примечания
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Введите примечания..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #404040',
                    backgroundColor: '#2a2a2a',
                    color: '#e0e0e0',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                    Товары ({editFormData.products.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductId(undefined);
                      setSelectedProductQuantity(1);
                      setShowAddProductModal(true);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: '#4ECDC4',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    + Добавить товар
                  </button>
                </div>

                {editFormData.products.length > 0 && (
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginBottom: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #404040' }}>
                        <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Товар</th>
                        <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>Кол-во</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: 'var(--text-secondary)' }}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editFormData.products.map((product, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #404040' }}>
                          <td style={{ padding: '8px', color: '#e0e0e0' }}>{product.productName}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#e0e0e0' }}>
                            {product.quantity} шт
                          </td>
                          <td style={{ padding: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditFormData({
                                  ...editFormData,
                                  products: editFormData.products.filter((_, i) => i !== idx),
                                });
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                backgroundColor: 'var(--accent-danger)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                              }}
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#4ECDC4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px',
                  }}
                >
                  Сохранить изменения
                </button>
                <button
                  type="button"
                  onClick={() => resetEditForm()}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#404040',
                    color: '#e0e0e0',
                    border: '1px solid #505050',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px',
                  }}
                >
                  Отменить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddProductModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1002,
          }}
          onClick={() => setShowAddProductModal(false)}
        >
          <div
            style={{
              backgroundColor: '#1e1e1e',
              color: '#e0e0e0',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              border: '1px solid #404040',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px 0', color: '#4ECDC4', fontSize: '18px' }}>
              Добавить товар
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                  Выберите товар
                </label>
                <select
                  value={selectedProductId || ''}
                  onChange={(e) => setSelectedProductId(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #404040',
                    backgroundColor: '#2a2a2a',
                    color: '#e0e0e0',
                    fontSize: '14px',
                  }}
                >
                  <option value="">-- Выберите товар --</option>
                  {products
                    .filter((product) => product.warehouseId === editFormData.fromWarehouseId)
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (ID: {product.id}) (Доступно: {product.quantity})
                      </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                  Количество
                </label>
                <input
                  type="number"
                  value={selectedProductQuantity}
                  onChange={(e) => setSelectedProductQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #404040',
                    backgroundColor: '#2a2a2a',
                    color: '#e0e0e0',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    if (selectedProductId) {
                      const product = products.find((p) => String(p.id) === String(selectedProductId));
                      if (product) {
                        setEditFormData({
                          ...editFormData,
                          products: [
                            ...editFormData.products,
                            {
                              productId: product.id,
                              productName: product.name,
                              quantity: selectedProductQuantity,
                              location: product.location,
                            },
                          ],
                        });
                        setShowAddProductModal(false);
                      }
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#4ECDC4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px',
                  }}
                >
                  Добавить
                </button>
                <button
                  onClick={() => setShowAddProductModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#404040',
                    color: '#e0e0e0',
                    border: '1px solid #505050',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px',
                  }}
                >
                  Отменить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
