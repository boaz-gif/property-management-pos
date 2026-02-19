const Database = require('../../utils/database');
const PermissionService = require('../auth/PermissionService');
const LeaseService = require('./leaseService');

class PropertyLeaseService {
  static async getSettings(propertyId, user) {
    await PermissionService.ensurePropertyAccess(user, propertyId);

    const res = await Database.query(
      'SELECT * FROM property_lease_settings WHERE property_id = $1',
      [propertyId]
    );
    if (res.rows.length > 0) return res.rows[0];

    const created = await Database.query(
      `
      INSERT INTO property_lease_settings (property_id)
      VALUES ($1)
      RETURNING *
      `,
      [propertyId]
    );
    return created.rows[0];
  }

  static async updateSettings(propertyId, payload, user) {
    await PermissionService.ensurePropertyAccess(user, propertyId);
    if (user.role === 'tenant') throw new Error('Access denied');

    const defaultTermDaysRaw = payload?.default_term_days ?? payload?.defaultTermDays;
    const reminderDaysRaw = payload?.reminder_days ?? payload?.reminderDays;
    const notifyTenantRaw = payload?.notify_tenant ?? payload?.notifyTenant;
    const notifyAdminRaw = payload?.notify_admin ?? payload?.notifyAdmin;

    const defaultTermDays =
      defaultTermDaysRaw !== undefined && defaultTermDaysRaw !== null
        ? parseInt(defaultTermDaysRaw, 10)
        : undefined;

    const reminderDays =
      Array.isArray(reminderDaysRaw) ? reminderDaysRaw.map((d) => parseInt(d, 10)).filter((d) => Number.isFinite(d) && d > 0) : undefined;

    if (defaultTermDays !== undefined && (!Number.isFinite(defaultTermDays) || defaultTermDays < 1 || defaultTermDays > 3650)) {
      throw new Error('default_term_days must be between 1 and 3650');
    }

    if (reminderDays !== undefined && reminderDays.length === 0) {
      throw new Error('reminder_days must be a non-empty array of positive integers');
    }

    const notifyTenant = notifyTenantRaw !== undefined ? Boolean(notifyTenantRaw) : undefined;
    const notifyAdmin = notifyAdminRaw !== undefined ? Boolean(notifyAdminRaw) : undefined;

    const res = await Database.query(
      `
      INSERT INTO property_lease_settings (property_id, default_term_days, reminder_days, notify_tenant, notify_admin, created_at, updated_at)
      VALUES (
        $1,
        COALESCE($2, 365),
        COALESCE($3, ARRAY[30, 14, 7]),
        COALESCE($4, TRUE),
        COALESCE($5, TRUE),
        NOW(),
        NOW()
      )
      ON CONFLICT (property_id) DO UPDATE SET
        default_term_days = COALESCE(EXCLUDED.default_term_days, property_lease_settings.default_term_days),
        reminder_days = COALESCE(EXCLUDED.reminder_days, property_lease_settings.reminder_days),
        notify_tenant = COALESCE(EXCLUDED.notify_tenant, property_lease_settings.notify_tenant),
        notify_admin = COALESCE(EXCLUDED.notify_admin, property_lease_settings.notify_admin),
        updated_at = NOW()
      RETURNING *
      `,
      [
        propertyId,
        defaultTermDays ?? null,
        reminderDays ?? null,
        notifyTenant !== undefined ? notifyTenant : null,
        notifyAdmin !== undefined ? notifyAdmin : null
      ]
    );
    return res.rows[0];
  }

  static async bulkSetLeases(propertyId, payload, user) {
    await PermissionService.ensurePropertyAccess(user, propertyId);
    if (user.role === 'tenant') throw new Error('Access denied');

    const leaseStartDate = payload?.lease_start_date ?? payload?.leaseStartDate;
    const leaseEndDate = payload?.lease_end_date ?? payload?.leaseEndDate;
    const onlyMissing = payload?.only_missing ?? payload?.onlyMissing;

    const validation = LeaseService.validateLeaseDates(leaseStartDate, leaseEndDate);
    if (!validation.isValid) {
      const err = new Error('Invalid lease dates');
      err.details = validation.errors;
      throw err;
    }

    const conditions = ['property_id = $3', "status = 'active'", 'deleted_at IS NULL'];
    if (onlyMissing === true) {
      conditions.push('(lease_start_date IS NULL OR lease_end_date IS NULL)');
    }

    const updated = await Database.query(
      `
      UPDATE tenants
      SET lease_start_date = $1,
          lease_end_date = $2,
          updated_at = NOW()
      WHERE ${conditions.join(' AND ')}
      RETURNING id
      `,
      [leaseStartDate, leaseEndDate, propertyId]
    );

    return { updated_count: updated.rows.length };
  }
}

module.exports = PropertyLeaseService;

