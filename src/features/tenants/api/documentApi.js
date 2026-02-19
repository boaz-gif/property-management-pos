import api from '../../../services/apiClient';

export const documentApi = {
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

export default documentApi;
