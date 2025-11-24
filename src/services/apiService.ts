import type { User, UserRole, Request, Product, SystemLog, AuthSession, Warehouse } from '../types';

const API_URL = 'http://localhost:5000/api';

// Класс для работы с API
class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  private getHeaders() {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Неавторизован
        this.token = null;
        throw new Error('Неавторизован. Пожалуйста, войдите заново.');
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Ошибка: ${response.statusText}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // ==================== AUTHENTIFICATION ====================

  async login(username: string, password: string): Promise<AuthSession> {
    try {
      // Попытка логина к реальному API (будет добавлено позже)
      // const response = await this.fetchApi<{ token: string; user: User }>('/auth/login', {
      //   method: 'POST',
      //   body: JSON.stringify({ username, password }),
      // });
      // return {
      //   user: response.user,
      //   token: response.token,
      //   expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      // };

      // Для теста используем mock данные
      const mockUsers = [
        { id: 1, username: 'warehouseman1', role: 'warehouseman' as UserRole },
        { id: 2, username: 'manager1', role: 'manager' as UserRole },
        { id: 3, username: 'admin', role: 'admin' as UserRole },
      ];

      const user = mockUsers.find(u => u.username === username);
      if (!user || password !== 'password') {
        throw new Error('Неверные учетные данные');
      }

      return {
        user: {
          id: String(user.id),
          username: user.username,
          email: `${user.username}@abzvad.com`,
          role: user.role,
          firstName: username === 'warehouseman1' ? 'Иван' : username === 'manager1' ? 'Сергей' : 'Алексей',
          lastName: username === 'warehouseman1' ? 'Петров' : username === 'manager1' ? 'Иванов' : 'Смирнов',
          isActive: true,
          createdAt: new Date(),
          warehouse: user.role === 'admin' ? undefined : 'zone-a',
        },
        token: `token_${user.id}_${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.token = null;
  }

  // ==================== WAREHOUSES ====================

  async getWarehouses(): Promise<Warehouse[]> {
    const data = await this.fetchApi<any[]>('/warehouses');
    return data.map((w: any) => ({
      id: w.id,
      name: w.name,
      location: w.location,
      createdAt: new Date(w.createdAt),
    }));
  }

  async getWarehouseById(id: string): Promise<Warehouse | undefined> {
    const data = await this.fetchApi<any>(`/warehouses/${id}`);
    if (!data) return undefined;
    return {
      id: data.id,
      name: data.name,
      location: data.location,
      createdAt: new Date(data.createdAt),
    };
  }

  async getWarehouseName(id: string): Promise<string> {
    try {
      const warehouse = await this.getWarehouseById(id);
      return warehouse?.name || 'Неизвестная площадка';
    } catch {
      return 'Неизвестная площадка';
    }
  }

  // ==================== CATEGORIES ====================

  async getCategories() {
    return this.fetchApi<any[]>('/categories');
  }

  async getCategoryById(id: number) {
    return this.fetchApi<any>(`/categories/${id}`);
  }

  async createCategory(name: string, description?: string) {
    return this.fetchApi<any>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async updateCategory(id: number, name: string, description?: string) {
    return this.fetchApi<any>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description }),
    });
  }

  async deleteCategory(id: number) {
    return this.fetchApi<void>(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== PRODUCTS ====================

  async getProducts(warehouse?: string): Promise<Product[]> {
    let endpoint = '/products';
    if (warehouse) {
      endpoint += `?warehouse=${warehouse}`;
    }

    const data = await this.fetchApi<any[]>(endpoint);
    return data.map((p: any) => ({
      id: String(p.id),
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      qrCode: p.qrCode,
      category: `${p.categoryId}`, // Будет использовано как ID категории
      quantity: p.quantity,
      minQuantity: 50,
      location: '',
      warehouse: p.warehouse,
      supplier: '',
      price: p.price,
      lastUpdated: new Date(p.updatedAt),
      createdAt: new Date(p.createdAt),
    }));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    try {
      const data = await this.fetchApi<any>(`/products/${id}`);
      if (!data) return undefined;
      return {
        id: String(data.id),
        name: data.name,
        sku: data.sku,
        barcode: data.barcode,
        qrCode: data.qrCode,
        category: `${data.categoryId}`,
        quantity: data.quantity,
        minQuantity: 50,
        location: '',
        warehouse: data.warehouse,
        supplier: '',
        price: data.price,
        lastUpdated: new Date(data.updatedAt),
        createdAt: new Date(data.createdAt),
      };
    } catch {
      return undefined;
    }
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>): Promise<Product> {
    const data = await this.fetchApi<any>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: product.name,
        sku: product.sku,
        categoryId: parseInt(product.category),
        price: product.price,
        quantity: product.quantity,
        barcode: product.barcode,
        qrCode: product.qrCode,
        warehouse: product.warehouse,
      }),
    });

    return {
      id: String(data.id),
      name: data.name,
      sku: data.sku,
      barcode: data.barcode,
      qrCode: data.qrCode,
      category: `${data.categoryId}`,
      quantity: data.quantity,
      minQuantity: 50,
      location: '',
      warehouse: data.warehouse,
      supplier: '',
      price: data.price,
      lastUpdated: new Date(data.updatedAt),
      createdAt: new Date(data.createdAt),
    };
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const data = await this.fetchApi<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: updates.name,
        sku: updates.sku,
        categoryId: updates.category ? parseInt(updates.category) : undefined,
        price: updates.price,
        quantity: updates.quantity,
        barcode: updates.barcode,
        qrCode: updates.qrCode,
      }),
    });

    if (!data) return undefined;

    return {
      id: String(data.id),
      name: data.name,
      sku: data.sku,
      barcode: data.barcode,
      qrCode: data.qrCode,
      category: `${data.categoryId}`,
      quantity: data.quantity,
      minQuantity: 50,
      location: '',
      warehouse: data.warehouse,
      supplier: '',
      price: data.price,
      lastUpdated: new Date(data.updatedAt),
      createdAt: new Date(data.createdAt),
    };
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      await this.fetchApi<void>(`/products/${id}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return false;
    }
  }

  async getLowStockProducts(): Promise<Product[]> {
    // Получаем все товары и фильтруем по количеству
    const products = await this.getProducts();
    return products.filter(p => p.quantity <= p.minQuantity);
  }

  // ==================== REQUESTS ====================

  async getRequests(): Promise<Request[]> {
    const data = await this.fetchApi<any[]>('/requests');
    return data.map((r: any) => ({
      id: String(r.id),
      requestNumber: `REQ-${r.id}`,
      requestType: 'transfer',
      status: r.status,
      warehouse: r.warehouse,
      transferWarehouse: r.transferWarehouse,
      products: [],
      createdBy: String(r.userId),
      createdAt: new Date(r.createdAt),
      priority: 'normal',
      notes: r.notes,
    }));
  }

  async getRequestById(id: string): Promise<Request | undefined> {
    try {
      const data = await this.fetchApi<any>(`/requests/${id}`);
      if (!data) return undefined;
      return {
        id: String(data.id),
        requestNumber: `REQ-${data.id}`,
        requestType: 'transfer',
        status: data.status,
        warehouse: data.warehouse,
        transferWarehouse: data.transferWarehouse,
        products: [],
        createdBy: String(data.userId),
        createdAt: new Date(data.createdAt),
        priority: 'normal',
        notes: data.notes,
      };
    } catch {
      return undefined;
    }
  }

  async getRequestsByWarehouse(warehouseId: string): Promise<Request[]> {
    const allRequests = await this.getRequests();
    return allRequests.filter(r => r.warehouse === warehouseId);
  }

  async createRequest(request: Omit<Request, 'id' | 'createdAt' | 'requestNumber'>): Promise<Request> {
    const data = await this.fetchApi<any>('/requests', {
      method: 'POST',
      body: JSON.stringify({
        userId: parseInt(request.createdBy),
        productId: request.products[0]?.productId || 1,
        warehouse: request.warehouse,
        transferWarehouse: request.transferWarehouse,
        quantity: request.products[0]?.quantity || 0,
        status: request.status,
        notes: request.notes,
      }),
    });

    return {
      id: String(data.id),
      requestNumber: `REQ-${data.id}`,
      requestType: request.requestType,
      status: data.status,
      warehouse: data.warehouse,
      transferWarehouse: data.transferWarehouse,
      products: request.products,
      createdBy: String(data.userId),
      createdAt: new Date(data.createdAt),
      priority: request.priority,
      notes: data.notes,
    };
  }

  async updateRequestStatus(id: string, status: Request['status']): Promise<Request | undefined> {
    const data = await this.fetchApi<any>(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });

    if (!data) return undefined;

    return {
      id: String(data.id),
      requestNumber: `REQ-${data.id}`,
      requestType: 'transfer',
      status: data.status,
      warehouse: data.warehouse,
      transferWarehouse: data.transferWarehouse,
      products: [],
      createdBy: String(data.userId),
      createdAt: new Date(data.createdAt),
      priority: 'normal',
      notes: data.notes,
    };
  }

