/**
 * Caloriq — API client (Axios instance with auth interceptors)
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ───────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ── Auth API ────────────────────────────────────────────
export const authAPI = {
  register: (email, password, name) =>
    api.post('/api/auth/register', { email, password, name }),

  login: (email, password) =>
    api.post('/api/auth/login', { email, password }),

  me: () => api.get('/api/auth/me'),
};

// ── Meals API ───────────────────────────────────────────
export const mealsAPI = {
  analyzeText: (text, meal_type = 'snack') =>
    api.post('/api/meals/analyze/text', { text, meal_type }),

  analyzeBarcode: (barcode, meal_type = 'snack') =>
    api.post('/api/meals/analyze/barcode', { barcode, meal_type }),

  analyzePhoto: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/meals/analyze/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  saveMeal: (payload) =>
    api.post('/api/meals', payload),

  list: (page = 1, pageSize = 20, filters = {}) =>
    api.get('/api/meals', {
      params: { page, page_size: pageSize, ...filters },
    }),

  get: (id) => api.get(`/api/meals/${id}`),

  delete: (id) => api.delete(`/api/meals/${id}`),
};

// ── Profile API ─────────────────────────────────────────
export const profileAPI = {
  get: () => api.get('/api/profile'),
  create: (data) => api.post('/api/profile', data),
  update: (data) => api.patch('/api/profile', data),
};

// ── Weight API ──────────────────────────────────────────
export const weightAPI = {
  list: () => api.get('/api/weights'),
  log: (weight_kg, logged_at = null) => api.post('/api/weights', { weight_kg, logged_at }),
  delete: (id) => api.delete(`/api/weights/${id}`),
};

// ── Dashboard / Analytics API ────────────────────────────
export const dashboardAPI = {
  summary: () => api.get('/api/dashboard/summary'),
  analytics: (days = 7) => api.get('/api/dashboard/analytics', { params: { days } }),
};

export default api;
