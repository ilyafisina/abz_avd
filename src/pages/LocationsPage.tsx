import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/useAuth';
import type { Product, Warehouse } from '../types';
import type { Category } from '../types';
import { apiService } from '../services/apiService';
import { EditProductModal } from '../components/EditProductModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './Pages.css';

export const LocationsPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  
  // Форма для добавления новой площадки (для админа)
  const [showAddWarehouseForm, setShowAddWarehouseForm] = useState(false);
  const [newWarehouseForm, setNewWarehouseForm] = useState({
    name: '',
    location: '',
  });

  // Форма перемещения товаров (для админа)
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferForm, setTransferForm] = useState({
    productId: '',
    quantity: 0,
    targetWarehouseId: '',
    notes: '',
  });

  // Форма редактирования товара
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editProductForm, setEditProductForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    qrCode: '',
    quantity: 0,
    price: 0,
    minQuantity: 10,
    location: '',
  });

  // Форма добавления нового товара (для админа)
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [addProductForm, setAddProductForm] = useState({
    name: '',
    category: '',
    sku: '',
    barcode: '',
    qrCode: '',
    quantity: 0,
    price: 0,
    minQuantity: 10,
    location: '',
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [productFilters, setProductFilters] = useState({
    status: 'all',
    priceMin: '',
    priceMax: '',
    quantity: 'all',
    searchProduct: '',
  });

  const pdfRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'admin';

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [productsData, warehousesData, categoriesData] = await Promise.all([
          apiService.getProducts(),
          apiService.getWarehouses(),
          apiService.getCategories(),
        ]);
        setProducts(productsData);
        setWarehouses(warehousesData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getTotalValue = (warehouseProducts: Product[]) => {
    return warehouseProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
  };

  const getTotalQuantity = (warehouseProducts: Product[]) => {
    return warehouseProducts.reduce((sum, p) => sum + p.quantity, 0);
  };

  const getWarehouseProducts = (warehouseId: number) => {
    return products.filter(p => p.warehouseId === warehouseId);
  };

  const filterWarehouseProducts = (warehouseProducts: Product[]) => {
    return warehouseProducts.filter((product) => {
      if (productFilters.status !== 'all') {
        const isLowStock = product.quantity < product.minQuantity;
        if (productFilters.status === 'low' && !isLowStock) return false;
        if (productFilters.status === 'ok' && isLowStock) return false;
      }

      if (productFilters.priceMin) {
        const min = parseFloat(productFilters.priceMin);
        if (product.price < min) return false;
      }
      if (productFilters.priceMax) {
        const max = parseFloat(productFilters.priceMax);
        if (product.price > max) return false;
      }

      if (productFilters.quantity !== 'all') {
        if (productFilters.quantity === 'low' && product.quantity > 50) return false;
        if (productFilters.quantity === 'high' && product.quantity <= 50) return false;
      }

      if (productFilters.searchProduct) {
        const search = productFilters.searchProduct.toLowerCase();
        const nameMatch = product.name.toLowerCase().includes(search);
        const skuMatch = product.sku.toLowerCase().includes(search);
        if (!nameMatch && !skuMatch) return false;
      }

      return true;
    });
  };

  const handleAddWarehouse = async () => {
    if (!newWarehouseForm.name || !newWarehouseForm.location) {
      alert('Заполните все поля');
      return;
    }

    try {
      const newWarehouse = await apiService.createWarehouse({
        name: newWarehouseForm.name,
        location: newWarehouseForm.location,
      });
      setWarehouses([...warehouses, newWarehouse]);
      setShowAddWarehouseForm(false);
      setNewWarehouseForm({ name: '', location: '' });
      alert('Площадка успешно добавлена');
    } catch (error) {
      console.error('Ошибка при добавлении площадки:', error);
      alert('Не удалось добавить площадку');
    }
  };

  const handleAddProduct = async () => {
    if (!addProductForm.name || !addProductForm.category || !selectedWarehouse || !addProductForm.sku || !addProductForm.barcode) {
      alert('Заполните все обязательные поля');
      return;
    }

    if (addProductForm.quantity <= 0 || addProductForm.price <= 0) {
      alert('Количество и цена должны быть больше нуля');
      return;
    }

    try {
      const newProduct = await apiService.createProduct({
        name: addProductForm.name,
        category: addProductForm.category,
        price: addProductForm.price,
        quantity: addProductForm.quantity,
        warehouseId: selectedWarehouse,
        sku: addProductForm.sku,
        barcode: addProductForm.barcode,
        qrCode: addProductForm.qrCode || `QR-${Date.now()}`,
        minQuantity: addProductForm.minQuantity,
        location: addProductForm.location || '',
      });

      if (newProduct) {
        setProducts([...products, newProduct]);
        setShowAddProductForm(false);
        setAddProductForm({
          name: '',
          category: '',
          sku: '',
          barcode: '',
          qrCode: '',
          quantity: 0,
          price: 0,
          minQuantity: 10,
          location: '',
        });
        alert('Товар успешно добавлен на площадку');
      }
    } catch (error) {
      console.error('Ошибка при добавлении товара:', error);
      alert('Не удалось добавить товар');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditProductForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      qrCode: product.qrCode || '',
      quantity: product.quantity,
      price: product.price,
      minQuantity: product.minQuantity,
      location: product.location || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    if (!editProductForm.name || !editProductForm.sku || !editProductForm.barcode) {
      alert('Заполните все обязательные поля');
      return;
    }

    setIsSavingEdit(true);
    try {
      const updated = await apiService.updateProduct(editingProduct.id, {
        ...editingProduct,
        ...editProductForm,
      });

      if (updated) {
        setProducts(products.map(p => p.id === updated.id ? updated : p));
        alert('Товар успешно обновлён');
        closeEditModal();
      }
    } catch (error) {
      console.error('Ошибка при обновлении товара:', error);
      alert('Не удалось обновить товар');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingProduct(null);
    setEditProductForm({
      name: '',
      sku: '',
      barcode: '',
      qrCode: '',
      quantity: 0,
      price: 0,
      minQuantity: 10,
      location: '',
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;

    try {
      const deleted = await apiService.deleteProduct(productId);
      if (deleted) {
        setProducts(products.filter(p => p.id !== productId));
        alert('Товар успешно удалён');
      }
    } catch (error) {
      console.error('Ошибка при удалении товара:', error);
      alert('Не удалось удалить товар');
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.productId || !transferForm.targetWarehouseId || transferForm.quantity <= 0) {
      alert('Заполните все поля корректно');
      return;
    }

    const product = products.find(p => p.id === transferForm.productId);
    if (!product) {
      alert('Товар не найден');
      return;
    }

    if (product.quantity < transferForm.quantity) {
      alert('Недостаточно товара на складе');
      return;
    }

    try {
      await apiService.createRequest({
        requestType: 'transfer',
        status: 'pending',
        warehouseId: selectedWarehouse || 1,
        transferWarehouseId: parseInt(transferForm.targetWarehouseId),
        products: [
          {
            productId: product.id,
            productName: product.name,
            quantity: transferForm.quantity,
          },
        ],
        createdBy: user?.id || '3',
        priority: 'normal',
        notes: transferForm.notes || 'Перемещение товара между площадками',
      });
      setShowTransferForm(false);
      setTransferForm({ productId: '', quantity: 0, targetWarehouseId: '', notes: '' });
      alert('Заявка на перемещение создана успешно');
    } catch (error) {
      console.error('Ошибка при создании заявки:', error);
      alert('Не удалось создать заявку');
    }
  };

  const exportToPDF = async (warehouse: Warehouse) => {
    if (!pdfRef.current) return;

    try {
      const element = pdfRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      pdf.save(`${warehouse.name}_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Ошибка при экспорте в PDF:', error);
      alert('Ошибка при экспорте в PDF');
    }
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Загрузка площадок...</div></div>;
  }

  // Если выбрана площадка - показываем детальный вид
  if (selectedWarehouse) {
    const warehouse = warehouses.find(w => w.id === selectedWarehouse);
    if (!warehouse) return null;

    const warehouseProducts = getWarehouseProducts(selectedWarehouse);

    return (
      <div ref={pdfRef} className="page-container">
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
              {isAdmin && (
                <button
                  onClick={() => exportToPDF(warehouse)}
                  className="btn-primary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Экспорт PDF
                </button>
              )}
            </div>

            <div className="location-info">
              <div className="info-row">
                <span className="label">ID:</span>
                <span className="value">{warehouse.id}</span>
              </div>
              <div className="info-row">
                <span className="label">Название:</span>
                <span className="value">{warehouse.name}</span>
              </div>
              <div className="info-row">
                <span className="label">Адрес:</span>
                <span className="value">{warehouse.location}</span>
              </div>
              <div className="info-row">
                <span className="label">Дата создания:</span>
                <span className="value">{new Date(warehouse.createdAt).toLocaleDateString('ru-RU')}</span>
              </div>
            </div>
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
                    {isAdmin && <th>Действия</th>}
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
                        {isAdmin && (
                          <td style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="btn-small"
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                backgroundColor: 'var(--primary-blue)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              ✏ Редакт.
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="btn-small"
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                backgroundColor: '#e74c3c',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              🗑 Удал.
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="muted-small" style={{ textAlign: 'center', padding: '16px' }}>Товары не найдены по выбранным фильтрам</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted-small">Товаров не найдено</p>
          )}
        </div>

        {/* Для администратора - форма перемещения товаров */}
        {isAdmin && (
          <div className="card-plain" style={{ marginTop: '20px' }}>
            <h3 className="no-margin">Перемещение товаров между площадками</h3>
            
            <button
              onClick={() => setShowTransferForm(!showTransferForm)}
              style={{
                marginTop: '16px',
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--primary-blue)',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              {showTransferForm ? '✕ Отменить' : '+ Создать заявку на перемещение'}
            </button>

            {showTransferForm && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: 'var(--surface-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border-primary)',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Товар для перемещения</label>
                    <select
                      value={transferForm.productId}
                      onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="">Выберите товар</option>
                      {warehouseProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (осталось: {p.quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Количество</label>
                    <input
                      type="number"
                      min="1"
                      value={transferForm.quantity}
                      onChange={(e) => setTransferForm({ ...transferForm, quantity: parseInt(e.target.value) || 0 })}
                      placeholder="Введите количество"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>На какую площадку переместить</label>
                    <select
                      value={transferForm.targetWarehouseId}
                      onChange={(e) => setTransferForm({ ...transferForm, targetWarehouseId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="">Выберите целевую площадку</option>
                      {warehouses.filter(w => w.id !== selectedWarehouse).map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} - {w.location}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Примечание (опционально)</label>
                    <textarea
                      value={transferForm.notes}
                      onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                      placeholder="Причина перемещения..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleTransfer}
                  style={{
                    marginTop: '16px',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--primary-blue)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Создать заявку на перемещение
                </button>
              </div>
            )}
          </div>
        )}

        {/* Для администратора - форма добавления нового товара */}
        {isAdmin && (
          <div className="card-plain" style={{ marginTop: '20px' }}>
            <h3 className="no-margin">Добавить новый товар на площадку</h3>
            
            <button
              onClick={() => setShowAddProductForm(!showAddProductForm)}
              style={{
                marginTop: '16px',
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#4caf50',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              {showAddProductForm ? '✕ Отменить' : '+ Добавить товар'}
            </button>

            {showAddProductForm && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: 'var(--surface-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border-primary)',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Название товара *</label>
                    <input
                      type="text"
                      value={addProductForm.name}
                      onChange={(e) => setAddProductForm({ ...addProductForm, name: e.target.value })}
                      placeholder="Введите название товара"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Категория *</label>
                    <select
                      value={addProductForm.category}
                      onChange={(e) => setAddProductForm({ ...addProductForm, category: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="">Выберите категорию</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>SKU *</label>
                    <input
                      type="text"
                      value={addProductForm.sku}
                      onChange={(e) => setAddProductForm({ ...addProductForm, sku: e.target.value })}
                      placeholder="Артикул"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Штрихкод *</label>
                    <input
                      type="text"
                      value={addProductForm.barcode}
                      onChange={(e) => setAddProductForm({ ...addProductForm, barcode: e.target.value })}
                      placeholder="Штрихкод товара"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>QR Код</label>
                    <input
                      type="text"
                      value={addProductForm.qrCode}
                      onChange={(e) => setAddProductForm({ ...addProductForm, qrCode: e.target.value })}
                      placeholder="QR код (опционально)"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Цена (₽) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addProductForm.price}
                      onChange={(e) => setAddProductForm({ ...addProductForm, price: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Количество *</label>
                    <input
                      type="number"
                      min="1"
                      value={addProductForm.quantity}
                      onChange={(e) => setAddProductForm({ ...addProductForm, quantity: parseInt(e.target.value) || 0 })}
                      placeholder="Количество единиц"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Минимальный запас</label>
                    <input
                      type="number"
                      min="1"
                      value={addProductForm.minQuantity}
                      onChange={(e) => setAddProductForm({ ...addProductForm, minQuantity: parseInt(e.target.value) || 10 })}
                      placeholder="Минимум для уведомления"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Местоположение</label>
                    <input
                      type="text"
                      value={addProductForm.location}
                      onChange={(e) => setAddProductForm({ ...addProductForm, location: e.target.value })}
                      placeholder="Полка/зона (опционально)"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--surface-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddProduct}
                  style={{
                    marginTop: '16px',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#4caf50',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Добавить товар на площадку
                </button>
              </div>
            )}
          </div>
        )}

        {/* Для администратора - модальное окно редактирования товара */}
        {isAdmin && (
          <EditProductModal
            isOpen={showEditModal}
            product={editingProduct}
            formData={editProductForm}
            onFormChange={(field, value) => {
              setEditProductForm({ ...editProductForm, [field]: value });
            }}
            onSave={handleUpdateProduct}
            onClose={closeEditModal}
            isLoading={isSavingEdit}
          />
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

      {isAdmin && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setShowAddWarehouseForm(!showAddWarehouseForm)}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#4caf50',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            {showAddWarehouseForm ? '✕ Отменить' : '+ Добавить новую площадку'}
          </button>

          {showAddWarehouseForm && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: 'var(--surface-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-primary)',
              maxWidth: '500px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Название площадки *</label>
                  <input
                    type="text"
                    value={newWarehouseForm.name}
                    onChange={(e) => setNewWarehouseForm({ ...newWarehouseForm, name: e.target.value })}
                    placeholder="Введите название площадки"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-primary)',
                      backgroundColor: 'var(--surface-primary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Адрес *</label>
                  <input
                    type="text"
                    value={newWarehouseForm.location}
                    onChange={(e) => setNewWarehouseForm({ ...newWarehouseForm, location: e.target.value })}
                    placeholder="Введите адрес площадки"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-primary)',
                      backgroundColor: 'var(--surface-primary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <button
                  onClick={handleAddWarehouse}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#4caf50',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Добавить площадку
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Поиск по названию или адресу..."
          value={searchLocation}
          onChange={(e) => setSearchLocation(e.target.value)}
        />
      </div>

      <div className="warehouses-grid">
        {warehouses
          .filter(w => w.name.toLowerCase().includes(searchLocation.toLowerCase()) || 
                       w.location.toLowerCase().includes(searchLocation.toLowerCase()))
          .map((warehouse) => {
            const warehouseProducts = getWarehouseProducts(warehouse.id);
            return (
              <div key={warehouse.id} className="warehouse-card">
                <div className="warehouse-header">
                  <h3>{warehouse.name}</h3>
                  <span className="area-badge">ID: {warehouse.id}</span>
                </div>

                <div className="warehouse-info">
                  <p><strong>Адрес:</strong> {warehouse.location}</p>
                  <p><strong>Дата создания:</strong> {new Date(warehouse.createdAt).toLocaleDateString('ru-RU')}</p>
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
