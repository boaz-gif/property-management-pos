import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CommunicationHub from '../pages/CommunicationHub';

jest.mock('../context/SocketContext', () => ({
  useSocket: () => ({
    socket: { emit: jest.fn(), connected: true },
    on: jest.fn(),
    off: jest.fn()
  })
}));

jest.mock('../services/api', () => ({
  conversationAPI: {
    listConversations: jest.fn(),
    getConversation: jest.fn(),
    listMessages: jest.fn(),
    sendMessage: jest.fn(),
    markRead: jest.fn()
  },
  documentAPI: {
    uploadDocument: jest.fn(),
    downloadDocument: jest.fn()
  }
}));

const { conversationAPI } = require('../services/api');

describe('CommunicationHub', () => {
  beforeEach(() => {
    conversationAPI.listConversations.mockResolvedValue({
      data: { data: [{ id: 'c1', subject: 'Test Thread', unread_count: 0 }] }
    });
    conversationAPI.getConversation.mockResolvedValue({
      data: { data: { conversation: { id: 'c1', subject: 'Test Thread' }, participants: [] } }
    });
    conversationAPI.listMessages.mockResolvedValue({
      data: { data: [{ id: 'm1', sender_name: 'Alice', content: 'Hello', created_at: new Date().toISOString() }] }
    });
    conversationAPI.markRead.mockResolvedValue({ data: { success: true } });
  });

  test('renders a conversation thread and messages', async () => {
    render(
      <MemoryRouter initialEntries={['/messages/c1']}>
        <Routes>
          <Route path="/messages/:conversationId" element={<CommunicationHub />} />
        </Routes>
      </MemoryRouter>
    );

    const threadLabels = await screen.findAllByText('Test Thread');
    expect(threadLabels.length).toBeGreaterThan(0);
    expect(await screen.findByText('Hello')).toBeInTheDocument();
  });
});
