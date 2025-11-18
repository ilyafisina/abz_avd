# 🔗 Инструкция по подключению реального сервера

Этот документ описывает, как заменить mock сервис на реальные API запросы.

## 📋 Шаг 1: Подготовка

### Установите HTTP клиент (если нужен)

Вариант 1: Используйте встроенный fetch API (рекомендуется для современных браузеров)
```bash
# Не требует установки
```

Вариант 2: Используйте axios
```bash
npm install axios
```

## 🔄 Шаг 2: Создание API сервиса

Создайте новый файл `src/services/apiService.ts`:

```typescript
import type { User, Product, Request, SystemLog, AuthSession } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Хелпер функция для обработки ошибок
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

// ============ АУТЕНТИФИКАЦИЯ ============
export const authService = {
  async login(username: string, password: string): Promise<AuthSession> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
  },

  async logout(): Promise<void> {
    const token = localStorage.getItem('authSession');
    if (!token) return;

    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JSON.parse(token).token}`,
      },
    });
  },

  async register(
    username: string,
    email: string,
    password: string,
    role: string,
    firstName?: string,
    lastName?: string
  ): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        role,
        firstName,
        lastName,
      }),
    });
    return handleResponse(response);
  },

  async validateToken(token: string): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/validate`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return handleResponse(response);
    } catch {
      return null;
    }
  },
};

// ============ ТОВАРЫ ============
export const productService = {
  async getProducts(): Promise<Product[]> {
    const response = await fetch(`${API_BASE_URL}/products`);
    return handleResponse(response);
  },

  async getProductById(id: string): Promise<Product | undefined> {
    const response = await fetch(`${API_BASE_URL}/products/${id}`);
    if (response.status === 404) return undefined;
    return handleResponse(response);
  },

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>): Promise<Product> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(product),
    });
    return handleResponse(response);
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    if (response.status === 404) return undefined;
    return handleResponse(response);
  },

  async deleteProduct(id: string): Promise<boolean> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.status === 204 || response.ok;
  },

  async getLowStockProducts(): Promise<Product[]> {
    const response = await fetch(`${API_BASE_URL}/products?lowStock=true`);
    return handleResponse(response);
  },
};

// ============ ЗАЯВКИ ============
export const requestService = {
  async getRequests(): Promise<Request[]> {
    const response = await fetch(`${API_BASE_URL}/requests`);
    return handleResponse(response);
  },

  async getRequestById(id: string): Promise<Request | undefined> {
    const response = await fetch(`${API_BASE_URL}/requests/${id}`);
    if (response.status === 404) return undefined;
    return handleResponse(response);
  },

  async createRequest(request: Omit<Request, 'id' | 'createdAt' | 'requestNumber'>): Promise<Request> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  async updateRequestStatus(id: string, status: Request['status']): Promise<Request | undefined> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/requests/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (response.status === 404) return undefined;
    return handleResponse(response);
  },

  async approveRequest(id: string, approvedBy: string): Promise<Request | undefined> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/requests/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ approvedBy }),
    });
    if (response.status === 404) return undefined;
    return handleResponse(response);
  },

  async rejectRequest(id: string): Promise<Request | undefined> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/requests/${id}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (response.status === 404) return undefined;
    return handleResponse(response);
  },
};

// ============ ПОЛЬЗОВАТЕЛИ ============
export const userService = {
  async getUsers(): Promise<User[]> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async getUserById(id: string): Promise<User | undefined> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (response.status === 404) return undefined;
    return handleResponse(response);
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    if (response.status === 404) return undefined;
    return handleResponse(response);
  },

  async deleteUser(id: string): Promise<boolean> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.status === 204 || response.ok;
  },

  async updateContactData(id: string, contactData: Record<string, unknown>): Promise<User | undefined> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/users/${id}/contact`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(contactData),
    });
    if (response.status === 404) return undefined;
    return handleResponse(response);
  },
};

// ============ ЛОГИРОВАНИЕ ============
export const loggingService = {
  async getLogs(): Promise<SystemLog[]> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/logs`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async addLog(log: Omit<SystemLog, 'id'>): Promise<SystemLog> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(log),
    });
    return handleResponse(response);
  },

  async getLogsByUser(userId: string): Promise<SystemLog[]> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/logs?userId=${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async getLogsByEntity(entityType: string, entityId: string): Promise<SystemLog[]> {
    const token = JSON.parse(localStorage.getItem('authSession') || '{}').token;
    const response = await fetch(`${API_BASE_URL}/logs?entityType=${entityType}&entityId=${entityId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
  },
};
```

## 🔌 Шаг 3: Замена импорта

В компонентах, которые используют сервисы, замените:

```typescript
// Было:
import { productService } from '../../services/mockService';

// Стало:
import { productService } from '../../services/apiService';
```

Или используйте абсолютный импорт, если настроите tsconfig:

```typescript
import { productService } from '@services/apiService';
```

## ⚙️ Шаг 4: Переменные окружения

Создайте файл `.env`:

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_ENV=development
```

Используйте в коде:

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
```

## 🛡️ Шаг 5: Обработка ошибок

Добавьте хелпер для обработки ошибок в компонентах:

```typescript
const [error, setError] = useState<string | null>(null);

try {
  const data = await productService.getProducts();
  setProducts(data);
} catch (err) {
  setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
}
```

## 📝 Примеры API эндпоинтов

Ваш backend должен реализовать следующие эндпоинты:

### Аутентификация
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/register
GET    /api/auth/validate
```

### Товары
```
GET    /api/products
GET    /api/products/:id
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id
GET    /api/products?lowStock=true
```

### Заявки
```
GET    /api/requests
GET    /api/requests/:id
POST   /api/requests
PATCH  /api/requests/:id/status
POST   /api/requests/:id/approve
POST   /api/requests/:id/reject
```

### Пользователи
```
GET    /api/users
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id
PATCH  /api/users/:id/contact
```

### Логирование
```
GET    /api/logs
POST   /api/logs
GET    /api/logs?userId=:userId
GET    /api/logs?entityType=:type&entityId=:id
```

## 🔐 Аутентификация

Все запросы (кроме login/register/validate) требуют заголовка:

```
Authorization: Bearer <token>
```

Токен получается при логине и хранится в localStorage.

## ✅ Проверка

После подключения сервера:

1. Протестируйте каждый эндпоинт
2. Проверьте обработку ошибок
3. Убедитесь, что токены передаются правильно
4. Проверьте корректность данных

## 🎯 Рекомендации

- Используйте fetch API - встроен в современные браузеры
- Добавьте обработку ошибок на уровне компонентов
- Используйте loading стейт при загрузке данных
- Кэшируйте данные если возможно
- Добавьте retry логику для критичных запросов

---

**Готово к использованию!** Замените mock сервис и наслаждайтесь полнофункциональным приложением.
