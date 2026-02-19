import api from '../../../services/apiClient';

export const communicationApi = {
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

export default communicationApi;
