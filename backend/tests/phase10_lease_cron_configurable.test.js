const LeaseCronJobs = require('../src/jobs/leaseCronJobs');
const LeaseService = require('../src/services/leaseService');
const NotificationService = require('../src/services/notificationService');
const Database = require('../src/utils/database');

jest.mock('../src/services/leaseService');
jest.mock('../src/services/notificationService');
jest.mock('../src/utils/database');

describe('Phase 10: Configurable lease reminders', () => {
  beforeEach(() => {
    LeaseService.findExpiringLeases.mockResolvedValue([
      {
        id: 11,
        name: 'Tenant A',
        email: 'tenant@example.com',
        tenant_user_id: 101,
        property_id: 1,
        property_name: 'Prop 1',
        unit: 'A1',
        lease_end_date: '2026-12-31',
        days_remaining: 7,
        admin_email: 'admin@example.com',
        admin_name: 'Admin'
      }
    ]);

    NotificationService.sendLeaseExpirationNotification.mockResolvedValue({ success: true });

    Database.query.mockImplementation((query, params) => {
      const q = String(query);

      if (q.includes('SELECT reminder_days FROM property_lease_settings')) {
        return Promise.resolve({ rows: [{ reminder_days: [7] }], rowCount: 1 });
      }

      if (q.includes('FROM property_lease_settings') && q.includes('WHERE property_id = ANY')) {
        return Promise.resolve({ rows: [{ property_id: 1, reminder_days: [7], notify_tenant: true, notify_admin: true }], rowCount: 1 });
      }

      if (q.includes('SELECT id FROM lease_expiration_reminders')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (q.includes('INSERT INTO lease_expiration_reminders')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Sends reminder using per-property reminder_days', async () => {
    const result = await LeaseCronJobs.sendConfigurableLeaseExpirationReminders();
    expect(result.sent).toBe(1);
    expect(NotificationService.sendLeaseExpirationNotification).toHaveBeenCalledWith(
      expect.objectContaining({ reminder_type: '7_days', days_remaining: 7 })
    );
  });
});

