import api from '../../../services/apiClient';

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

export default tenantAPI;
