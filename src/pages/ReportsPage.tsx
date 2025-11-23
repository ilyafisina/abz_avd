import { useState, useEffect } from 'react';
import type { Product, CategorySummary } from '../types';
import { productService } from '../services/mockService';
import { useWarehouseFilter } from '../hooks/useWarehouseFilter';
import './Pages.css';

export const ReportsPage = () => {
  const { filterByWarehouse } = useWarehouseFilter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('inventory');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      const data = await productService.getProducts();
      const filtered = filterByWarehouse(data);
      setProducts(filtered);
      setLoading(false);
    };
    loadProducts();
  }, [filterByWarehouse]);

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
  const categories = Array.from(new Set(products.map(p => p.category)));

  const exportToCSV = () => {
    let csv = '';
    
    if (reportType === 'inventory') {
      csv = 'Название,SKU,Категория,Количество,Мин. кол-во,Место,Цена,Сумма\n';
      const filtered = selectedCategory === 'all' 
        ? products 
        : products.filter(p => p.category === selectedCategory);
      
      filtered.forEach(p => {
        const sum = p.quantity * p.price;
        csv += `"${p.name}","${p.sku}","${p.category}",${p.quantity},${p.minQuantity},"${p.location}",${p.price},${sum}\n`;
      });
    }

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `report_${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Загрузка отчётов...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Отчёты</h1>
        <p>Анализ данных склада и товаров</p>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>Тип отчёта</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="filter-select">
            <option value="inventory">Инвентарь товаров</option>
            <option value="category">По категориям</option>
            <option value="lowstock">Товары с низким запасом</option>
          </select>
        </div>
        {reportType === 'inventory' && (
          <div className="filter-group">
            <label>Категория</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="filter-select">
              <option value="all">Все категории</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
        <button className="filter-btn" onClick={exportToCSV}>Экспортировать CSV</button>
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
    </div>
  );
};
