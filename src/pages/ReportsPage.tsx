import { useState, useEffect } from 'react';
import type { Product, CategorySummary, Warehouse } from '../types';
import { productService, mockWarehouses } from '../services/mockService';
import { useAuth } from '../contexts/useAuth';
import './Pages.css';
import jsPDF from 'jspdf';

export const ReportsPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('inventory');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userWarehouse, setUserWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      const data = await productService.getProducts();
      
      // Фильтруем по площадке пользователя
      let filtered = data;
      if (user && user.role !== 'admin' && user.warehouse) {
        // Менеджер и складовщик видят только свою площадку
        filtered = data.filter(p => p.warehouse === user.warehouse);
        
        // Находим информацию о площадке пользователя
        const warehouse = mockWarehouses.find(w => w.id === user.warehouse);
        setUserWarehouse(warehouse || null);
      } else if (user?.role === 'admin') {
        // Админ видит все, но мы можем показать информацию о выбранной площадке
        setUserWarehouse(null);
      }
      
      setProducts(filtered);
      setLoading(false);
    };
    loadProducts();
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

  const exportToPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let currentY = 15;
    const pageMargin = 15;
    const colWidth = (pageWidth - 2 * pageMargin) / 8;

    // Заголовок
    pdf.setFontSize(16);
    pdf.text('Отчёт о товарах', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Информация о площадке (если не админ)
    if (userWarehouse) {
      pdf.setFontSize(10);
      pdf.text(`Площадка: ${userWarehouse.name}`, pageMargin, currentY);
      pdf.text(`Адрес: ${userWarehouse.location}`, pageMargin, currentY + 5);
      currentY += 15;
    }

    // Дата создания отчёта
    pdf.setFontSize(9);
    pdf.text(`Дата создания: ${new Date().toLocaleDateString('ru-RU')}`, pageMargin, currentY);
    currentY += 8;

    if (reportType === 'inventory') {
      const filtered = selectedCategory === 'all' 
        ? products 
        : products.filter(p => p.category === selectedCategory);

      // Таблица
      pdf.setFontSize(9);
      
      // Заголовок таблицы
      pdf.setFillColor(200, 200, 200);
      pdf.setFontSize(8);
      const headers = ['Название', 'SKU', 'Категория', 'Кол-во', 'Мин.', 'Место', 'Цена', 'Сумма'];
      let x = pageMargin;
      headers.forEach(header => {
        pdf.rect(x, currentY, colWidth, 5, 'F');
        pdf.text(header, x + 1, currentY + 3.5, { maxWidth: colWidth - 2 });
        x += colWidth;
      });
      currentY += 5;

      // Строки данных
      filtered.forEach(p => {
        const sum = p.quantity * p.price;
        const row = [p.name, p.sku, p.category, p.quantity.toString(), p.minQuantity.toString(), p.location, `₽${p.price}`, `₽${sum}`];
        
        if (currentY > pageHeight - pageMargin - 10) {
          pdf.addPage();
          currentY = pageMargin;
        }

        x = pageMargin;
        row.forEach((cell) => {
          pdf.text(cell, x + 1, currentY + 3.5, { maxWidth: colWidth - 2 });
          pdf.rect(x, currentY, colWidth, 5);
          x += colWidth;
        });
        currentY += 5;
      });
    } else if (reportType === 'category') {
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

      pdf.setFontSize(8);
      
      // Заголовок таблицы
      pdf.setFillColor(200, 200, 200);
      const headers = ['Категория', 'Товаров', 'Общее кол-во', 'Общая стоимость', 'Средн. стоимость'];
      const colW = (pageWidth - 2 * pageMargin) / headers.length;
      let x = pageMargin;
      headers.forEach(header => {
        pdf.rect(x, currentY, colW, 5, 'F');
        pdf.text(header, x + 1, currentY + 3.5, { maxWidth: colW - 2 });
        x += colW;
      });
      currentY += 5;

      // Строки данных
      Object.values(categoryStats).forEach(cat => {
        const row = [cat.category, cat.productCount.toString(), cat.totalQuantity.toString(), `₽${cat.totalValue}`, `₽${(cat.totalValue / cat.productCount).toFixed(2)}`];
        
        if (currentY > pageHeight - pageMargin - 10) {
          pdf.addPage();
          currentY = pageMargin;
        }

        x = pageMargin;
        row.forEach((cell) => {
          pdf.text(cell, x + 1, currentY + 3.5, { maxWidth: colW - 2 });
          pdf.rect(x, currentY, colW, 5);
          x += colW;
        });
        currentY += 5;
      });
    } else if (reportType === 'lowstock') {
      const lowStockItems = products.filter(p => p.quantity <= p.minQuantity);

      if (lowStockItems.length > 0) {
        pdf.setFontSize(8);
        
        // Заголовок таблицы
        pdf.setFillColor(200, 200, 200);
        const headers = ['Название', 'SKU', 'Категория', 'Текущее', 'Минимум', 'Дефицит', 'Место'];
        const colW = (pageWidth - 2 * pageMargin) / headers.length;
        let x = pageMargin;
        headers.forEach(header => {
          pdf.rect(x, currentY, colW, 5, 'F');
          pdf.text(header, x + 1, currentY + 3.5, { maxWidth: colW - 2 });
          x += colW;
        });
        currentY += 5;

        // Строки данных
        lowStockItems.forEach(product => {
          const row = [product.name, product.sku, product.category, product.quantity.toString(), product.minQuantity.toString(), (product.minQuantity - product.quantity).toString(), product.location];
          
          if (currentY > pageHeight - pageMargin - 10) {
            pdf.addPage();
            currentY = pageMargin;
          }

          x = pageMargin;
          row.forEach((cell) => {
            pdf.text(cell, x + 1, currentY + 3.5, { maxWidth: colW - 2 });
            pdf.rect(x, currentY, colW, 5);
            x += colW;
          });
          currentY += 5;
        });
      } else {
        pdf.setFontSize(12);
        pdf.text('Все товары имеют достаточный запас', pageMargin, currentY);
      }
    }

    // Добавляем номер страницы
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(
        `Стр. ${i} из ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    pdf.save(`report_${new Date().toISOString().split('T')[0]}.pdf`);
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
              {Array.from(new Set(products.map(p => p.category))).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
        <button className="filter-btn" onClick={exportToPDF}>Экспортировать PDF</button>
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
