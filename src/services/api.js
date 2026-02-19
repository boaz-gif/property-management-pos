import axios from 'axios';
import { ensureTraceHeaders, isPerfDiagnosticsEnabled } from './requestTrace';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token refresh queue to prevent multiple simultaneous refresh requests
let isRefreshing = false;
let failedQueue = [];

// Rate-limit backoff gate: timestamp (ms) until which all requests are suppressed
let rateLimitedUntil = 0;

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  isRefreshing = false;
  failedQueue = [];
};

// Auth endpoints that must NEVER be blocked by the rate-limit gate
const AUTH_BYPASS_PATHS = ['/auth/login', '/auth/refresh-token', '/auth/profile', '/auth/logout'];

// Request interceptor to add auth token + enforce rate-limit backoff gate
api.interceptors.request.use(
  (config) => {
    // Auth endpoints always bypass the gate — you must be able to log in and refresh tokens
    const isAuthEndpoint = AUTH_BYPASS_PATHS.some(path => config.url?.includes(path));

    // If we're in a rate-limit backoff window, reject non-auth requests immediately
    if (!isAuthEndpoint && Date.now() < rateLimitedUntil) {
      const waitSec = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
      return Promise.reject(
        Object.assign(new Error(`Rate limited. Retry in ${waitSec}s`), {
          isRateLimitGate: true,
          retryAfter: waitSec
        })
      );
    }
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers = ensureTraceHeaders(config.headers || {});
    if (isPerfDiagnosticsEnabled()) {
      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      config.__perf = { startTime: now };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    if (isPerfDiagnosticsEnabled() && response?.config?.__perf?.startTime != null) {
      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const durationMs = now - response.config.__perf.startTime;
      try {
        window.__PERF_HTTP__ = window.__PERF_HTTP__ || [];
        window.__PERF_HTTP__.push({
          ok: true,
          method: response.config.method,
          url: response.config.url,
          status: response.status,
          durationMs,
          traceId: response.config.headers?.['X-Trace-Id'],
          actionId: response.config.headers?.['X-Action-Id'] || null
        });
      } catch {}
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('token');
        
        // Check if error is due to token revocation
        if (error.response?.data?.code === 'TOKEN_REVOKED') {
          throw new Error('Token has been revoked');
        }

        // Try to refresh the token
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || '/api'}/auth/refresh-token`,
          { token: refreshToken }
        );

        const newToken = response.data?.data?.token || response.data?.token;
        
        if (newToken) {
          localStorage.setItem('token', newToken);
          api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return api(originalRequest);
        } else {
          throw new Error('No token in response');
        }
      } catch (err) {
        processQueue(err, null);
        // Clear auth data and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login?reason=session_expired';
        return Promise.reject(err);
      }
    }

    // Handle 429 errors (Rate Limited)
    // Set the backoff gate so the request interceptor silently drops all subsequent
    // requests until the server's Retry-After window has expired.
    if (error.response?.status === 429) {
      const serverRetryAfterSec = parseInt(
        error.response.headers['retry-after'] || error.response.data?.retryAfter || 60,
        10
      );
      // Cap the LOCAL gate at 30s — just long enough to stop a retry storm.
      // The server still enforces its own full window; we don't need to mirror it.
      const localBackoffSec = Math.min(serverRetryAfterSec, 30);
      rateLimitedUntil = Date.now() + localBackoffSec * 1000;
      console.warn(`[api] Rate limited by server (${serverRetryAfterSec}s). Local gate active for ${localBackoffSec}s.`);
      const retryAfterSec = serverRetryAfterSec;

      error.response.data = {
        ...error.response.data,
        rateLimited: true,
        retryAfter: retryAfterSec
      };
    }

    if (isPerfDiagnosticsEnabled() && originalRequest?.__perf?.startTime != null) {
      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const durationMs = now - originalRequest.__perf.startTime;
      try {
        window.__PERF_HTTP__ = window.__PERF_HTTP__ || [];
        window.__PERF_HTTP__.push({
          ok: false,
          method: originalRequest.method,
          url: originalRequest.url,
          status: error.response?.status || null,
          durationMs,
          traceId: originalRequest.headers?.['X-Trace-Id'],
          actionId: originalRequest.headers?.['X-Action-Id'] || null
        });
      } catch {}
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// API METHODS
// ============================================================================

// Authentication & User Management
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register-test', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data) => api.post('/auth/change-password', data),
  
  // User CRUD
  getUsers: (params) => api.get('/auth/users', { params }),
  getUserById: (id) => api.get(`/auth/users/${id}`),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  
  // Soft Delete Methods
  archiveUser: (id) => api.put(`/auth/users/${id}/archive`),
  restoreUser: (id) => api.put(`/auth/users/${id}/restore`),
  permanentDeleteUser: (id) => api.delete(`/auth/users/${id}/permanent`),
  getArchivedUsers: () => api.get('/auth/users?onlyArchived=true'),
  getAllUsersWithArchived: () => api.get('/auth/users?includeArchived=true'),
};

// Tenant Management
export const tenantAPI = {
  getTenants: (params) => api.get('/tenants', { params }),
  getTenantById: (id) => api.get(`/tenants/${id}`),
  createTenant: (data) => api.post('/tenants', data),
  updateTenant: (id, data) => api.put(`/tenants/${id}`, data),
  deleteTenant: (id) => api.delete(`/tenants/${id}`),
  getTenantStats: () => api.get('/tenants/stats'),
  
  // Soft Delete Methods
  archiveTenant: (id) => api.put(`/tenants/${id}/archive`),
  restoreTenant: (id) => api.put(`/tenants/${id}/restore`),
  permanentDeleteTenant: (id) => api.delete(`/tenants/${id}/permanent`),
  getArchivedTenants: () => api.get('/tenants?onlyArchived=true'),
  getAllTenantsWithArchived: () => api.get('/tenants?includeArchived=true'),
};

// Property Management
export const propertyAPI = {
  getProperties: (params) => api.get('/properties', { params }),
  getPropertyById: (id) => api.get(`/properties/${id}`),
  createProperty: (data) => api.post('/properties', data),
  updateProperty: (id, data) => api.put(`/properties/${id}`, data),
  deleteProperty: (id) => api.delete(`/properties/${id}`),
  getPropertyStats: () => api.get('/properties/stats'),
  searchProperties: (query) => api.get('/properties/search', { params: { q: query } }),
  
  // Soft Delete Methods
  archiveProperty: (id) => api.put(`/properties/${id}/archive`),
  restoreProperty: (id) => api.put(`/properties/${id}/restore`),
  permanentDeleteProperty: (id) => api.delete(`/properties/${id}/permanent`),
  getArchivedProperties: () => api.get('/properties?onlyArchived=true'),
  getAllPropertiesWithArchived: () => api.get('/properties?includeArchived=true'),
};

// Maintenance Management
export const maintenanceAPI = {
  getRequests: (params) => api.get('/maintenance', { params }),
  getRequestById: (id) => api.get(`/maintenance/${id}`),
  createRequest: (data) => api.post('/maintenance', data),
  updateRequest: (id, data) => api.put(`/maintenance/${id}`, data),
  
  // Soft Delete Methods
  archiveRequest: (id) => api.put(`/maintenance/${id}/archive`),
  restoreRequest: (id) => api.put(`/maintenance/${id}/restore`),
  permanentDeleteRequest: (id) => api.delete(`/maintenance/${id}/permanent`),
  getArchivedRequests: () => api.get('/maintenance?onlyArchived=true'),
};

// Payment Management
export const paymentAPI = {
  getPayments: (params) => api.get('/payments', { params }),
  getPaymentById: (id) => api.get(`/payments/${id}`),
  createPayment: (data) => api.post('/payments', data),
  updatePaymentStatus: (id, status) => api.put(`/payments/${id}/status`, { status }),
  getPaymentStats: () => api.get('/payments/stats'),
  
  // Soft Delete Methods
  archivePayment: (id) => api.put(`/payments/${id}/archive`),
  restorePayment: (id) => api.put(`/payments/${id}/restore`),
  permanentDeletePayment: (id) => api.delete(`/payments/${id}/permanent`),
  getArchivedPayments: () => api.get('/payments?onlyArchived=true'),
};

// Document Management
export const documentAPI = {
  getDocuments: (params) => api.get('/documents', { params }),
  getDocumentById: (id) => api.get(`/documents/${id}`),
  uploadDocument: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  downloadDocument: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  deleteDocument: (id) => api.delete(`/documents/${id}`),
  
  // Soft Delete Methods
  archiveDocument: (id) => api.put(`/documents/${id}/archive`),
  restoreDocument: (id) => api.put(`/documents/${id}/restore`),
  permanentDeleteDocument: (id) => api.delete(`/documents/${id}/permanent`),
  getArchivedDocuments: () => api.get('/documents?onlyArchived=true'),
};

export const conversationAPI = {
  listConversations: (params) => api.get('/conversations', { params }),
  createConversation: (data) => api.post('/conversations', data),
  ensureCommunity: () => api.get('/conversations/community'),
  ensureAdminDm: () => api.get('/conversations/admin-dm'),
  getConversation: (id) => api.get(`/conversations/${id}`),
  listMessages: (id, params) => api.get(`/conversations/${id}/messages`, { params }),
  sendMessage: (id, data) => api.post(`/conversations/${id}/messages`, data),
  markRead: (id, data) => api.post(`/conversations/${id}/read`, data),
  addParticipant: (id, data) => api.post(`/conversations/${id}/participants`, data),
  removeParticipant: (id, userId) => api.delete(`/conversations/${id}/participants/${userId}`)
};

export const dashboardWidgetAPI = {
  getWidgets: () => api.get('/dashboard/widgets'),
  updateOrder: (widgets) => api.put('/dashboard/widgets/order', { widgets })
};

export default api;
