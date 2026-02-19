import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TenantDashboard from '../pages/tenant/Dashboard';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'tenant', name: 'Test Tenant' } })
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn() }
}));

const api = require('../services/api').default;

describe('TenantDashboard Component', () => {
  beforeEach(() => {
    api.get.mockImplementation((url) => {
      if (url === '/tenant/dashboard') {
        return Promise.resolve({
          data: {
            tenant_name: 'Test Tenant',
            balance: 1200,
            lease_status: 'active',
            days_until_lease_end: 30,
            open_maintenance_count: 1,
            unread_notifications_count: 2,
            unread_announcements_count: 0
          }
        });
      }
      if (url === '/tenant/widgets') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/tenant/rent-status') {
        return Promise.resolve({ data: { balance: 1200, rent_amount: 1200, next_due_date: new Date().toISOString() } });
      }
      if (url === '/tenant/payment-methods') {
        return Promise.resolve({ data: [{ id: 1, type: 'card', last4: '4242', brand: 'Visa', is_default: true }] });
      }
      return Promise.resolve({ data: {} });
    });
  });

  test('renders key dashboard sections after loading', async () => {
    render(
      <MemoryRouter>
        <TenantDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading dashboard/i)).toBeInTheDocument();

    expect(await screen.findByText(/Welcome Home/i)).toBeInTheDocument();
    expect(screen.getAllByText('Current Balance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Maintenance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Notifications').length).toBeGreaterThan(0);
  });
});
