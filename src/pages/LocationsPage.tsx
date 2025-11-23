import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/useAuth';
import type { Product } from '../types';
import { productService } from '../services/mockService';
import './Pages.css';

interface Warehouse {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  area: string;
  capacity: number;
  usedCapacity: number;
}

interface WarehouseUser {
  id: string;
  username: string;
  role: string;
  status: 'active' | 'inactive';
  lastSeen: string;
}

interface Movement {
  id: string;
  product: string;
  from: string;
  to: string;
  quantity: number;
  date: string;
  performer: string;
}

export const LocationsPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Фильтры товаров
  const [productFilters, setProductFilters] = useState({
    status: 'all', // 'all', 'low', 'ok'
    priceMin: '',
    priceMax: '',
    quantity: '', // 'all', 'low', 'high'
    searchProduct: '',
  });

  // Моковые данные площадок
  const warehouses: Warehouse[] = [
    {
      id: 'zone-a',
      name: 'Площадка А',
      address: 'ул. Логистическая, д. 1, Москва',
      phone: '+7 (495) 123-45-67',
      manager: 'Иван Петров',
      area: 'Зона A',
      capacity: 10000,
      usedCapacity: 7500,
    },
    {
      id: 'zone-b',
      name: 'Площадка Б',
      address: 'ул. Промышленная, д. 42, СПб',
      phone: '+7 (812) 987-65-43',
      manager: 'Мария Сидорова',
      area: 'Зона B',
      capacity: 8000,
      usedCapacity: 5200,
    },
    {
      id: 'zone-c',
      name: 'Площадка В',
      address: 'ул. Торговая, д. 15, Казань',
      phone: '+7 (843) 555-22-11',
      manager: 'Петр Иванов',
      area: 'Зона C',
      capacity: 6000,
      usedCapacity: 3800,
    },
  ];

  // Мок-данные пользователей площадок
  const getWarehouseUsers = (warehouseId: string): WarehouseUser[] => {
    const usersMap: Record<string, WarehouseUser[]> = {
      'zone-a': [
        { id: '1', username: 'Иван Петров', role: 'manager', status: 'active', lastSeen: '2025-11-23 14:32' },
        { id: '2', username: 'Алексей Морозов', role: 'warehouseman', status: 'active', lastSeen: '2025-11-23 15:10' },
        { id: '3', username: 'Сергей Ковалов', role: 'warehouseman', status: 'inactive', lastSeen: '2025-11-22 18:45' },
      ],
      'zone-b': [
        { id: '4', username: 'Мария Сидорова', role: 'manager', status: 'active', lastSeen: '2025-11-23 14:20' },
        { id: '5', username: 'Татьяна Волкова', role: 'warehouseman', status: 'active', lastSeen: '2025-11-23 16:05' },
      ],
      'zone-c': [
        { id: '6', username: 'Петр Иванов', role: 'manager', status: 'active', lastSeen: '2025-11-23 13:50' },
        { id: '7', username: 'Николай Сорокин', role: 'warehouseman', status: 'active', lastSeen: '2025-11-23 15:55' },
        { id: '8', username: 'Владимир Чехов', role: 'warehouseman', status: 'inactive', lastSeen: '2025-11-21 10:20' },
      ],
    };
    return usersMap[warehouseId] || [];
  };

  // Мок-данные перемещений товаров
  const getWarehouseMovements = (warehouseArea: string): Movement[] => {
    const movementsMap: Record<string, Movement[]> = {
      'Зона A': [
        { id: 'm1', product: 'Кровельные листы', from: 'Зона A', to: 'Зона B', quantity: 50, date: '2025-11-23 10:15', performer: 'Алексей Морозов' },
        { id: 'm2', product: 'Краска акриловая', from: 'Зона A', to: 'Зона C', quantity: 30, date: '2025-11-23 09:30', performer: 'Сергей Ковалов' },
        { id: 'm3', product: 'Стеклоткань', from: 'Зона B', to: 'Зона A', quantity: 20, date: '2025-11-22 16:45', performer: 'Татьяна Волкова' },
      ],
      'Зона B': [
        { id: 'm4', product: 'Щебень фракция 20-40', from: 'Зона B', to: 'Зона A', quantity: 100, date: '2025-11-23 08:20', performer: 'Татьяна Волкова' },
        { id: 'm5', product: 'Песок строительный', from: 'Зона C', to: 'Зона B', quantity: 80, date: '2025-11-22 14:10', performer: 'Николай Сорокин' },
      ],
      'Зона C': [
        { id: 'm6', product: 'Цемент портландский', from: 'Зона A', to: 'Зона C', quantity: 60, date: '2025-11-23 11:05', performer: 'Иван Петров' },
        { id: 'm7', product: 'Металлическая арматура', from: 'Зона C', to: 'Зона B', quantity: 45, date: '2025-11-22 13:25', performer: 'Владимир Чехов' },
      ],
    };
    return movementsMap[warehouseArea] || [];
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const data = await productService.getProducts();
    setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Группировка по местоположениям
  const locationMap = new Map<string, Product[]>();
  products.forEach((product) => {
    if (product.location) {
      if (!locationMap.has(product.location)) {
        locationMap.set(product.location, []);
      }
      locationMap.get(product.location)!.push(product);
    }
  });

  const isAdmin = user?.role === 'admin';
  const canEdit = isAdmin;

  const getTotalValue = (products: Product[]) => {
    return products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  };

  const getTotalQuantity = (products: Product[]) => {
    return products.reduce((sum, p) => sum + p.quantity, 0);
  };

  const getWarehouseProducts = (warehouseArea: string) => {
    return locationMap.get(warehouseArea) || [];
  };

  const filterWarehouseProducts = (products: Product[]) => {
    return products.filter((product) => {
      // Фильтр по статусу (низкий/ок)
      if (productFilters.status !== 'all') {
        const isLowStock = product.quantity < product.minQuantity;
        if (productFilters.status === 'low' && !isLowStock) return false;
        if (productFilters.status === 'ok' && isLowStock) return false;
      }

      // Фильтр по цене
      if (productFilters.priceMin) {
        const min = parseFloat(productFilters.priceMin);
        if (product.price < min) return false;
      }
      if (productFilters.priceMax) {
        const max = parseFloat(productFilters.priceMax);
        if (product.price > max) return false;
      }

      // Фильтр по количеству
      if (productFilters.quantity !== 'all') {
        if (productFilters.quantity === 'low' && product.quantity > 50) return false;
        if (productFilters.quantity === 'high' && product.quantity <= 50) return false;
      }

      // Поиск по названию/SKU
      if (productFilters.searchProduct) {
        const search = productFilters.searchProduct.toLowerCase();
        const nameMatch = product.name.toLowerCase().includes(search);
        const skuMatch = product.sku.toLowerCase().includes(search);
        if (!nameMatch && !skuMatch) return false;
      }

      return true;
    });
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Загрузка площадок...</div></div>;
  }

  // Если выбрана площадка - показываем детальный вид
  if (selectedWarehouse) {
    const warehouse = warehouses.find(w => w.id === selectedWarehouse);
    if (!warehouse) return null;

    const warehouseProducts = getWarehouseProducts(warehouse.area);

    return (
      <div className="page-container">
        <div className="page-header">
          <button 
            onClick={() => setSelectedWarehouse(null)}
            className="btn-secondary"
            style={{ marginBottom: '16px' }}
          >
            ← Назад к площадкам
          </button>
          <h1>{warehouse.name}</h1>
          <p>Детальная информация и управление</p>
        </div>

        <div className="two-col-grid">
          {/* Информация о площадке */}
          <div className="card-plain">
            <div className="justify-space">
              <h3 className="no-margin">Информация о площадке</h3>
              {canEdit && (
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={isEditing ? 'btn-secondary' : 'btn-primary'}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  {isEditing ? 'Отмена' : 'Редактировать'}
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="location-info">
                <div className="info-row">
                  <span className="label">Адрес:</span>
                  <span className="value">{warehouse.address}</span>
                </div>
                <div className="info-row">
                  <span className="label">Телефон:</span>
                  <span className="value">{warehouse.phone}</span>
                </div>
                <div className="info-row">
                  <span className="label">Ответственный:</span>
                  <span className="value">{warehouse.manager}</span>
                </div>
                <div className="info-row">
                  <span className="label">Зона:</span>
                  <span className="value">{warehouse.area}</span>
                </div>
                <div className="info-row">
                  <span className="label">Емкость:</span>
                  <span className="value">{warehouse.usedCapacity} / {warehouse.capacity} м³</span>
                </div>
                <div className="capacity-bar">
                  <div 
                    className="capacity-used"
                    style={{ width: `${(warehouse.usedCapacity / warehouse.capacity) * 100}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <form className="edit-form" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Адрес</label>
                  <input type="text" defaultValue={warehouse.address} />
                </div>
                <div className="form-group">
                  <label>Телефон</label>
                  <input type="tel" defaultValue={warehouse.phone} />
                </div>
                <div className="form-group">
                  <label>Ответственный менеджер</label>
                  <input type="text" defaultValue={warehouse.manager} />
                </div>
                <div className="form-group">
                  <label>Максимальная емкость (м³)</label>
                  <input type="number" defaultValue={warehouse.capacity} />
                </div>
                <button type="button" onClick={() => setIsEditing(false)} className="btn-primary" style={{ width: '100%' }}>
                  Сохранить изменения
                </button>
              </form>
            )}
          </div>

          {/* Статистика */}
          <div className="card-plain">
            <h3 className="no-margin">Статистика</h3>
            <div className="flex-col-gap">
              <div className="stat-card info">
                <p className="muted-small">Товаров на площадке</p>
                <p className="bold" style={{ fontSize: '24px' }}>{warehouseProducts.length}</p>
              </div>
              <div className="stat-card info">
                <p className="muted-small">Общее количество единиц</p>
                <p className="bold" style={{ fontSize: '24px' }}>{getTotalQuantity(warehouseProducts)}</p>
              </div>
              <div className="stat-card info">
                <p className="muted-small">Общая стоимость</p>
                <p className="bold" style={{ fontSize: '20px' }}>₽{getTotalValue(warehouseProducts).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Товары площадки */}
        <div className="card-plain" style={{ marginTop: '20px' }}>
          <h3 className="no-margin">Товары и материалы</h3>
          
          {/* Фильтры товаров */}
          <div className="filter-controls" style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--surface-secondary)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div className="filter-group">
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Поиск товара</label>
                <input
                  type="text"
                  placeholder="Название или SKU..."
                  value={productFilters.searchProduct}
                  onChange={(e) => setProductFilters({ ...productFilters, searchProduct: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>
              
              <div className="filter-group">
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Статус</label>
                <select
                  value={productFilters.status}
                  onChange={(e) => setProductFilters({ ...productFilters, status: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                >
                  <option value="all">Все</option>
                  <option value="ok">Норма</option>
                  <option value="low">Низкий запас</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Количество</label>
                <select
                  value={productFilters.quantity}
                  onChange={(e) => setProductFilters({ ...productFilters, quantity: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                >
                  <option value="all">Все</option>
                  <option value="low">до 50</option>
                  <option value="high">более 50</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Мин. цена (₽)</label>
                <input
                  type="number"
                  placeholder="От"
                  value={productFilters.priceMin}
                  onChange={(e) => setProductFilters({ ...productFilters, priceMin: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>
              
              <div className="filter-group">
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Макс. цена (₽)</label>
                <input
                  type="number"
                  placeholder="До"
                  value={productFilters.priceMax}
                  onChange={(e) => setProductFilters({ ...productFilters, priceMax: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>
              
              <div className="filter-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={() => setProductFilters({ status: 'all', priceMin: '', priceMax: '', quantity: 'all', searchProduct: '' })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--surface-primary)', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer' }}
                >
                  Очистить
                </button>
              </div>
            </div>
          </div>
          
          {warehouseProducts.length > 0 ? (
            <div className="location-table" style={{ marginTop: '16px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th>SKU</th>
                    <th>Категория</th>
                    <th>Кол-во</th>
                    <th>Цена</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filterWarehouseProducts(warehouseProducts).length > 0 ? (
                    filterWarehouseProducts(warehouseProducts).map((product) => (
                      <tr
                        key={product.id}
                        className={product.quantity < product.minQuantity ? 'low-stock' : ''}
                      >
                        <td className="product-name">{product.name}</td>
                        <td className="sku">{product.sku}</td>
                        <td>{product.category}</td>
                        <td className="quantity">{product.quantity}</td>
                        <td className="price">₽{product.price.toFixed(2)}</td>
                        <td>
                          <span className={`status-badge ${product.quantity < product.minQuantity ? 'alert' : 'ok'}`}>
                            {product.quantity < product.minQuantity ? 'Низкий' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="muted-small" style={{ textAlign: 'center', padding: '16px' }}>Товары не найдены по выбранным фильтрам</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted-small">Товаров не найдено</p>
          )}
        </div>

        {/* Для администратора - дополнительная информация */}
        {isAdmin && (
          <>
            <div className="card-plain" style={{ marginTop: '20px' }}>
              <h3 className="no-margin">Пользователи площадки</h3>
              <div className="users-table" style={{ marginTop: '16px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Пользователь</th>
                      <th>Роль</th>
                      <th>Статус</th>
                      <th>Последний раз видели</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getWarehouseUsers(selectedWarehouse!).map((warehouseUser) => (
                      <tr key={warehouseUser.id}>
                        <td><strong>{warehouseUser.username}</strong></td>
                        <td>
                          <span className={`role-badge role-${warehouseUser.role}`}>
                            {warehouseUser.role === 'manager' ? 'Менеджер' : 'Складовщик'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${warehouseUser.status === 'active' ? 'ok' : 'inactive'}`}>
                            {warehouseUser.status === 'active' ? 'Активен' : 'Неактивен'}
                          </span>
                        </td>
                        <td className="muted-small">{warehouseUser.lastSeen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card-plain" style={{ marginTop: '20px' }}>
              <h3 className="no-margin">История перемещений товаров</h3>
              <p className="muted-small" style={{ marginTop: '8px', marginBottom: '12px' }}>Перемещения товаров с этой площадки за последние 30 дней</p>
              <div className="movements-table" style={{ marginTop: '16px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Товар</th>
                      <th>Из</th>
                      <th>В</th>
                      <th>Кол-во</th>
                      <th>Дата и время</th>
                      <th>Выполнил</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getWarehouseMovements(warehouse.area).map((movement) => (
                      <tr key={movement.id}>
                        <td><strong>{movement.product}</strong></td>
                        <td className="muted-small">{movement.from}</td>
                        <td className="muted-small">{movement.to}</td>
                        <td><strong>{movement.quantity} ед.</strong></td>
                        <td className="muted-small">{movement.date}</td>
                        <td>{movement.performer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Главный вид - список всех площадок
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Управление площадками</h1>
        <p>Информация о всех складских площадках и их товарах</p>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Поиск по названию площадки..."
          value={searchLocation}
          onChange={(e) => setSearchLocation(e.target.value)}
        />
      </div>

      <div className="warehouses-grid">
        {warehouses
          .filter(w => w.name.toLowerCase().includes(searchLocation.toLowerCase()) || 
                       w.address.toLowerCase().includes(searchLocation.toLowerCase()))
          .map((warehouse) => {
            const warehouseProducts = getWarehouseProducts(warehouse.area);
            return (
              <div key={warehouse.id} className="warehouse-card">
                <div className="warehouse-header">
                  <h3>{warehouse.name}</h3>
                  <span className="area-badge">{warehouse.area}</span>
                </div>

                <div className="warehouse-info">
                  <p><strong>Адрес:</strong> {warehouse.address}</p>
                  <p><strong>Телефон:</strong> {warehouse.phone}</p>
                  <p><strong>Ответственный:</strong> {warehouse.manager}</p>
                </div>

                <div className="warehouse-capacity">
                  <div className="capacity-label">
                    <span>Использование емкости</span>
                    <span className="capacity-percent">
                      {((warehouse.usedCapacity / warehouse.capacity) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="capacity-bar">
                    <div 
                      className="capacity-used"
                      style={{ width: `${(warehouse.usedCapacity / warehouse.capacity) * 100}%` }}
                    ></div>
                  </div>
                  <div className="capacity-text">
                    {warehouse.usedCapacity} / {warehouse.capacity} м³
                  </div>
                </div>

                <div className="warehouse-stats">
                  <div className="stat">
                    <span className="stat-label">Товаров</span>
                    <span className="stat-num">{warehouseProducts.length}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Единиц</span>
                    <span className="stat-num">{getTotalQuantity(warehouseProducts)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Стоимость</span>
                    <span className="stat-num">₽{getTotalValue(warehouseProducts).toFixed(0)}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedWarehouse(warehouse.id)}
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  Подробнее
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
};
