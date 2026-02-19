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
    if (error.response?.status === 429) {
      const serverRetryAfterSec = parseInt(
        error.response.headers['retry-after'] || error.response.data?.retryAfter || 60,
        10
      );
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

export default api;
