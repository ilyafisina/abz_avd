import React from 'react';
import type { Product } from '../types';
import '../components/modal.css';

interface EditProductModalProps {
  isOpen: boolean;
  product: Product | null;
  formData: {
    name: string;
    sku: string;
    barcode: string;
    qrCode: string;
    quantity: number;
    price: number;
    minQuantity: number;
    location: string;
  };
  onFormChange: (field: string, value: string | number) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  product,
  formData,
  onFormChange,
  onSave,
  onClose,
  isLoading = false,
}) => {
  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Редактирование товара</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="edit-name">Название товара *</label>
            <input
              id="edit-name"
              type="text"
              value={formData.name}
              onChange={(e) => onFormChange('name', e.target.value)}
              placeholder="Введите название товара"
              disabled={isLoading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-sku">SKU *</label>
              <input
                id="edit-sku"
                type="text"
                value={formData.sku}
                onChange={(e) => onFormChange('sku', e.target.value)}
                placeholder="Введите SKU"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-barcode">Штрихкод *</label>
              <input
                id="edit-barcode"
                type="text"
                value={formData.barcode}
                onChange={(e) => onFormChange('barcode', e.target.value)}
                placeholder="Введите штрихкод"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-quantity">Количество</label>
              <input
                id="edit-quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => onFormChange('quantity', parseInt(e.target.value) || 0)}
                min="0"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-minQuantity">Минимальное количество</label>
              <input
                id="edit-minQuantity"
                type="number"
                value={formData.minQuantity}
                onChange={(e) => onFormChange('minQuantity', parseInt(e.target.value) || 50)}
                min="0"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-price">Цена</label>
              <input
                id="edit-price"
                type="number"
                value={formData.price}
                onChange={(e) => onFormChange('price', parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-qrCode">QR-код</label>
              <input
                id="edit-qrCode"
                type="text"
                value={formData.qrCode}
                onChange={(e) => onFormChange('qrCode', e.target.value)}
                placeholder="QR-код товара"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-location">Местоположение</label>
            <input
              id="edit-location"
              type="text"
              value={formData.location}
              onChange={(e) => onFormChange('location', e.target.value)}
              placeholder="Местоположение на площадке"
              disabled={isLoading}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
