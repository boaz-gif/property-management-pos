import api from '../../../services/apiClient';

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register-test', userData),
  registerAdmin: (data) => api.post('/auth/register-admin', data),
  registerTenant: (data) => api.post('/auth/register-tenant', data),
  refreshToken: (token) => api.post('/auth/refresh-token', { token }),
  logout: () => api.post('/auth/logout'),
  logoutAll: () => api.post('/auth/logout-all'),
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

export default authAPI;
