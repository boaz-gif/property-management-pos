import api from '../../../services/apiClient';

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

export default paymentAPI;
