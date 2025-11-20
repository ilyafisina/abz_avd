import type { User, UserRole, Request, Product, SystemLog, AuthSession } from '../types';

// Mock данные для товаров
export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Асфальтобетонная смесь АБЗ-1',
    sku: 'ABZ-001',
    barcode: '4601234567890',
    qrCode: 'https://abzvad.ru/product/1',
    category: 'асфальтобетонные смеси',
    quantity: 150,
    minQuantity: 50,
    location: 'A1-001',
    warehouse: 'Москва',
    supplier: 'ООО АБЗ ВАД',
    price: 2500,
    lastUpdated: new Date(),
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'Щебень фракция 5-20',
    sku: 'SCH-002',
    barcode: '4601234567891',
    category: 'щебень',
    quantity: 300,
    minQuantity: 100,
    location: 'B1-002',
    warehouse: 'Москва',
    supplier: 'ООО Камень',
    price: 1200,
    lastUpdated: new Date(),
    createdAt: new Date('2024-01-05'),
  },
  {
    id: '3',
    name: 'Песок строительный',
    sku: 'PSK-003',
    barcode: '4601234567892',
    category: 'песок',
    quantity: 45,
    minQuantity: 100,
    location: 'C1-003',
    warehouse: 'Санкт-Петербург',
    supplier: 'ООО Песок Плюс',
    price: 800,
    lastUpdated: new Date(),
    createdAt: new Date('2024-01-10'),
  },
];

