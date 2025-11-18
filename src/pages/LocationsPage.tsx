import { useState, useEffect, useCallback } from 'react';
import type { Product } from '../types';
import { productService } from '../services/mockService';
import './Pages.css';

export const LocationsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState('');

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

  const locations = Array.from(locationMap.entries())
    .filter(([location]) => location.toLowerCase().includes(searchLocation.toLowerCase()))
    .sort((a, b) => a[0].localeCompare(b[0]));

  const getTotalValue = (products: Product[]) => {
    return products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  };

  const getTotalQuantity = (products: Product[]) => {
    return products.reduce((sum, p) => sum + p.quantity, 0);
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Загрузка местоположений...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📍 Управление местоположениями</h1>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Поиск по местоположению..."
          value={searchLocation}
          onChange={(e) => setSearchLocation(e.target.value)}
        />
      </div>

      <div className="locations-grid">
        {locations.length > 0 ? (
          locations.map(([location, locationProducts]) => (
            <div key={location} className="location-card">
              <div className="location-header">
                <h3>📦 {location}</h3>
                <div className="location-stats">
                  <span className="stat-badge">
                    {locationProducts.length} товар{locationProducts.length !== 1 ? 'ов' : ''}
                  </span>
                  <span className="stat-badge">
                    {getTotalQuantity(locationProducts)} ед.
                  </span>
                </div>
              </div>

              <div className="location-table">
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
                    {locationProducts.map((product) => (
                      <tr
                        key={product.id}
                        className={
                          product.quantity < product.minQuantity ? 'low-stock' : ''
                        }
                      >
                        <td className="product-name">{product.name}</td>
                        <td className="sku">{product.sku}</td>
                        <td>{product.category}</td>
                        <td className="quantity">{product.quantity}</td>
                        <td className="price">₽{product.price.toFixed(2)}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              product.quantity < product.minQuantity
                                ? 'alert'
                                : 'ok'
                            }`}
                          >
                            {product.quantity < product.minQuantity
                              ? '⚠️ Низкий'
                              : '✓ OK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="location-footer">
                <div className="footer-stat">
                  <span className="label">Общее количество:</span>
                  <span className="value">{getTotalQuantity(locationProducts)} ед.</span>
                </div>
                <div className="footer-stat">
                  <span className="label">Общая стоимость:</span>
                  <span className="value">₽{getTotalValue(locationProducts).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>📭 Местоположения не найдены</p>
          </div>
        )}
      </div>

      <div className="page-stats">
        <div className="stat-item">
          <span className="stat-label">Всего местоположений:</span>
          <span className="stat-value">{locations.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Товаров размещено:</span>
          <span className="stat-value">
            {locations.reduce((sum, [, locs]) => sum + locs.length, 0)}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Общая стоимость:</span>
          <span className="stat-value">
            ₽
            {locations
              .reduce((sum, [, locs]) => sum + getTotalValue(locs), 0)
              .toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
