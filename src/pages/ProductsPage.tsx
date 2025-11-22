import { useState, useEffect } from 'react';
import type { Product } from '../types';
import { productService } from '../services/mockService';
import { useAuth } from '../contexts/useAuth';
import { useWarehouseFilter } from '../hooks/useWarehouseFilter';
import { QRScanner } from '../components/QRScanner';
import '../components/QRScanner.css';
import './Pages.css';

export const ProductsPage = () => {
  const { user } = useAuth();
  const { filterByWarehouse } = useWarehouseFilter();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    qrCode: '',
    category: '',
    quantity: 0,
    minQuantity: 0,
    location: '',
    warehouse: user?.warehouse || '',
    price: 0,
    supplier: '',
  });

  useEffect(() => {
    const initLoad = async () => {
      const data = await productService.getProducts();
      const filtered = filterByWarehouse(data);
      setProducts(filtered);
      setLoading(false);
    };
    initLoad();
  }, [filterByWarehouse]);

  const categories = ['асфальтобетон', 'щебень', 'песок', 'битум'];

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'quantity':
        return b.quantity - a.quantity;
      case 'price':
        return b.price - a.price;
      default:
        return 0;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) {
      alert('Заполните все поля!');
      return;
    }

    if (editingId) {
      const updated = await productService.updateProduct(editingId, formData);
      if (updated) {
        setProducts(products.map((p) => (p.id === editingId ? updated : p)));
      }
      setEditingId(null);
    } else {
      const created = await productService.createProduct(formData);
      setProducts([...products, created]);
    }

    setFormData({
      name: '',
      sku: '',
      barcode: '',
      qrCode: '',
      category: '',
      quantity: 0,
      minQuantity: 0,
      location: '',
      warehouse: user?.warehouse || '',
      price: 0,
      supplier: '',
    });
    setShowForm(false);
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      qrCode: product.qrCode || '',
      category: product.category,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      location: product.location,
      warehouse: product.warehouse,
      price: product.price,
      supplier: product.supplier || '',
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот товар?')) {
      await productService.deleteProduct(id);
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Загрузка товаров...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📦 Управление товарами</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              name: '',
              sku: '',
              barcode: '',
              qrCode: '',
              category: '',
              quantity: 0,
              minQuantity: 0,
              location: '',
              warehouse: user?.warehouse || '',
              price: 0,
              supplier: '',
            });
          }}
        >
          {showForm ? 'Отмена' : '+ Добавить товар'}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Редактирование товара' : 'Новый товар'}</h2>
          <form onSubmit={handleSubmit} className="product-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Название *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Название товара"
                  required
                />
              </div>
              <div className="form-group">
                <label>SKU *</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="SKU"
                  required
                />
              </div>
              <div className="form-group">
                <label>Штрихкод</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Штрихкод"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-small btn-primary"
                    onClick={() => setShowScanner(!showScanner)}
                    title="Сканировать QR/штрихкод"
                  >
                    📱
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>QR код</label>
                <input
                  type="text"
                  value={formData.qrCode}
                  onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                  placeholder="QR код"
                />
              </div>
              <div className="form-group">
                <label>Категория</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Количество</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Мин. количество</label>
                <input
                  type="number"
                  value={formData.minQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, minQuantity: parseInt(e.target.value) })
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Местоположение</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Локация на складе"
                />
              </div>
              <div className="form-group">
                <label>Площадка (склад)</label>
                <input
                  type="text"
                  value={formData.warehouse}
                  onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                  placeholder="Название площадки"
                  disabled={user?.role !== 'admin'}
                />
              </div>
              <div className="form-group">
                <label>Поставщик</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Название поставщика"
                />
              </div>
              <div className="form-group">
                <label>Цена за единицу</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            {showScanner && (
              <div style={{ marginBottom: '16px' }}>
                <QRScanner
                  isActive={showScanner}
                  onScan={(data) => {
                    console.log('✓ QR Scanner: Получены данные:', data);
                    setFormData((prevData) => {
                      const newData = { ...prevData, barcode: data };
                      console.log('✓ QR Scanner: Обновляем formData:', newData);
                      return newData;
                    });
                    setTimeout(() => {
                      console.log('✓ QR Scanner: Закрываем сканер');
                      setShowScanner(false);
                    }, 500);
                  }}
                />
              </div>
            )}
            <div className="form-actions">
              <button type="submit" className="btn-success">
                {editingId ? 'Обновить' : 'Добавить'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Поиск по названию или SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">Все категории</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">По названию</option>
          <option value="quantity">По количеству</option>
          <option value="price">По цене</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>SKU</th>
              <th>Штрихкод</th>
              <th>Категория</th>
              <th>Кол-во</th>
              <th>Место</th>
              <th>Площадка</th>
              <th>Цена</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.length > 0 ? (
              sortedProducts.map((product) => (
                <tr key={product.id} className={product.quantity < product.minQuantity ? 'low-stock' : ''}>
                  <td className="product-name">{product.name}</td>
                  <td className="sku">{product.sku}</td>
                  <td className="barcode">{product.barcode || '—'}</td>
                  <td>{product.category}</td>
                  <td className="quantity">{product.quantity}</td>
                  <td className="location">{product.location}</td>
                  <td className="warehouse">{product.warehouse}</td>
                  <td className="price">₽{product.price.toFixed(2)}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        product.quantity < product.minQuantity ? 'alert' : 'ok'
                      }`}
                    >
                      {product.quantity < product.minQuantity ? '⚠️ Низкий' : '✓ OK'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-small btn-primary" onClick={() => handleEdit(product)}>
                      Редакт.
                    </button>
                    <button className="btn-small btn-danger" onClick={() => handleDelete(product.id)}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="empty-cell">
                  Товары не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="page-stats">
        <div className="stat-item">
          <span className="stat-label">Всего товаров:</span>
          <span className="stat-value">{sortedProducts.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">На складе:</span>
          <span className="stat-value">{sortedProducts.reduce((sum, p) => sum + p.quantity, 0)} ед.</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Общая стоимость:</span>
          <span className="stat-value">
            ₽{sortedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
