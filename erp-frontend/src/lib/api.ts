import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type { 
  InvoiceCreateRequest, 
  PurchaseCreateRequest,
  Category,
  Product,
  Customer,
  StockItem,
  Warehouse,
  InvoiceResponse,
  PurchaseResponse,
  CurrentUser
} from '../types';

// --- Interfaces ---

export interface CategoryCreate {
  name: string;
  color?: string;
  description?: string;
}

export type CategoryUpdate = Partial<CategoryCreate>;

export interface ProductCreate {
  name: string;
  sku?: string;
  unit: string;
  cost_price: number;
  sale_price: number;
  category_id?: string;
  min_stock?: number;
  is_active?: boolean;
}

export type ProductUpdate = Partial<ProductCreate>;

export interface CustomerCreate {
  name: string;
  phone?: string;
  address?: string;
  balance?: number;
  credit_limit?: number;
  branch_id?: string;
}

export interface StockAdjustment {
  product_id: string;
  warehouse_id: string;
  new_quantity: number;
  reason?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  balance: number;
}

// --- API Instance ---

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

interface FailedRequest {
  resolve: (token: string | null) => void;
  reject: (error: AxiosError | Error | null) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: AxiosError | Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        // No refresh token, logout
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post<{ access_token: string; refresh_token: string }>(`${api.defaults.baseURL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = res.data;
        localStorage.setItem('token', access_token);
        localStorage.setItem('refresh_token', newRefreshToken);

        if (api.defaults.headers.common) {
          api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        }
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        processQueue(null, access_token);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

export const categoriesApi = {
  list: (params?: { limit?: number; offset?: number }) => api.get<Category[]>('/categories/', { params }),
  create: (data: CategoryCreate) => api.post<Category>('/categories/', data),
  update: (id: string, data: CategoryUpdate) => api.put<Category>(`/categories/${id}`, data),
  delete: (id: string) => api.delete<void>(`/categories/${id}`),
};

export const productsApi = {
  list: (params?: { search?: string; category_id?: string; limit?: number; offset?: number }) => api.get<Product[]>('/products/', { params }),
  search: (q: string, limit: number = 10) => api.get<Product[]>('/products/search', { params: { q, limit } }),
  create: (data: ProductCreate) => api.post<Product>('/products/', data),
  update: (id: string, data: ProductUpdate) => api.put<Product>(`/products/${id}`, data),
  delete: (id: string) => api.delete<void>(`/products/${id}`),
};

export const warehousesApi = {
  list: () => api.get<Warehouse[]>('/warehouses/'),
};

export const customersApi = {
  list: (params?: { limit?: number; offset?: number; search?: string }) => api.get<Customer[]>('/customers/', { params }),
  create: (data: CustomerCreate) => api.post<Customer>('/customers/', data),
};

export const stockApi = {
  list: (params?: { 
    search?: string; 
    branch_id?: string; 
    warehouse_id?: string; 
    limit?: number; 
    offset?: number;
  }) => api.get<StockItem[]>('/stock/', { params }),
  lowStock: (params?: { limit?: number; offset?: number }) => api.get<StockItem[]>('/stock/low-stock', { params }),
  adjust: (data: StockAdjustment) => api.post<StockItem>('/stock/adjust', data),
};

export const salesApi = {
  createInvoice: (data: InvoiceCreateRequest) => api.post<InvoiceResponse>('/sales/invoice', data),
};

export const suppliersApi = {
  list: () => api.get<Supplier[]>('/suppliers/'),
};

export const purchasesApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.get<PurchaseResponse[]>('/purchases/', { params }),
  create: (data: PurchaseCreateRequest) => api.post<PurchaseResponse>('/purchases/', data),
};

export const authApi = {
  getCurrentUser: () => api.get<CurrentUser>('/auth/me'),
};
