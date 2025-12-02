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
      const response = await this.fetchApi<any>('/users/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (!response || !response.user) {
        throw new Error('Неверные учетные данные');
      }

      const user: User = {
        id: String(response.user.id),
        username: response.user.username,
        email: response.user.email,
        role: response.user.role as UserRole,
        firstName: response.user.firstName || response.user.username,
        lastName: response.user.lastName || '',
        isActive: response.user.isActive,
        createdAt: new Date(response.user.createdAt),
        warehouseId: response.user.warehouseId,
      };

      const token = response.token || `bearer_${response.user.id}`;
      this.setToken(token);

      return {
        user,
        token,
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

  async createWarehouse(data: { name: string; location: string }): Promise<Warehouse> {
    const result = await this.fetchApi<any>('/warehouses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return {
      id: result.id,
      name: result.name,
      location: result.location,
      createdAt: new Date(result.createdAt),
    };
  }

  private categoriesCache: any[] | null = null;

  // ==================== CATEGORIES ====================

  async getCategories() {
    if (this.categoriesCache) return this.categoriesCache;
    const data = await this.fetchApi<any[]>('/categories');
    this.categoriesCache = data;
    return data;
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
    const categories = await this.getCategories();
    return data.map((p: any) => ({
      id: String(p.id),
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      qrCode: p.qrCode,
      category: categories.find(c => c.id === p.categoryId)?.name || `ID:${p.categoryId}`,
      quantity: p.quantity,
      minQuantity: p.minQuantity || 50,
      location: p.location || '',
      warehouseId: p.warehouseId,
      supplier: p.supplier || '',
      price: p.price,
      lastUpdated: new Date(p.updatedAt),
      createdAt: new Date(p.createdAt),
    }));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    try {
      const data = await this.fetchApi<any>(`/products/${id}`);
      if (!data) return undefined;
      const categories = await this.getCategories();
      return {
        id: String(data.id),
        name: data.name,
        sku: data.sku,
        barcode: data.barcode,
        qrCode: data.qrCode,
        category: categories.find(c => c.id === data.categoryId)?.name || `ID:${data.categoryId}`,
        quantity: data.quantity,
        minQuantity: data.minQuantity || 50,
        location: data.location || '',
        warehouseId: data.warehouseId,
        supplier: data.supplier || '',
        price: data.price,
        lastUpdated: new Date(data.updatedAt),
        createdAt: new Date(data.createdAt),
      };
    } catch {
      return undefined;
    }
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>): Promise<Product> {
    // Получить категорию по имени или используя ID напрямую
    let categoryId = parseInt(product.category);
    if (isNaN(categoryId)) {
      const categories = await this.getCategories();
      const cat = categories.find(c => c.name === product.category);
      if (!cat) {
        throw new Error(`Категория "${product.category}" не найдена`);
      }
      categoryId = cat.id;
    }

    const data = await this.fetchApi<any>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: product.name,
        sku: product.sku,
        categoryId: categoryId,
        price: product.price,
        quantity: product.quantity,
        barcode: product.barcode,
        qrCode: product.qrCode,
        warehouseId: product.warehouseId,
        location: product.location || '',
        minQuantity: product.minQuantity || 50,
      }),
    });

    const categories = await this.getCategories();
    return {
      id: String(data.id),
      name: data.name,
      sku: data.sku,
      barcode: data.barcode,
      qrCode: data.qrCode,
      category: categories.find(c => c.id === data.categoryId)?.name || `ID:${data.categoryId}`,
      quantity: data.quantity,
      minQuantity: data.minQuantity || 50,
      location: data.location || '',
      warehouseId: data.warehouseId,
      supplier: data.supplier || '',
      price: data.price,
      lastUpdated: new Date(data.updatedAt),
      createdAt: new Date(data.createdAt),
    };
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    try {
      // Получить категорию по имени если нужно
      let categoryId: number | undefined;
      if (updates.category) {
        categoryId = parseInt(updates.category);
        if (isNaN(categoryId)) {
          const categories = await this.getCategories();
          const cat = categories.find(c => c.name === updates.category);
          if (cat) {
            categoryId = cat.id;
          }
        }
      }

      const body: any = {
        name: updates.name,
        sku: updates.sku,
        price: updates.price,
        quantity: updates.quantity,
        barcode: updates.barcode,
        qrCode: updates.qrCode,
        location: updates.location,
        minQuantity: updates.minQuantity,
        supplier: updates.supplier,
        warehouseId: updates.warehouseId,
      };

      if (categoryId) {
        body.categoryId = categoryId;
      }

      const data = await this.fetchApi<any>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      if (!data) {
        console.error('Ошибка при обновлении товара: нет данных в ответе');
        return undefined;
      }

      const categories = await this.getCategories();
      return {
        id: String(data.id),
        name: data.name,
        sku: data.sku,
        barcode: data.barcode,
        qrCode: data.qrCode,
        category: categories.find(c => c.id === data.categoryId)?.name || `ID:${data.categoryId}`,
        quantity: data.quantity,
        minQuantity: data.minQuantity || 50,
        location: data.location || '',
        warehouseId: data.warehouseId,
        supplier: data.supplier || '',
        price: data.price,
        lastUpdated: new Date(data.updatedAt),
        createdAt: new Date(data.createdAt),
      };
    } catch (error) {
      console.error('Ошибка при обновлении товара:', error);
      return undefined;
    }
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
    return data.map((r: any) => {
      // Преобразуем RequestProducts в RequestProduct[] (фронтенд формат)
      const products = (r.requestProducts || []).map((rp: any) => ({
        productId: String(rp.productId),
        productName: rp.product?.name || `Product ${rp.productId}`,
        quantity: rp.quantity,
        location: rp.product?.location || undefined,
      }));

      return {
        id: String(r.id),
        requestNumber: `REQ-${r.id}`,
        requestType: 'transfer',
        status: r.status,
        warehouseId: r.warehouseId,
        transferWarehouseId: r.transferWarehouseId,
        products: products,
        createdBy: String(r.userId),
        createdAt: new Date(r.createdAt),
        approvedBy: r.approvedBy ? String(r.approvedBy) : undefined,
        approvedAt: r.approvedAt ? new Date(r.approvedAt) : undefined,
        completedBy: r.completedBy ? String(r.completedBy) : undefined,
        completedAt: r.completedAt ? new Date(r.completedAt) : undefined,
        priority: 'normal',
        notes: r.notes,
      };
    });
  }

  async getRequestById(id: string): Promise<Request | undefined> {
    try {
      const data = await this.fetchApi<any>(`/requests/${id}`);
      if (!data) return undefined;

      console.log('Backend response for request:', data);
      console.log('RequestProducts:', data.requestProducts);

      // Преобразуем RequestProducts в RequestProduct[] (фронтенд формат)
      const products = (data.requestProducts || []).map((rp: any) => ({
        productId: String(rp.productId),
        productName: rp.product?.name || `Product ${rp.productId}`,
        quantity: rp.quantity,
        location: rp.product?.location || undefined,
      }));

      console.log('Transformed products:', products);

      return {
        id: String(data.id),
        requestNumber: `REQ-${data.id}`,
        requestType: 'transfer',
        status: data.status,
        warehouseId: data.warehouseId,
        transferWarehouseId: data.transferWarehouseId,
        products: products,
        createdBy: String(data.userId),
        createdAt: new Date(data.createdAt),
        approvedBy: data.approvedBy ? String(data.approvedBy) : undefined,
        approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
        completedBy: data.completedBy ? String(data.completedBy) : undefined,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
        priority: 'normal',
        notes: data.notes,
      };
    } catch {
      return undefined;
    }
  }

  async getRequestsByWarehouse(warehouseId: number): Promise<Request[]> {
    const allRequests = await this.getRequests();
    return allRequests.filter(r => r.warehouseId === warehouseId);
  }

  async createRequest(request: Omit<Request, 'id' | 'createdAt' | 'requestNumber'>): Promise<Request> {
    // Сначала создаём Request БЕЗ товаров (Request больше не имеет productId и quantity)
    const data = await this.fetchApi<any>('/requests', {
      method: 'POST',
      body: JSON.stringify({
        userId: parseInt(request.createdBy),
        warehouseId: request.warehouseId,
        transferWarehouseId: request.transferWarehouseId,
        status: request.status,
        notes: request.notes,
      }),
    });

    const requestId = data.id;

    // Теперь добавляем ВСЕ товары через endpoint /requests/{id}/products
    if (request.products.length > 0) {
      for (const product of request.products) {
        await this.fetchApi(`/requests/${requestId}/products`, {
          method: 'POST',
          body: JSON.stringify({
            productId: parseInt(String(product.productId)),
            quantity: product.quantity,
          }),
        });
      }
    }

    // Загружаем обновленную заявку с товарами
    const updated = await this.getRequestById(String(requestId));
    if (updated) {
      return updated;
    }

    return {
      id: String(data.id),
      requestNumber: `REQ-${data.id}`,
      requestType: request.requestType,
      status: data.status,
      warehouseId: data.warehouseId,
      transferWarehouseId: data.transferWarehouseId,
      products: request.products,
      createdBy: String(data.userId),
      createdAt: new Date(data.createdAt),
      priority: request.priority,
      notes: data.notes,
    };
  }

  async updateRequest(id: string, request: Partial<Request>): Promise<Request | undefined> {
    // Обновляем основные поля Request
    const data = await this.fetchApi<any>(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        id: parseInt(id),
        warehouseId: request.warehouseId,
        transferWarehouseId: request.transferWarehouseId,
        status: request.status,
        notes: request.notes,
        priority: request.priority,
      }),
    });

    // Если обновляем товары - нужно удалить старые и добавить новые
    if (request.products && request.products.length > 0) {
      // Сначала удаляем все старые товары
      const existingRequest = await this.getRequestById(id);
      if (existingRequest?.products) {
        for (const product of existingRequest.products) {
          await this.fetchApi(`/requests/${id}/products/${product.productId}`, {
            method: 'DELETE',
          });
        }
      }

      // Теперь добавляем новые товары
      for (const product of request.products) {
        await this.fetchApi(`/requests/${id}/products`, {
          method: 'POST',
          body: JSON.stringify({
            productId: parseInt(String(product.productId)),
            quantity: product.quantity,
          }),
        });
      }
    }

    // Загружаем обновленную заявку с товарами
    const updated = await this.getRequestById(id);
    return updated;
  }

  async updateRequestStatus(id: string, status: Request['status'], loggedInUserId: number): Promise<Request | undefined> {
    try {
      const data = await this.fetchApi<any>(`/requests/${id}/status?loggedInUserId=${loggedInUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({ newStatus: status }),
      });

      if (!data) return undefined;

      return {
        id: String(data.id),
        requestNumber: `REQ-${data.id}`,
        requestType: 'transfer',
        status: data.status,
        warehouseId: data.warehouseId,
        transferWarehouseId: data.transferWarehouseId,
        products: [],
        createdBy: String(data.userId),
        createdAt: new Date(data.createdAt),
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
        completedBy: data.completedBy,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
        priority: 'normal',
        notes: data.notes,
      };
    } catch (error) {
      console.error('Ошибка при обновлении статуса заявки:', error);
      throw error;
    }
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
      warehouseId: u.warehouseId,
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
        warehouseId: data.warehouseId,
      };
    } catch {
      return undefined;
    }
  }

  async createUser(userData: {
    username: string;
    password: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    role: 'admin' | 'manager' | 'warehouseman';
    warehouseId?: number;
  }): Promise<User | undefined> {
    try {
      const body = {
        username: userData.username,
        passwordHash: userData.password, // Backend ожидает passwordHash
        email: userData.email || 'user@warehouse.local',
        firstName: userData.firstName || userData.username,
        lastName: userData.lastName || '',
        role: userData.role,
        warehouseId: userData.warehouseId || null,
        isActive: true,
      };

      const data = await this.fetchApi<any>('/users', {
        method: 'POST',
        body: JSON.stringify(body),
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
        warehouseId: data.warehouseId,
      };
    } catch (error) {
      console.error('Ошибка при создании пользователя:', error);
      return undefined;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    console.log('updateUser payload:', updates);
    try {
      const data = await this.fetchApi<any>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      // Если 204 No Content (data === null), возвращаем обновлённые данные
      if (data === null) {
        return {
          id: String(updates.id || id),
          username: updates.username || '',
          email: updates.email || '',
          passwordHash: updates.passwordHash,
          role: (updates.role as UserRole) || 'warehouseman',
          firstName: updates.firstName || '',
          lastName: updates.lastName || '',
          isActive: updates.isActive !== undefined ? updates.isActive : true,
          createdAt: new Date(),
          warehouseId: updates.warehouseId,
        };
      }

      // Если есть данные в ответе, используем их
      return {
        id: String(data.id),
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role as UserRole,
        firstName: data.firstName || data.username,
        lastName: data.lastName || '',
        isActive: data.isActive,
        createdAt: new Date(data.createdAt),
        warehouseId: data.warehouseId,
      };
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      return undefined;
    }
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
