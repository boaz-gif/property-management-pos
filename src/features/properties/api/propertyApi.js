import api from '../../../services/apiClient';

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

export default propertyAPI;
