import { useState, useEffect } from 'react';
import type { Product } from '../types';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/useAuth';
import './modal.css';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ReservedInfo {
  requestId: number;
  warehouseId: number;
  quantity: number;
  status: string;
  createdAt: string;
}

interface TransferInfo {
  id: number;
  fromWarehouse: string;
  toWarehouse: string;
  quantity: number;
  receivedQuantity?: number;
  status: string;
  createdAt: string;
  completedBy?: string | number;
  completedByUser?: any;
  completedAt?: string;
  receivedBy?: string | number;
  receivedByUser?: any;
  receivedAt?: string;
  cancelledBy?: string | number;
  cancelledByUser?: any;
  cancelledAt?: string;
}

interface IncomingTransferInfo {
  requestId: number;
  fromWarehouse: string;
  toWarehouse: string;
  quantity: number;
  status: string;
  createdAt: string;
}

export const ProductDetailModal = ({ product, isOpen, onClose }: ProductDetailModalProps) => {
  const { user } = useAuth();
  const [reserved, setReserved] = useState<ReservedInfo[]>([]);
  const [transfers, setTransfers] = useState<TransferInfo[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<IncomingTransferInfo[]>([]);
  const [totalReserved, setTotalReserved] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      loadProductDetails();
    }
  }, [isOpen, product]);

  const loadProductDetails = async () => {
    if (!product) return;
    setLoading(true);
    try {
      // Загружаем резервирования и заявки
      const reservedProducts = await apiService.getReservedProducts?.();
      const allRequests = await apiService.getRequests();
      
      if (reservedProducts && allRequests) {
        // === РАЗДЕЛ 1: Зарезервировано на заявки ===
        // Показываем только товары со статусом "pending" на площадке ОТПРАВЛЕНИЯ (где работает текущий пользователь)
        // И только где заявка в статусе "черновик", "на_согласовании" или "одобрено"
        const filteredReserved = reservedProducts
          .filter((r: any) => {
            // Проверяем товар
            if (String(r.productId) !== product.id) return false;
            
            // Статус резервирования должен быть "pending"
            if (r.status !== 'pending') return false;
            
            // Резервирование должно быть на площадке ОТПРАВЛЕНИЯ (т.е. это наша площадка)
            if (user?.warehouseId && r.warehouseId !== user.warehouseId) return false;
            
            // Проверяем статус заявки - она должна быть в процессе одобрения
            const request = allRequests.find((req: any) => req.id === r.requestId);
            if (!request) return false;
            
            const status = String(request.status).toLowerCase();
            const isPending = status === 'черновик' || status === 'черновик' || status === 'на_согласовании' || status === 'одобрено' || 
                            status === 'draft' || status === 'pending' || status === 'on_review';
            
            return isPending;
          })
          .map((r: any) => ({
            requestId: r.requestId,
            warehouseId: r.warehouseId,
            quantity: r.reservedQuantity,
            status: r.status,
            createdAt: r.createdAt,
          }));
        
        setReserved(filteredReserved);
        const total = filteredReserved.reduce((sum, item) => sum + item.quantity, 0);
        setTotalReserved(total);

        // === РАЗДЕЛ 2: История перемещений ===
        // Показываем заявки с статусом "завершено" (completed)
        // С контекстом: если текущий пользователь на площадке отправления - "Отправлено", если на получении - "Получено"
        const filteredTransfers = allRequests
          .filter((req: any) => {
            const status = String(req.status).toLowerCase();
            return status === 'завершено' || status === 'completed';
          })
          .flatMap((req: any) => {
            // Берем товары из RequestProducts
            return req.products
              ?.filter((rp: any) => String(rp.productId) === product.id)
              .map((rp: any) => {
                // Определяем статус в зависимости от контекста пользователя
                let displayStatus = 'Завершено';
                if (user?.warehouseId === req.warehouseId) {
                  displayStatus = 'Отправлено';
                } else if (user?.warehouseId === req.transferWarehouseId) {
                  displayStatus = 'Получено';
                }
                
                return {
                  id: req.id,
                  fromWarehouse: `Площадка ${req.warehouseId}`,
                  toWarehouse: `Площадка ${req.transferWarehouseId}`,
                  quantity: rp.quantity || rp.reservedQuantity,
                  receivedQuantity: rp.quantity || rp.reservedQuantity,
                  status: displayStatus,
                  createdAt: req.completedAt || req.createdAt,
                  completedBy: req.completedBy,
                  completedByUser: req.completedByUser,
                  completedAt: req.completedAt,
                  receivedBy: req.receivedBy,
                  receivedByUser: req.receivedByUser,
                  receivedAt: req.receivedAt,
                  cancelledBy: req.cancelledBy,
                  cancelledByUser: req.cancelledByUser,
                  cancelledAt: req.cancelledAt,
                };
              }) || [];
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setTransfers(filteredTransfers);

        // === РАЗДЕЛ 3: Ожидающиеся поступления ===
        // Показываем заявки в статусе "в_пути" или "на_приемке" 
        // ТОЛЬКО если пользователь на площадке ПОЛУЧЕНИЯ (transferWarehouseId)
        // Товары должны быть в ReservedProducts со статусом "pending" на площадке получения
        const filteredIncoming = reservedProducts
          .filter((r: any) => {
            // Проверяем товар
            if (String(r.productId) !== product.id) return false;
            
            // Статус резервирования должен быть "pending" (ожидание прибытия)
            if (r.status !== 'pending') return false;
            
            // Резервирование должно быть на площадке ПОЛУЧЕНИЯ текущего пользователя
            if (user?.warehouseId && r.warehouseId !== user.warehouseId) return false;
            
            // Это резервирование на площадке получения только если оно сделано из другой площадки
            const request = allRequests.find((req: any) => req.id === r.requestId);
            if (!request) return false;
            
            // Резервирование на получении будет только если:
            // - Заявка в статусе "в_пути" или "на_приемке"
            // - warehouseId резервирования = transferWarehouseId заявки
            const status = String(request.status).toLowerCase();
            const isInTransit = status === 'в_пути' || status === 'in_transit' || 
                              status === 'на_приемке' || status === 'on_reception';
            
            return isInTransit && r.warehouseId === request.transferWarehouseId;
          })
          .map((r: any) => {
            const request = allRequests.find((req: any) => req.id === r.requestId);
            const status = String(request?.status || '').toLowerCase();
            
            return {
              requestId: r.requestId,
              fromWarehouse: `Площадка ${request?.warehouseId}`,
              toWarehouse: `Площадка ${request?.transferWarehouseId}`,
              quantity: r.reservedQuantity,
              status: status === 'в_пути' || status === 'in_transit' ? 'В пути' : 'На приёмке',
              createdAt: r.createdAt,
            };
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setIncomingTransfers(filteredIncoming);
      }
    } catch (error) {
      console.error('Ошибка загрузки деталей товара:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Детали товара: {product.name}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Основная информация о товаре */}
          <section className="detail-section">
            <h3>Основная информация</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Артикул (SKU):</label>
                <span>{product.sku}</span>
              </div>
              <div className="detail-item">
                <label>Штрихкод:</label>
                <span>{product.barcode || 'Не указан'}</span>
              </div>
              <div className="detail-item">
                <label>Категория:</label>
                <span>{product.category}</span>
              </div>
              <div className="detail-item">
                <label>Цена:</label>
                <span>₽{product.price.toFixed(2)}</span>
              </div>
              <div className="detail-item">
                <label>Текущее количество:</label>
                <span className="quantity-highlight">{product.quantity} шт.</span>
              </div>
              <div className="detail-item">
                <label>Зарезервировано:</label>
                <span className="quantity-reserved">{totalReserved} шт.</span>
              </div>
              <div className="detail-item">
                <label>Доступно для продажи:</label>
                <span className="quantity-available">{Math.max(0, product.quantity - totalReserved)} шт.</span>
              </div>
              <div className="detail-item">
                <label>Минимальное количество:</label>
                <span>{product.minQuantity} шт.</span>
              </div>
              <div className="detail-item">
                <label>Местоположение:</label>
                <span>{product.location || 'Не указано'}</span>
              </div>
            </div>
          </section>

          {/* Резервирования */}
          <section className="detail-section">
            <h3>Зарезервировано на заявки</h3>
            {loading ? (
              <p>Загрузка...</p>
            ) : reserved.length > 0 ? (
              <div className="reserved-table">
                <table>
                  <thead>
                    <tr>
                      <th>Заявка №</th>
                      <th>Площадка</th>
                      <th>Зарезервировано</th>
                      <th>Статус</th>
                      <th>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reserved.map((item, idx) => (
                      <tr key={idx}>
                        <td>REQ-{item.requestId}</td>
                        <td>Площадка {item.warehouseId}</td>
                        <td className="quantity-highlight">{item.quantity} шт.</td>
                        <td>
                          <span className="status-badge warning">
                            Ожидание
                          </span>
                        </td>
                        <td>{new Date(item.createdAt).toLocaleDateString('ru-RU')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-info">Заявок с данным товаром не найдено</p>
            )}
          </section>

          {/* Ожидающиеся поступления */}
          <section className="detail-section">
            <h3>Ожидающиеся поступления</h3>
            {loading ? (
              <p>Загрузка...</p>
            ) : incomingTransfers.length > 0 ? (
              <div className="incoming-table">
                <table>
                  <thead>
                    <tr>
                      <th>Заявка №</th>
                      <th>От</th>
                      <th>На</th>
                      <th>Количество</th>
                      <th>Статус</th>
                      <th>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomingTransfers.map((item, idx) => {
                      let statusLabel = '';
                      let statusClass = '';
                      const status = String(item.status).toLowerCase();
                      
                      if (status === 'в_пути' || status === 'in_transit') {
                        statusLabel = 'В пути';
                        statusClass = 'warning';
                      } else if (status === 'на_приемке' || status === 'on_reception') {
                        statusLabel = 'На приемке';
                        statusClass = 'info';
                      }
                      
                      return (
                        <tr key={idx}>
                          <td>REQ-{item.requestId}</td>
                          <td>{item.fromWarehouse}</td>
                          <td>{item.toWarehouse}</td>
                          <td className="quantity-highlight">{item.quantity} шт.</td>
                          <td>
                            <span className={`status-badge ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td>{new Date(item.createdAt).toLocaleDateString('ru-RU')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-info">Нет ожидающихся поступлений</p>
            )}
          </section>

          {/* История перемещений */}
          <section className="detail-section">
            <h3>История перемещений</h3>
            {loading ? (
              <p>Загрузка...</p>
            ) : transfers.length > 0 ? (
              <div className="transfers-table">
                <table>
                  <thead>
                    <tr>
                      <th>Номер</th>
                      <th>От</th>
                      <th>Куда</th>
                      <th>Количество</th>
                      <th>Получено</th>
                      <th>Статус</th>
                      <th>Дата</th>
                      <th>Завершено</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((item) => {
                      let statusLabel = '';
                      let statusClass = '';
                      
                      if (item.status === 'completed') {
                        statusLabel = item.receivedQuantity !== undefined ? 'Получено' : 'Отправлено';
                        statusClass = item.receivedQuantity !== undefined ? 'success' : 'info';
                      } else if (item.status === 'in_transit') {
                        statusLabel = 'В пути';
                        statusClass = 'warning';
                      } else {
                        statusLabel = 'Ожидание';
                        statusClass = 'secondary';
                      }
                      
                      return (
                        <tr key={item.id}>
                          <td>REQ-{item.id}</td>
                          <td>{item.fromWarehouse}</td>
                          <td>{item.toWarehouse}</td>
                          <td className="quantity-highlight">{item.quantity} шт.</td>
                          <td className="quantity-highlight">
                            {item.receivedQuantity !== undefined
                              ? `${item.receivedQuantity} шт.`
                              : '—'}
                          </td>
                          <td>
                            <span className={`status-badge ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td>
                            {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                          </td>
                          <td>
                            {item.receivedByUser?.username 
                              ? `${item.receivedByUser.username}` 
                              : item.receivedBy 
                              ? `Пользователь #${item.receivedBy}`
                              : (item.completedByUser?.username 
                                ? `${item.completedByUser.username}` 
                                : item.completedBy 
                                ? `Пользователь #${item.completedBy}`
                                : (item.cancelledByUser?.username 
                                  ? `Отклонено: ${item.cancelledByUser.username}`
                                  : item.cancelledBy
                                  ? `Отклонено: #${item.cancelledBy}`
                                  : '—'))}
                            {item.receivedAt && (
                              <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                                {new Date(new Date(item.receivedAt).getTime() + 3 * 60 * 60 * 1000).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                            {item.cancelledAt && (
                              <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                                {new Date(new Date(item.cancelledAt).getTime() + 3 * 60 * 60 * 1000).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-info">Нет истории перемещений</p>
            )}
          </section>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>

      <style>{`
        /* Light theme (default) */
        .detail-section {
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e0e0e0;
        }

        .detail-section:last-child {
          border-bottom: none;
        }

        .detail-section h3 {
          margin-bottom: 12px;
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
        }

        .detail-item label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          margin-bottom: 4px;
        }

        .detail-item span {
          font-size: 14px;
          color: #1a1a1a;
        }

        .quantity-highlight {
          font-weight: 600;
          color: #2563eb;
        }

        .quantity-reserved {
          font-weight: 600;
          color: #f59e0b;
        }

        .quantity-available {
          font-weight: 600;
          color: #10b981;
        }

        .reserved-table,
        .transfers-table,
        .incoming-table {
          overflow-x: auto;
        }

        .reserved-table table,
        .transfers-table table,
        .incoming-table table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .reserved-table thead,
        .transfers-table thead,
        .incoming-table thead {
          background-color: #f5f5f5;
          border-bottom: 2px solid #ddd;
        }

        .reserved-table th,
        .transfers-table th,
        .incoming-table th {
          padding: 8px;
          text-align: left;
          font-weight: 600;
          color: #666;
        }

        .reserved-table td,
        .transfers-table td,
        .incoming-table td {
          padding: 8px;
          border-bottom: 1px solid #e0e0e0;
          color: #1a1a1a;
        }

        .reserved-table tbody tr:hover,
        .transfers-table tbody tr:hover,
        .incoming-table tbody tr:hover {
          background-color: #f9f9f9;
        }

        .empty-info {
          padding: 20px;
          text-align: center;
          color: #999;
          font-size: 14px;
        }

        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.warning {
          background-color: #fff3cd;
          color: #856404;
        }

        .status-badge.success {
          background-color: #d4edda;
          color: #155724;
        }

        .status-badge.info {
          background-color: #d1ecf1;
          color: #0c5460;
        }

        .status-badge.secondary {
          background-color: #e2e3e5;
          color: #383d41;
        }

        /* Dark theme */
        :root.dark-theme .detail-section,
        [data-theme="dark"] .detail-section {
          border-bottom-color: #444;
        }

        :root.dark-theme .detail-section h3,
        [data-theme="dark"] .detail-section h3 {
          color: #e0e0e0 !important;
        }

        :root.dark-theme .detail-item label,
        [data-theme="dark"] .detail-item label {
          color: #aaa !important;
        }

        :root.dark-theme .detail-item span,
        [data-theme="dark"] .detail-item span {
          color: #e0e0e0 !important;
        }

        :root.dark-theme .quantity-highlight,
        [data-theme="dark"] .quantity-highlight {
          color: #64b5f6;
        }

        :root.dark-theme .quantity-reserved,
        [data-theme="dark"] .quantity-reserved {
          color: #fbbf24;
        }

        :root.dark-theme .quantity-available,
        [data-theme="dark"] .quantity-available {
          color: #34d399;
        }

        :root.dark-theme .reserved-table thead,
        :root.dark-theme .transfers-table thead,
        :root.dark-theme .incoming-table thead,
        [data-theme="dark"] .reserved-table thead,
        [data-theme="dark"] .transfers-table thead,
        [data-theme="dark"] .incoming-table thead {
          background-color: #2a2a2a;
          border-bottom-color: #444;
        }

        :root.dark-theme .reserved-table th,
        :root.dark-theme .transfers-table th,
        :root.dark-theme .incoming-table th,
        [data-theme="dark"] .reserved-table th,
        [data-theme="dark"] .transfers-table th,
        [data-theme="dark"] .incoming-table th {
          color: #aaa;
        }

        :root.dark-theme .reserved-table td,
        :root.dark-theme .transfers-table td,
        :root.dark-theme .incoming-table td,
        [data-theme="dark"] .reserved-table td,
        [data-theme="dark"] .transfers-table td,
        [data-theme="dark"] .incoming-table td {
          border-bottom-color: #444;
          color: #e0e0e0 !important;
        }

        :root.dark-theme .reserved-table tbody tr:hover,
        :root.dark-theme .transfers-table tbody tr:hover,
        :root.dark-theme .incoming-table tbody tr:hover,
        [data-theme="dark"] .reserved-table tbody tr:hover,
        [data-theme="dark"] .transfers-table tbody tr:hover,
        [data-theme="dark"] .incoming-table tbody tr:hover {
          background-color: #252525 !important;
        }

        :root.dark-theme .empty-info,
        [data-theme="dark"] .empty-info {
          color: #aaa;
        }

        :root.dark-theme .status-badge.warning,
        [data-theme="dark"] .status-badge.warning {
          background-color: #664d03;
          color: #ffecb5;
        }

        :root.dark-theme .status-badge.success,
        [data-theme="dark"] .status-badge.success {
          background-color: #1b5e20;
          color: #c8e6c9;
        }

        :root.dark-theme .status-badge.info,
        [data-theme="dark"] .status-badge.info {
          background-color: #01579b;
          color: #b3e5fc;
        }

        :root.dark-theme .status-badge.secondary,
        [data-theme="dark"] .status-badge.secondary {
          background-color: #424242;
          color: #bdbdbd;
        }
      `}</style>
    </div>
  );
};