// Mock данные для пользователей
export const mockUsers: User[] = [
  {
    id: '1',
    username: 'warehouseman1',
    email: 'warehouseman1@abzvad.com',
    role: 'warehouseman',
    firstName: 'Иван',
    lastName: 'Петров',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    warehouseArea: 'Зона A',
    warehouse: 'Москва',
  },
  {
    id: '2',
    username: 'manager1',
    email: 'manager1@abzvad.com',
    role: 'manager',
    firstName: 'Сергей',
    lastName: 'Иванов',
    isActive: true,
    createdAt: new Date('2024-01-02'),
    warehouse: 'Москва',
  },
  {
    id: '3',
    username: 'admin',
    email: 'admin@abzvad.com',
    role: 'admin',
    firstName: 'Алексей',
    lastName: 'Смирнов',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
];

// Mock данные для заявок
export const mockRequests: Request[] = [
  {
    id: '1',
    requestNumber: 'REQ-2024-001',
    requestType: 'sale',
    status: 'pending',
    products: [
      {
        productId: '1',
        productName: 'Асфальтобетонная смесь АБЗ-1',
        quantity: 50,
        currentQuantity: 150,
        location: 'A1-001',
      },
    ],
    createdBy: '2',
    createdAt: new Date(),
    priority: 'high',
    notes: 'Срочная поставка для объекта на ул. Ленина',
  },
  {
    id: '2',
    requestNumber: 'REQ-2024-002',
    requestType: 'purchase',
    status: 'approved',
    products: [
      {
        productId: '2',
        productName: 'Щебень фракция 5-20',
        quantity: 100,
        currentQuantity: 300,
        location: 'B1-002',
      },
    ],
    createdBy: '2',
    createdAt: new Date(Date.now() - 86400000),
    approvedBy: '3',
    approvedAt: new Date(Date.now() - 43200000),
    priority: 'normal',
  },
];

// Mock данные для логов системы
export const mockSystemLogs: SystemLog[] = [
  {
    id: '1',
    userId: '1',
    userName: 'warehouseman1',
    action: 'Просмотр товара',
    entityType: 'product',
    entityId: '1',
    timestamp: new Date(),
  },
  {
    id: '2',
    userId: '2',
    userName: 'manager1',
    action: 'Создание заявки',
    entityType: 'request',
    entityId: '1',
    timestamp: new Date(Date.now() - 3600000),
  },
];

// Сервис аутентификации (mock)
export const authService = {
  async login(username: string, password: string): Promise<AuthSession> {
    // Имитация API запроса
    await new Promise(resolve => setTimeout(resolve, 500));

    const user = mockUsers.find(u => u.username === username);
    if (!user || password !== 'password') {
      throw new Error('Неверные учетные данные');
    }

    return {
      user,
      token: `token_${user.id}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  },

  async logout(): Promise<void> {
    // Имитация API запроса
    await new Promise(resolve => setTimeout(resolve, 300));
  },

  async register(
    username: string,
    email: string,
    _password: string,
    role: UserRole,
    firstName?: string,
    lastName?: string
  ): Promise<User> {
    // Имитация API запроса
    await new Promise(resolve => setTimeout(resolve, 500));

    const newUser: User = {
      id: `${mockUsers.length + 1}`,
      username,
      email,
      role,
      firstName,
      lastName,
      isActive: true,
      createdAt: new Date(),
    };

    return newUser;
  },

  async validateToken(token: string): Promise<User | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    // Простая проверка токена
    return token ? mockUsers[0] : null;
  },
};

// Сервис товаров (mock)
export const productService = {
  async getProducts(): Promise<Product[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockProducts;
  },

  async getProductById(id: string): Promise<Product | undefined> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockProducts.find(p => p.id === id);
  },

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>): Promise<Product> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newProduct: Product = {
      ...product,
      id: `${mockProducts.length + 1}`,
      createdAt: new Date(),
      lastUpdated: new Date(),
    };
    mockProducts.push(newProduct);
    return newProduct;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const product = mockProducts.find(p => p.id === id);
    if (product) {
      Object.assign(product, updates, { lastUpdated: new Date() });
    }
    return product;
  },

  async deleteProduct(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      mockProducts.splice(index, 1);
      return true;
    }
    return false;
  },

  async getLowStockProducts(): Promise<Product[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockProducts.filter(p => p.quantity <= p.minQuantity);
  },
};

// Сервис заявок (mock)
export const requestService = {
  async getRequests(): Promise<Request[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockRequests;
  },

  async getRequestById(id: string): Promise<Request | undefined> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockRequests.find(r => r.id === id);
  },

  async createRequest(request: Omit<Request, 'id' | 'createdAt' | 'requestNumber'>): Promise<Request> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newRequest: Request = {
      ...request,
      id: `${mockRequests.length + 1}`,
      requestNumber: `REQ-${new Date().getFullYear()}-${String(mockRequests.length + 1).padStart(3, '0')}`,
      createdAt: new Date(),
    };
    mockRequests.push(newRequest);
    return newRequest;
  },

  async updateRequestStatus(id: string, status: Request['status']): Promise<Request | undefined> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const request = mockRequests.find(r => r.id === id);
    if (request) {
      request.status = status;
      if (status === 'completed') {
        request.completedAt = new Date();
      }
    }
    return request;
  },

  async approveRequest(id: string, approvedBy: string): Promise<Request | undefined> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const request = mockRequests.find(r => r.id === id);
    if (request) {
      request.status = 'approved';
      request.approvedBy = approvedBy;
      request.approvedAt = new Date();
    }
    return request;
  },

  async rejectRequest(id: string): Promise<Request | undefined> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const request = mockRequests.find(r => r.id === id);
    if (request) {
      request.status = 'rejected';
    }
    return request;
  },
};

// Сервис пользователей (mock)
export const userService = {
  async getUsers(): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockUsers;
  },

  async getUserById(id: string): Promise<User | undefined> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockUsers.find(u => u.id === id);
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const user = mockUsers.find(u => u.id === id);
    if (user) {
      Object.assign(user, updates);
    }
    return user;
  },

  async deleteUser(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockUsers.findIndex(u => u.id === id);
    if (index !== -1) {
      mockUsers.splice(index, 1);
      return true;
    }
    return false;
  },

  async updateContactData(id: string, contactData: Record<string, unknown>): Promise<User | undefined> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const user = mockUsers.find(u => u.id === id);
    if (user) {
      Object.assign(user, contactData);
    }
    return user;
  },
};

// Сервис логирования (mock)
export const loggingService = {
  async getLogs(): Promise<SystemLog[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockSystemLogs;
  },

  async addLog(log: Omit<SystemLog, 'id'>): Promise<SystemLog> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const newLog: SystemLog = {
      ...log,
      id: `${mockSystemLogs.length + 1}`,
    };
    mockSystemLogs.push(newLog);
    return newLog;
  },

  async getLogsByUser(userId: string): Promise<SystemLog[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockSystemLogs.filter(log => log.userId === userId);
  },

  async getLogsByEntity(entityType: string, entityId: string): Promise<SystemLog[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockSystemLogs.filter(log => log.entityType === entityType && log.entityId === entityId);
  },
};

// Экспортируем как systemLogService для совместимости
export const systemLogService = {
  async getLogs(): Promise<SystemLog[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockSystemLogs;
  },
};
