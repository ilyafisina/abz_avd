import { useState, useEffect } from 'react';
import type { Product, CategorySummary, Warehouse, Request, User } from '../types';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/useAuth';
import './Pages.css';
import * as XLSX from 'xlsx';

export const ReportsPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('inventory');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [userWarehouse, setUserWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [productsData, requestsData, usersData, warehousesData] = await Promise.all([
        apiService.getProducts(),
        apiService.getRequests(),
        apiService.getUsers?.() || Promise.resolve([]),
        apiService.getWarehouses?.() || Promise.resolve([]),
      ]);

      // Фильтруем по площадке пользователя
      let filteredProducts = productsData;
      let filteredRequests = requestsData;

      if (user && user.role !== 'admin') {
        const warehouseId = user.warehouseId || (typeof user.warehouse === 'object' ? (user.warehouse as Warehouse).id : user.warehouse);
        filteredProducts = productsData.filter(p => {
          const pWarehouseId = typeof p.warehouse === 'object' ? (p.warehouse as Warehouse).id : p.warehouse;
          return p.warehouseId === warehouseId || pWarehouseId === warehouseId;
        });
        filteredRequests = requestsData.filter(r => {
          const rWarehouseId = typeof r.warehouse === 'object' ? (r.warehouse as Warehouse).id : r.warehouse;
          return r.warehouseId === warehouseId || rWarehouseId === warehouseId;
        });

        const warehouse = warehousesData.find(w => w.id === warehouseId);
        setUserWarehouse(warehouse || null);
      }

      setProducts(filteredProducts);
      setRequests(filteredRequests);
      setUsers(usersData);
      setLoading(false);
    };
    loadData();
  }, [user]);

  const calculateStats = () => {
    let filtered = products;
    if (selectedCategory !== 'all') {
      filtered = products.filter(p => p.category === selectedCategory);
    }

    const totalProducts = filtered.length;
    const totalQuantity = filtered.reduce((sum, p) => sum + p.quantity, 0);
    const totalValue = filtered.reduce((sum, p) => sum + (p.quantity * p.price), 0);
    const lowStockItems = filtered.filter(p => p.quantity <= p.minQuantity);

    // Группировка по категориям
    const categoryStats: { [key: string]: CategorySummary } = {};
    products.forEach(p => {
      if (!categoryStats[p.category]) {
        categoryStats[p.category] = {
          category: p.category,
          productCount: 0,
          totalQuantity: 0,
          totalValue: 0,
        };
      }
      categoryStats[p.category].productCount += 1;
      categoryStats[p.category].totalQuantity += p.quantity;
      categoryStats[p.category].totalValue += p.quantity * p.price;
    });

    return {
      totalProducts,
      totalQuantity,
      totalValue,
      lowStockItems,
      categoryStats: Object.values(categoryStats),
      filteredCount: filtered.length,
    };
  };

  const stats = calculateStats();

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const sheets: { [key: string]: unknown[][] } = {};

    // Определяем какие данные экспортировать в зависимости от типа отчёта
    if (reportType === 'inventory' || reportType === 'full') {
      const productsData = (selectedCategory === 'all' 
        ? products 
        : products.filter(p => p.category === selectedCategory)
      ).map(p => ({
        'Название': p.name,
        'SKU': p.sku,
        'Категория': p.category,
        'Количество': p.quantity,
        'Минимум': p.minQuantity,
        'Место': p.location,
        'Цена': p.price,
        'Сумма': p.quantity * p.price,
      }));

      sheets['Товары'] = [
        Object.keys(productsData[0] || {}),
        ...productsData.map(p => Object.values(p)),
      ];
    }

    if (reportType === 'transfers' || reportType === 'full') {
      let filteredRequests = requests;
      if (dateFrom) {
        filteredRequests = filteredRequests.filter(r => 
          new Date(r.createdAt) >= new Date(dateFrom)
        );
      }
      if (dateTo) {
        filteredRequests = filteredRequests.filter(r => 
          new Date(r.createdAt) <= new Date(dateTo)
        );
      }

      const transfersData = filteredRequests.map(r => {
        const creator = users.find(u => u.id === r.createdBy || u.id === (r as Request & { userId: string }).userId);
        return {
          'ID': r.id,
          'Статус': r.status,
          'Дата создания': new Date(r.createdAt).toLocaleDateString('ru-RU'),
          'Создал': creator ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() : 'Неизвестно',
          'Примечание': (r as Request & { notes: string }).notes || '-',
        };
      });

      sheets['Перемещения'] = [
        transfersData.length > 0 ? Object.keys(transfersData[0]) : [],
        ...transfersData.map(t => Object.values(t)),
      ];
    }

    if (reportType === 'category' || reportType === 'full') {
      const categoryData = stats.categoryStats.map(cat => ({
        'Категория': cat.category,
        'Товаров': cat.productCount,
        'Общее кол-во': cat.totalQuantity,
        'Общая стоимость': cat.totalValue,
        'Средняя стоимость': (cat.totalValue / cat.productCount).toFixed(2),
      }));

      sheets['Категории'] = [
        Object.keys(categoryData[0] || {}),
        ...categoryData.map(c => Object.values(c)),
      ];
    }

    if (reportType === 'lowstock' || reportType === 'full') {
      const lowStockData = stats.lowStockItems.map(p => ({
        'Название': p.name,
        'SKU': p.sku,
        'Категория': p.category,
        'Текущее': p.quantity,
        'Минимум': p.minQuantity,
        'Дефицит': p.minQuantity - p.quantity,
        'Место': p.location,
      }));

      sheets['Критические запасы'] = [
        Object.keys(lowStockData[0] || {}),
        ...lowStockData.map(l => Object.values(l)),
      ];
    }

    if (reportType === 'users' || reportType === 'full') {
      const usersData = users.map(u => ({
        'ФИО': `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        'Логин': u.username,
        'Роль': u.role,
        'Email': u.email || '-',
      }));

      sheets['Пользователи'] = [
        Object.keys(usersData[0] || {}),
        ...usersData.map(u => Object.values(u)),
      ];
    }

    // Создаём рабочую книгу
    Object.entries(sheets).forEach(([sheetName, data]) => {
      const ws = XLSX.utils.aoa_to_sheet(data as unknown[][]);

      // Устанавливаем ширину колонок
      const colWidths = (data[0] as unknown[]).map((_, idx) => {
        const maxLength = Math.max(
          ...(data as unknown[][]).map(row => 
            String(row[idx] || '').length
          )
        );
        return maxLength + 2;
      });
      ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w, 50) }));

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Сохраняем файл
    const fileName = `report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Загрузка отчётов...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Отчёты</h1>
        <p>{userWarehouse ? `Площадка: ${userWarehouse.name}` : 'Анализ данных склада и товаров'}</p>
      </div>

      <div className="report-controls">
        <div className="control-section">
          <h3>Выбор отчёта</h3>
          <div className="filter-group">
            <label>Тип отчёта</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="filter-select">
              <option value="inventory">Инвентарь товаров</option>
              <option value="transfers">Перемещения</option>
              <option value="category">По категориям</option>
              <option value="lowstock">Товары с низким запасом</option>
              <option value="users">Пользователи</option>
              <option value="full">Полный отчёт (все данные)</option>
            </select>
          </div>

          {reportType === 'inventory' && (
            <div className="filter-group">
              <label>Категория</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="filter-select">
                <option value="all">Все категории</option>
                {Array.from(new Set(products.map(p => p.category))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'transfers' && (
            <>
              <div className="filter-group">
                <label>Дата от</label>
                <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)} 
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label>Дата до</label>
                <input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)} 
                  className="filter-input"
                />
              </div>
            </>
          )}
        </div>

        <div className="control-section">
          <h3>Экспорт</h3>
          <div className="button-group">
            <button className="btn btn-primary" onClick={exportToExcel}>
              📊 Экспорт в Excel
            </button>
          </div>
        </div>
      </div>

      {reportType === 'inventory' && (
        <>
          <div className="page-stats">
            <div className="stat-item">
              <span className="stat-label">Товаров в отчёте:</span>
              <span className="stat-value">{stats.filteredCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Общее кол-во:</span>
              <span className="stat-value">{stats.totalQuantity}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Общая стоимость:</span>
              <span className="stat-value">{(stats.totalValue / 1000).toFixed(1)}k ₽</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Критические запасы:</span>
              <span className="stat-value danger-text">{stats.lowStockItems.length}</span>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>SKU</th>
                  <th>Категория</th>
                  <th>Кол-во</th>
                  <th>Мин.</th>
                  <th>Место</th>
                  <th>Цена</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {(selectedCategory === 'all' ? products : products.filter(p => p.category === selectedCategory)).map(product => {
                  const isLowStock = product.quantity <= product.minQuantity;
                  const sum = product.quantity * product.price;
                  return (
                    <tr key={product.id} className={isLowStock ? 'low-stock' : ''}>
                      <td>{product.name}</td>
                      <td>{product.sku}</td>
                      <td>{product.category}</td>
                      <td>{product.quantity}</td>
                      <td>{product.minQuantity}</td>
                      <td>{product.location}</td>
                      <td>₽{product.price.toLocaleString()}</td>
                      <td>₽{sum.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {reportType === 'transfers' && (
        <>
          <div className="page-stats">
            <div className="stat-item">
              <span className="stat-label">Всего перемещений:</span>
              <span className="stat-value">{requests.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Ожидают подтверждения:</span>
              <span className="stat-value">{requests.filter(r => r.status === 'pending').length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Завершённых:</span>
              <span className="stat-value">{requests.filter(r => r.status === 'completed').length}</span>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th>Создал</th>
                  <th>Примечание</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => {
                  const creator = users.find(u => u.id === r.createdBy || u.id === (r as Request & { userId: string }).userId);
                  return (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                      <td>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</td>
                      <td>{creator ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() : 'Неизвестно'}</td>
                      <td>{(r as Request & { notes: string }).notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {reportType === 'category' && (
        <>
          <div className="page-stats">
            <div className="stat-item">
              <span className="stat-label">Категорий:</span>
              <span className="stat-value">{stats.categoryStats.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Всего товаров:</span>
              <span className="stat-value">{stats.totalProducts}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Общее кол-во:</span>
              <span className="stat-value">{stats.totalQuantity}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Общая стоимость:</span>
              <span className="stat-value">{(stats.totalValue / 1000).toFixed(1)}k ₽</span>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Категория</th>
                  <th>Товаров</th>
                  <th>Общее кол-во</th>
                  <th>Общая стоимость</th>
                  <th>Средн. стоимость товара</th>
                </tr>
              </thead>
              <tbody>
                {stats.categoryStats.map(cat => (
                  <tr key={cat.category}>
                    <td>{cat.category}</td>
                    <td>{cat.productCount}</td>
                    <td>{cat.totalQuantity}</td>
                    <td>₽{cat.totalValue.toLocaleString()}</td>
                    <td>₽{(cat.totalValue / cat.productCount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {reportType === 'lowstock' && (
        <>
          <div className="page-stats">
            <div className="stat-item">
              <span className="stat-label">Критических товаров:</span>
              <span className="stat-value danger-text">{stats.lowStockItems.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Всего товаров:</span>
              <span className="stat-value">{stats.totalProducts}</span>
            </div>
          </div>

          {stats.lowStockItems.length > 0 ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>SKU</th>
                    <th>Категория</th>
                    <th>Текущее</th>
                    <th>Минимум</th>
                    <th>Дефицит</th>
                    <th>Место</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.lowStockItems.map(product => (
                    <tr key={product.id} className="low-stock">
                      <td>{product.name}</td>
                      <td>{product.sku}</td>
                      <td>{product.category}</td>
                      <td>{product.quantity}</td>
                      <td>{product.minQuantity}</td>
                      <td className="deficit-cell">-{(product.minQuantity - product.quantity)}</td>
                      <td>{product.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>Все товары имеют достаточный запас</p>
            </div>
          )}
        </>
      )}

      {reportType === 'users' && (
        <>
          <div className="page-stats">
            <div className="stat-item">
              <span className="stat-label">Всего пользователей:</span>
              <span className="stat-value">{users.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Администраторов:</span>
              <span className="stat-value">{users.filter(u => u.role === 'admin').length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Менеджеров:</span>
              <span className="stat-value">{users.filter(u => u.role === 'manager').length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Складовщиков:</span>
              <span className="stat-value">{users.filter(u => u.role === 'warehouseman').length}</span>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Логин</th>
                  <th>Роль</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{`${u.firstName || ''} ${u.lastName || ''}`.trim()}</td>
                    <td>{u.username}</td>
                    <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                    <td>{u.email || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {reportType === 'full' && (
        <div className="full-report">
          <p className="info-text">
            Полный отчёт содержит все данные и будет экспортирован в Excel с несколькими листами:
            Товары, Перемещения, Категории, Критические запасы и Пользователи.
          </p>
        </div>
      )}
    </div>
  );
};
