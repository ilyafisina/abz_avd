// Типы ролей пользователей
export type UserRole = 'warehouseman' | 'manager' | 'admin';

// Типы запросов
export type RequestType = 'sale' | 'purchase' | 'transfer' | 'adjustment';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type Priority = 'low' | 'normal' | 'high';
export type EntityType = 'product' | 'request' | 'user' | 'warehouse' | 'other';

// Интерфейс пользователя
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  warehouse?: string; // площадка для менеджера и складовщика
  createdAt: Date;
  warehouseArea?: string; // для складовщиков - зона в складе
}

// Интерфейс товара
export interface Product {
  id: string;
  name: string;
  sku: string; // артикул
  barcode?: string; // штрихкод
  qrCode?: string; // QR код
  category: string;
  quantity: number;
  minQuantity: number;
  location: string; // местоположение на складе
  warehouse: string; // площадка (склад)
  supplier?: string;
  price: number;
  lastUpdated: Date;
  createdAt: Date;
}

// Интерфейс заявки
export interface Request {
  id: string;
  requestNumber: string;
  requestType: RequestType;
  status: RequestStatus;
  products: RequestProduct[];
  createdBy: string;
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  completedBy?: string;
  completedAt?: Date;
  notes?: string;
  priority?: Priority;
}

// Интерфейс товара в заявке
export interface RequestProduct {
  productId: string;
  productName: string;
  quantity: number;
  currentQuantity: number;
  location: string;
}

// Интерфейс логирования системы
export interface SystemLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: EntityType;
  entityId: string;
  changes?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
}

// Интерфейс отчёта о товарах
export interface InventoryReport {
  id: string;
  reportDate: Date;
  totalProducts: number;
  totalValue: number;
  productsByCategory: CategorySummary[];
  lowStockItems: Product[];
  discrepancies?: string[];
}

// Интерфейс сводки по категориям
export interface CategorySummary {
  category: string;
  productCount: number;
  totalQuantity: number;
  totalValue: number;
}

// Интерфейс данных для редактирования контактных данных пользователя
export interface ContactData {
  phone?: string;
  telegram?: string;
  email?: string;
  address?: string;
}

// Интерфейс сессии пользователя
export interface AuthSession {
  user: User;
  token: string;
  expiresAt: Date;
}

// Интерфейс параметров перемещения товара
export interface MovementData {
  productId: string;
  currentLocation: string;
  newLocation: string;
  quantity: number;
  reason: string;
  timestamp: Date;
}
