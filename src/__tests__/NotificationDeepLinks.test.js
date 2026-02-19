import React from 'react';
import { render, screen } from '@testing-library/react';
import NotificationDropdown from '../components/notifications/NotificationDropdown';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('NotificationDropdown deep-links', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('navigates to messages thread for message notifications', async () => {
    render(
      <NotificationDropdown
        notifications={[
          {
            id: 1,
            is_read: false,
            type: 'message_received',
            title: 'New message',
            message: 'Hi',
            created_at: new Date().toISOString(),
            data: { conversation_id: 'c1' }
          }
        ]}
        onMarkAsRead={jest.fn()}
        onMarkAllAsRead={jest.fn()}
        onDelete={jest.fn()}
        onClose={jest.fn()}
        loading={false}
      />
    );

    const item = await screen.findByText('New message');
    item.click();

    expect(mockNavigate).toHaveBeenCalledWith('/messages/c1');
  });
});

