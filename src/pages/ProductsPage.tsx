import { useState, useEffect } from 'react';
import type { Product, Warehouse } from '../types';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/useAuth';
import { useNotification } from '../contexts/useNotification';
import { QRScanner } from '../components/QRScanner';
import { EditProductModal } from '../components/EditProductModal';
import '../components/QRScanner.css';
import './Pages.css';

export const ProductsPage = () => {
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState<number | undefined>(user?.warehouseId);
  const [sortBy, setSortBy] = useState('name');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    qrCode: '',
    category: '',
    quantity: 0,
    minQuantity: 0,
    location: '',
    warehouseId: user?.warehouseId || 1,
    price: 0,
    supplier: '',
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const initLoad = async () => {
      try {
        const [cats, warehousesData, productsData] = await Promise.all([
          apiService.getCategories(),
          apiService.getWarehouses(),
          apiService.getProducts(),
        ]);
        
        setCategories(cats);
        setWarehouses(warehousesData);
        
        // Фильтруем товары по складу текущего пользователя
        let filtered = productsData;
        if (!isAdmin && user?.warehouseId) {
          filtered = productsData.filter(p => p.warehouseId === user.warehouseId);
        }
        
        setProducts(filtered);
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setLoading(false);
      }
    };
    initLoad();
  }, [isAdmin, user?.warehouseId]);

  const getDisplayedProducts = () => {
    let filtered = products;
    
    // Для админа - фильтруем по выбранному складу если выбран
    if (isAdmin && filterWarehouse) {
      filtered = filtered.filter(p => p.warehouseId === filterWarehouse);
    }
    
    // Фильтруем по поиску
    filtered = filtered.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm));
      const matchCategory = filterCategory === 'all' || p.category === filterCategory;
      return matchSearch && matchCategory;
    });
    
    return filtered;
  };

  const filteredProducts = getDisplayedProducts();

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
    if (!formData.name.trim() || !formData.sku.trim() || !formData.barcode.trim()) {
      showError('Заполните все обязательные поля (название, SKU, штрихкод)!');
      return;
    }

    setIsSaving(true);
    try {
      const created = await apiService.createProduct(formData);
      if (created) {
        setProducts([...products, created]);
        showSuccess('Товар успешно добавлен!');
        resetForm();
      } else {
        showError('Ошибка при создании товара');
      }
    } catch (error) {
      console.error('Ошибка при сохранении товара:', error);
      showError('Не удалось сохранить товар');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingProduct) return;
    
    if (!formData.name.trim() || !formData.sku.trim() || !formData.barcode.trim()) {
      showError('Заполните все обязательные поля (название, SKU, штрихкод)!');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await apiService.updateProduct(editingProduct.id, formData);
      if (updated) {
        setProducts(products.map((p) => (p.id === editingProduct.id ? updated : p)));
        showSuccess('Товар успешно обновлён!');
        closeEditModal();
      } else {
        showError('Ошибка при обновлении товара');
      }
    } catch (error) {
      console.error('Ошибка при обновлении товара:', error);
      showError('Не удалось обновить товар');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      qrCode: '',
      category: '',
      quantity: 0,
      minQuantity: 0,
      location: '',
      warehouseId: user?.warehouseId || 1,
      price: 0,
      supplier: '',
    });
    setShowAddForm(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      qrCode: product.qrCode || '',
      category: product.category,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      location: product.location || '',
      warehouseId: product.warehouseId,
      price: product.price,
      supplier: product.supplier || '',
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingProduct(null);
    resetEditFormData();
  };

  const resetEditFormData = () => {
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      qrCode: '',
      category: '',
      quantity: 0,
      minQuantity: 0,
      location: '',
      warehouseId: user?.warehouseId || 1,
      price: 0,
      supplier: '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;

    try {
      const deleted = await apiService.deleteProduct(id);
      if (deleted) {
        setProducts(products.filter((p) => p.id !== id));
        showSuccess('Товар успешно удалён!');
      } else {
        showError('Ошибка при удалении товара');
      }
    } catch (error) {
      console.error('Ошибка при удалении товара:', error);
      showError('Ошибка при удалении товара');
    }
  };

  const handleQRScanned = (qrCode: string) => {
    setFormData({ ...formData, qrCode });
    setShowScanner(false);
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Загрузка товаров...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Управление товарами</h1>
        <button
          className="btn-primary"
          onClick={() => {
            if (showAddForm) {
              resetForm();
            } else {
              setShowAddForm(true);
            }
          }}
        >
          {showAddForm ? 'Отмена' : '+ Добавить товар'}
        </button>
      </div>

      {showAddForm && (
        <div className="form-card">
          <h3>Добавить новый товар</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Название товара *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Введите название"
                  required
                />
              </div>

              <div className="form-group">
                <label>Категория *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>SKU *</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Артикул"
                  required
                />
              </div>

              <div className="form-group">
                <label>Штрихкод *</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Штрихкод"
                  required
                />
              </div>

              <div className="form-group">
                <label>QR Код</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={formData.qrCode}
                    onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                    placeholder="QR код (опционально)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(!showScanner)}
                    className="btn-secondary"
                  >
                    {showScanner ? 'Скрыть' : 'Сканер'}
                  </button>
                </div>
                {showScanner && (
                  <QRScanner isActive={showScanner} onScan={handleQRScanned} />
                )}
              </div>

              <div className="form-group">
                <label>Цена (₽) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Количество *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  required
                />
              </div>

              <div className="form-group">
                <label>Минимальный запас</label>
                <input
                  type="number"
                  min="0"
                  value={formData.minQuantity}
                  onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label>Местоположение</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Полка/зона (опционально)"
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

              {isAdmin && (
                <div className="form-group">
                  <label>Площадка *</label>
                  <select
                    value={formData.warehouseId}
                    onChange={(e) => setFormData({ ...formData, warehouseId: parseInt(e.target.value) })}
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
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={isSaving}>
              {isSaving ? 'Сохранение...' : 'Добавить товар'}
            </button>
          </form>
        </div>
      )}

      <EditProductModal
        isOpen={showEditModal}
        product={editingProduct}
        formData={{
          name: formData.name,
          sku: formData.sku,
          barcode: formData.barcode,
          qrCode: formData.qrCode,
          quantity: formData.quantity,
          price: formData.price,
          minQuantity: formData.minQuantity,
          location: formData.location,
        }}
        onFormChange={(field, value) => {
          setFormData({ ...formData, [field]: value });
        }}
        onSave={handleEditSave}
        onClose={closeEditModal}
        isLoading={isSaving}
      />

      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Поиск товаров..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="all">Все категории</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        {isAdmin && (
          <select value={filterWarehouse || ''} onChange={(e) => setFilterWarehouse(e.target.value ? parseInt(e.target.value) : undefined)}>
            <option value="">Все площадки</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        )}

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">По названию</option>
          <option value="quantity">По количеству</option>
          <option value="price">По цене</option>
        </select>
      </div>

      <div className="products-list">
        {sortedProducts.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>SKU</th>
                <th>Категория</th>
                <th>Количество</th>
                <th>Цена</th>
                <th>Статус</th>
                {isAdmin && <th>Площадка</th>}
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((product) => {
                const isLowStock = product.quantity < product.minQuantity;
                const warehouseName = warehouses.find(w => w.id === product.warehouseId)?.name || 'Неизвестно';
                return (
                  <tr key={product.id} className={isLowStock ? 'low-stock' : ''}>
                    <td className="product-name">{product.name}</td>
                    <td className="sku">{product.sku}</td>
                    <td>{product.category}</td>
                    <td className="quantity">{product.quantity}</td>
                    <td className="price">₽{product.price.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${isLowStock ? 'alert' : 'ok'}`}>
                        {isLowStock ? 'Низкий' : 'ОК'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="warehouse">{warehouseName}</td>
                    )}
                    <td className="actions">
                      <button
                        onClick={() => handleEdit(product)}
                        className="btn-action btn-edit"
                        title="Редактировать товар"
                      >
                        Редакт.
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="btn-action btn-delete"
                        title="Удалить товар"
                      >
                        Удал.
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>Товары не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
};
