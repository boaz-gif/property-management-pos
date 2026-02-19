import api from '../../../services/apiClient';

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

export default maintenanceAPI;