  // ==================== TRANSFERS ====================

  async getTransfers() {
    return this.fetchApi<any[]>('/transfers');
  }

  async getTransferById(id: string) {
    return this.fetchApi<any>(`/transfers/${id}`);
  }

  async createTransfer(data: {
    fromWarehouse: string;
    toWarehouse: string;
    createdByUserId: number;
  }) {
    return this.fetchApi<any>('/transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransferStatus(id: string, status: string) {
    return this.fetchApi<any>(`/transfers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // ==================== TRANSFER PRODUCTS ====================

  async getTransferProducts() {
    return this.fetchApi<any[]>('/transfer-products');
  }

  async addProductToTransfer(transferId: number, productId: number, quantity: number) {
    return this.fetchApi<any>('/transfer-products', {
      method: 'POST',
      body: JSON.stringify({ transferId, productId, quantity }),
    });
  }

  async updateTransferProduct(id: number, quantity: number, receivedQuantity?: number) {
    return this.fetchApi<any>(`/transfer-products/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity, receivedQuantity }),
    });
  }

  // ==================== TRANSFER COMMENTS ====================

  async getTransferComments(transferId: number) {
    return this.fetchApi<any[]>(`/transfer-comments/transfer/${transferId}`);
  }

  async addTransferComment(transferId: number, userId: number, text: string) {
    return this.fetchApi<any>('/transfer-comments', {
      method: 'POST',
      body: JSON.stringify({ transferId, userId, text }),
    });
  }

  async deleteTransferComment(id: number) {
    return this.fetchApi<void>(`/transfer-comments/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== USERS ====================

  async getUsers(): Promise<User[]> {
    const data = await this.fetchApi<any[]>('/users');
    return data.map((u: any) => ({
      id: String(u.id),
      username: u.username,
      email: u.email,
      role: u.role as UserRole,
      firstName: u.firstName || u.username,
      lastName: u.lastName || '',
      isActive: u.isActive,
      createdAt: new Date(u.createdAt),
      warehouse: u.warehouse,
    }));
  }

  async getUserById(id: string): Promise<User | undefined> {
    try {
      const data = await this.fetchApi<any>(`/users/${id}`);
      if (!data) return undefined;
      return {
        id: String(data.id),
        username: data.username,
        email: data.email,
        role: data.role as UserRole,
        firstName: data.firstName || data.username,
        lastName: data.lastName || '',
        isActive: data.isActive,
        createdAt: new Date(data.createdAt),
        warehouse: data.warehouse,
      };
    } catch {
      return undefined;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const data = await this.fetchApi<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (!data) return undefined;

    return {
      id: String(data.id),
      username: data.username,
      email: data.email,
      role: data.role as UserRole,
      firstName: data.firstName || data.username,
      lastName: data.lastName || '',
      isActive: data.isActive,
      createdAt: new Date(data.createdAt),
      warehouse: data.warehouse,
    };
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await this.fetchApi<void>(`/users/${id}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return false;
    }
  }

  // ==================== LOGS ====================

  async getLogs(): Promise<SystemLog[]> {
    // Для логов используем mock данные, так как это админ функция
    return [];
  }
}

export const apiService = new ApiService();
