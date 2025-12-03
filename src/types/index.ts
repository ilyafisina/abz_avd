// Типы ролей пользователей
export type UserRole = 'warehouseman' | 'manager' | 'admin';

// Интерфейс категории
export interface Category {
  id: number;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Типы запросов
export type RequestType = 'incoming' | 'writeoff' | 'transfer' | 'adjustment';
export type RequestStatus = 'pending' | 'approved' | 'in_transit' | 'rejected' | 'completed';
export type Priority = 'low' | 'normal' | 'high';
export type EntityType = 'product' | 'request' | 'user' | 'warehouse' | 'other';

// Интерфейс пользователя
export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  isOnline?: boolean;
  lastSeenAt?: Date;
  warehouseId?: number; // ID площадки для менеджера и складовщика
  warehouse?: Warehouse; // навигационное свойство
  createdAt?: Date;
  updatedAt?: Date;
  warehouseArea?: string; // для складовщиков - зона в складе
}

// Интерфейс площадки (склада)
export interface Warehouse {
  id: number;
  name: string; // название площадки
  location: string; // адрес
  managerId?: string; // начальник площадки
  createdAt: Date;
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
  location?: string; // местоположение на складе
  warehouseId: number; // ID площадки (склада)
  warehouse?: Warehouse; // навигационное свойство
  supplier?: string;
  price: number;
  lastUpdated: Date;
  createdAt: Date;
}

// Интерфейс заявки
export interface Request {
  id: string;
  requestNumber: string;
  requestType: RequestType; // incoming | writeoff | transfer
  status: RequestStatus;
  warehouseId: number; // ID площадки, к которой относится заявка
  transferWarehouseId?: number; // целевая площадка при перемещении
  warehouse?: Warehouse; // навигационное свойство
  transferWarehouse?: Warehouse; // навигационное свойство для целевой площадки
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
  currentQuantity?: number;
  location?: string;
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

// Интерфейс аудит лога (новая система логирования)
export interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId?: string;
  userId?: number;
  userName?: string;
  warehouseId?: number;
  warehouseName?: string;
  details?: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
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

// Интерфейс перемещения между площадками
export interface Transfer {
  id: number;
  fromWarehouseId: number;
  toWarehouseId?: number;
  startedAt?: Date | string;
  completedAt?: Date | string;
  status?: RequestStatus;
  products?: RequestProduct[];
  createdBy?: string | number;
  createdByUser?: User;
  approvedBy?: string | number;
  approvedByUser?: User;
  completedBy?: string | number;
  completedByUser?: User;
  [key: string]: unknown;
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
