import { useState, useEffect, useRef } from 'react';
import type { Product, Warehouse } from '../types';
import { productService, mockWarehouses } from '../services/mockService';
import { useAuth } from '../contexts/useAuth';
import './Pages.css';

export const PrintProductsPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [printMode, setPrintMode] = useState<'list' | 'label'>('label');
  const [labelSize, setLabelSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [columnsPerRow, setColumnsPerRow] = useState<number>(2);
  const [labelContent, setLabelContent] = useState({
    showName: true,
    showSku: true,
    showBarcode: true,
    showQr: true,
    showCategory: false,
    showPrice: false,
    showQuantity: false,
  });
  const printRef = useRef<HTMLDivElement>(null);
  const [userWarehouse, setUserWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      const data = await productService.getProducts();
      
      let filtered = data;
      if (user && user.role !== 'admin' && user.warehouse) {
        filtered = data.filter(p => p.warehouse === user.warehouse);
        const warehouse = mockWarehouses.find(w => w.id === user.warehouse);
        setUserWarehouse(warehouse || null);
      }
      
      setProducts(filtered);
      setLoading(false);
    };
    loadProducts();
  }, [user]);

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (doc) {
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Печать этикеток товаров</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 10mm;
              }
              .page-break {
                page-break-after: always;
                break-after: page;
              }
              ${printMode === 'label' ? `
                .label-container {
                  width: 100mm;
                  height: 100mm;
                  border: 1px solid #333;
                  padding: 5mm;
                  margin-bottom: 5mm;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                }
                .label-name {
                  font-size: 14px;
                  font-weight: bold;
                  text-align: center;
                  margin-bottom: 5mm;
                }
                .label-sku {
                  font-size: 12px;
                  text-align: center;
                  margin-bottom: 3mm;
                }
                .label-barcode-text {
                  font-size: 16px;
                  text-align: center;
                  font-family: 'Courier New', monospace;
                  font-weight: bold;
                  margin-bottom: 5mm;
                  letter-spacing: 2px;
                }
                .label-qr {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                }
                .label-qr img {
                  width: 40mm;
                  height: 40mm;
                }
              ` : `
                .product-row {
                  page-break-inside: avoid;
                  margin-bottom: 10mm;
                  padding: 5mm;
                  border: 1px solid #ddd;
                }
                .product-row h3 {
                  margin: 0 0 3mm 0;
                  font-size: 14px;
                }
                .product-info {
                  font-size: 11px;
                  line-height: 1.6;
                  margin-bottom: 5mm;
                }
                .product-barcode {
                  font-size: 14px;
                  font-family: 'Courier New', monospace;
                  font-weight: bold;
                  text-align: center;
                  margin-bottom: 5mm;
                }
              `}
            </style>
          </head>
          <body>
            ${printContents}
          </body>
        </html>
      `);
      doc.close();
    }

    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 100);
    }, 500);
  };

  const generateQRCode = (url: string) => {
    // Используем QR-код сервис для генерации
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url || 'http://example.com')}`;
  };

  const getLabelDimensions = () => {
    switch (labelSize) {
      case 'small': return { width: '50mm', height: '50mm', fontSize: 10 };
      case 'large': return { width: '150mm', height: '150mm', fontSize: 16 };
      default: return { width: '100mm', height: '100mm', fontSize: 14 };
    }
  };

  const selectedProductsList = products.filter(p => selectedProducts.has(p.id));

  if (loading) {
    return <div className="page-container"><div className="loading">Загрузка товаров...</div></div>;
  }

  if (selectedProducts.size === 0) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Печать этикеток товаров</h1>
          <p>{userWarehouse ? `Площадка: ${userWarehouse.name}` : 'Выберите товары для печати'}</p>
        </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>Режим печати</label>
          <select 
            value={printMode} 
            onChange={(e) => setPrintMode(e.target.value as 'list' | 'label')} 
            className="filter-select"
          >
            <option value="label">Этикетки</option>
            <option value="list">Список с кодами</option>
          </select>
        </div>
        
        {printMode === 'label' && (
          <>
            <div className="filter-group">
              <label>Размер этикеток</label>
              <select 
                value={labelSize} 
                onChange={(e) => setLabelSize(e.target.value as 'small' | 'medium' | 'large')} 
                className="filter-select"
              >
                <option value="small">Маленькие (50x50мм)</option>
                <option value="medium">Средние (100x100мм)</option>
                <option value="large">Большие (150x150мм)</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Колонок в ряду</label>
              <select 
                value={columnsPerRow} 
                onChange={(e) => setColumnsPerRow(parseInt(e.target.value))} 
                className="filter-select"
              >
                <option value="1">1 колонка</option>
                <option value="2">2 колонки</option>
                <option value="3">3 колонки</option>
                <option value="4">4 колонки</option>
              </select>
            </div>
          </>
        )}
        
        <button 
          className="filter-btn" 
          onClick={handleSelectAll}
        >
          {selectedProducts.size === products.length ? 'Отменить выбор' : 'Выбрать всё'}
        </button>
        <button 
          className="filter-btn" 
          onClick={() => setSelectedProducts(new Set())}
          style={{ backgroundColor: '#e74c3c', marginLeft: '5px' }}
        >
          Очистить выбор
        </button>
        <button 
          className="filter-btn" 
          onClick={handlePrint}
          style={{ backgroundColor: '#27ae60', marginLeft: '5px' }}
        >
          Печать ({selectedProducts.size})
        </button>
      </div>        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedProducts.size === products.length && products.length > 0}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', width: '20px', height: '20px' }}
                  />
                </th>
                <th>Название</th>
                <th>SKU</th>
                <th>Штрихкод</th>
                <th>Категория</th>
                <th>Кол-во</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} onClick={() => handleSelectProduct(product.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedProducts.has(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      style={{ cursor: 'pointer', width: '20px', height: '20px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td>{product.name}</td>
                  <td>{product.sku}</td>
                  <td>{product.barcode || 'Нет'}</td>
                  <td>{product.category}</td>
                  <td>{product.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Печать этикеток товаров</h1>
        <p>Выбрано товаров: {selectedProducts.size}</p>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>Режим печати</label>
          <select 
            value={printMode} 
            onChange={(e) => setPrintMode(e.target.value as 'list' | 'label')} 
            className="filter-select"
          >
            <option value="label">Этикетки (A6)</option>
            <option value="list">Список с кодами</option>
          </select>
        </div>
        <button 
          className="filter-btn" 
          onClick={handleSelectAll}
        >
          {selectedProducts.size === products.length ? 'Отменить выбор' : 'Выбрать всё'}
        </button>
        <button 
          className="filter-btn" 
          onClick={() => setSelectedProducts(new Set())}
          style={{ backgroundColor: '#e74c3c', marginLeft: '5px' }}
        >
          Очистить выбор
        </button>
        <button 
          className="filter-btn" 
          onClick={handlePrint}
          style={{ backgroundColor: '#27ae60', marginLeft: '5px' }}
        >
          Печать ({selectedProducts.size})
        </button>
      </div>

      <div ref={printRef} style={{ display: 'none' }}>
        {printMode === 'label' && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columnsPerRow}, 1fr)`, gap: '5mm' }}>
            {selectedProductsList.map(product => {
              const dims = getLabelDimensions();
              return (
                <div key={product.id} className="label-container" style={{
                  border: '1px solid #333',
                  padding: '3mm',
                  width: dims.width,
                  height: dims.height,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  pageBreakInside: 'avoid',
                  fontSize: `${dims.fontSize}px`,
                }}>
                  {labelContent.showName && (
                    <div style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '2mm' }}>
                      {product.name}
                    </div>
                  )}
                  {labelContent.showCategory && (
                    <div style={{ fontSize: '80%', textAlign: 'center', color: '#666', marginBottom: '1mm' }}>
                      {product.category}
                    </div>
                  )}
                  {labelContent.showSku && (
                    <div style={{ fontSize: '80%', textAlign: 'center', marginBottom: '2mm' }}>
                      {product.sku}
                    </div>
                  )}
                  {labelContent.showBarcode && (
                    <div style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '2mm' }}>
                      {product.barcode || 'NO-BARCODE'}
                    </div>
                  )}
                  {labelContent.showPrice && (
                    <div style={{ fontSize: '80%', textAlign: 'center', marginBottom: '2mm' }}>
                      ₽{product.price}
                    </div>
                  )}
                  {labelContent.showQuantity && (
                    <div style={{ fontSize: '80%', textAlign: 'center', marginBottom: '2mm' }}>
                      Кол-во: {product.quantity}
                    </div>
                  )}
                  {labelContent.showQr && (
                    <div style={{ textAlign: 'center', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img 
                        src={generateQRCode(product.qrCode || `https://product.local/${product.id}`)} 
                        alt="QR Code"
                        style={{ width: `${Math.min(30, parseInt(dims.width) - 10)}mm`, height: `${Math.min(30, parseInt(dims.width) - 10)}mm` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {printMode === 'list' && (
          <div>
            {selectedProductsList.map(product => (
              <div key={product.id} className="product-row" style={{
                pageBreakInside: 'avoid',
                marginBottom: '10mm',
                padding: '5mm',
                border: '1px solid #ddd',
              }}>
                <h3 style={{ margin: '0 0 5mm 0', fontSize: '14px' }}>{product.name}</h3>
                <div className="product-info" style={{ fontSize: '11px', lineHeight: '1.6', marginBottom: '5mm' }}>
                  <div><strong>SKU:</strong> {product.sku}</div>
                  <div><strong>Категория:</strong> {product.category}</div>
                  <div><strong>Кол-во:</strong> {product.quantity} шт.</div>
                  {product.supplier && <div><strong>Поставщик:</strong> {product.supplier}</div>}
                  <div><strong>Цена:</strong> ₽{product.price.toLocaleString()}</div>
                </div>
                <div className="product-barcode" style={{ fontSize: '14px', textAlign: 'center', fontFamily: 'monospace', marginBottom: '5mm' }}>
                  Штрихкод: {product.barcode || 'Нет'}
                </div>
                {product.qrCode && (
                  <div style={{ textAlign: 'center' }}>
                    <img 
                      src={generateQRCode(product.qrCode)} 
                      alt="QR Code"
                      style={{ width: '50mm', height: '50mm' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        display: printMode === 'label' ? 'block' : 'none'
      }}>
        <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
          <h3 style={{ marginTop: 0, color: '#000' }}>Параметры этикеток:</h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={labelContent.showName} onChange={(e) => setLabelContent({...labelContent, showName: e.target.checked})} style={{ cursor: 'pointer' }} />
              Название
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={labelContent.showCategory} onChange={(e) => setLabelContent({...labelContent, showCategory: e.target.checked})} style={{ cursor: 'pointer' }} />
              Категория
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={labelContent.showSku} onChange={(e) => setLabelContent({...labelContent, showSku: e.target.checked})} style={{ cursor: 'pointer' }} />
              SKU
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={labelContent.showBarcode} onChange={(e) => setLabelContent({...labelContent, showBarcode: e.target.checked})} style={{ cursor: 'pointer' }} />
              Штрихкод
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={labelContent.showPrice} onChange={(e) => setLabelContent({...labelContent, showPrice: e.target.checked})} style={{ cursor: 'pointer' }} />
              Цена
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={labelContent.showQuantity} onChange={(e) => setLabelContent({...labelContent, showQuantity: e.target.checked})} style={{ cursor: 'pointer' }} />
              Кол-во
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={labelContent.showQr} onChange={(e) => setLabelContent({...labelContent, showQr: e.target.checked})} style={{ cursor: 'pointer' }} />
              QR код
            </label>
          </div>
        </div>
        
        <h3 style={{ color: '#000', marginBottom: '15px' }}>Предпросмотр этикеток</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${columnsPerRow}, 1fr)`, 
          gap: '15px',
          marginTop: '20px',
          backgroundColor: '#fff',
          padding: '15px',
          borderRadius: '4px'
        }}>
          {selectedProductsList.map(product => {
            const dims = getLabelDimensions();
            const baseSize = labelSize === 'small' ? 120 : labelSize === 'large' ? 220 : 160;
            return (
              <div key={product.id} style={{
                border: '2px solid #333',
                padding: '12px',
                backgroundColor: '#fff',
                borderRadius: '4px',
                width: `${baseSize}px`,
                height: `${baseSize}px`,
                textAlign: 'center',
                fontSize: `${dims.fontSize * 0.6}px`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                color: '#000',
              }}>
                {labelContent.showName && (
                  <div style={{ fontWeight: 'bold', marginBottom: '3px', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: `${dims.fontSize * 0.65}px` }}>
                    {product.name}
                  </div>
                )}
                {labelContent.showCategory && (
                  <div style={{ fontSize: '70%', color: '#333', marginBottom: '2px' }}>
                    {product.category}
                  </div>
                )}
                {labelContent.showSku && (
                  <div style={{ fontSize: '65%', marginBottom: '2px', color: '#000' }}>
                    {product.sku}
                  </div>
                )}
                {labelContent.showBarcode && (
                  <div style={{ fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '3px', fontSize: `${dims.fontSize * 0.55}px`, color: '#000', letterSpacing: '0.5px' }}>
                    {product.barcode || 'NO-BARCODE'}
                  </div>
                )}
                {labelContent.showPrice && (
                  <div style={{ fontSize: '70%', marginBottom: '2px', color: '#000' }}>
                    ₽{product.price}
                  </div>
                )}
                {labelContent.showQuantity && (
                  <div style={{ fontSize: '70%', marginBottom: '2px', color: '#000' }}>
                    Кол-во: {product.quantity}
                  </div>
                )}
                {labelContent.showQr && (
                  <img 
                    src={generateQRCode(product.qrCode || `https://product.local/${product.id}`)} 
                    alt="QR Code"
                    style={{ width: `${Math.max(50, baseSize - 30)}px`, height: `${Math.max(50, baseSize - 30)}px`, marginTop: 'auto' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
