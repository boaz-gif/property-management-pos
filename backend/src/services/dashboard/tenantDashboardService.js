
const Database = require('../../utils/database');

class TenantDashboardService {
  
  static async getHomeSummary(tenantId) {
    // Refresh materialized view if needed (usually done by cron/trigger, but for dev we might rely on it being up to date)
    // In production, we assume MV is refreshed periodically.
    
    const query = `SELECT * FROM tenant_home_summary WHERE tenant_id = $1`;
    const result = await Database.query(query, [tenantId]);
    const summary = result.rows[0] || null;
    if (!summary) return null;

    const tenantRes = await Database.query(
      'SELECT property_id, unit, unit_id FROM tenants WHERE id = $1 AND deleted_at IS NULL',
      [tenantId]
    );
    const tenant = tenantRes.rows[0] || null;
    if (!tenant?.property_id) return summary;

    const unitToken = tenant.unit ? String(tenant.unit) : null;
    const unitIdToken = tenant.unit_id ? String(tenant.unit_id) : null;

    const unreadRes = await Database.query(
      `
      SELECT COUNT(*)::int AS count
      FROM property_announcements pa
      LEFT JOIN tenant_announcement_reads tar
        ON tar.announcement_id = pa.id AND tar.tenant_id = $1
      WHERE pa.property_id = $2
        AND pa.deleted_at IS NULL
        AND pa.published = TRUE
        AND (pa.expires_at IS NULL OR pa.expires_at > NOW())
        AND tar.id IS NULL
        AND (
          pa.target_all_tenants = TRUE
          OR pa.target_specific_units IS NULL
          OR (pa.target_specific_units ? $3)
          OR ($4::text IS NOT NULL AND pa.target_specific_units ? $4::text)
        )
      `,
      [tenantId, tenant.property_id, unitToken ?? '', unitIdToken]
    );

    return {
      ...summary,
      unread_announcements_count: unreadRes.rows[0]?.count ?? summary.unread_announcements_count
    };
  }

  static async getWidgets(tenantId) {
    const query = `
      SELECT * FROM tenant_dashboard_widgets 
      WHERE tenant_id = $1 
      ORDER BY position ASC
    `;
    const result = await Database.query(query, [tenantId]);
    
    // If no widgets found, initialize defaults
    if (result.rows.length === 0) {
      const defaults = [
        { type: 'rent_status', pos: 0 },
        { type: 'maintenance_requests', pos: 1 },
        { type: 'announcements', pos: 2 },
        { type: 'quick_actions', pos: 3 }
      ];
      
      for (const def of defaults) {
        await Database.query(`
          INSERT INTO tenant_dashboard_widgets (tenant_id, widget_type, position)
          VALUES ($1, $2, $3)
        `, [tenantId, def.type, def.pos]);
      }
      
      return await this.getWidgets(tenantId);
    }
    
    return result.rows;
  }

  static async updateWidgetOrder(tenantId, widgets) {
    // widgets: [{ id, position, visible }]
    await Database.query('BEGIN');
    try {
      for (const w of widgets) {
        await Database.query(`
          UPDATE tenant_dashboard_widgets 
          SET position = $1, visible = $2, updated_at = NOW()
          WHERE id = $3 AND tenant_id = $4
        `, [w.position, w.visible, w.id, tenantId]);
      }
      await Database.query('COMMIT');
      return true;
    } catch (err) {
      await Database.query('ROLLBACK');
      throw err;
    }
  }

  static async getAnnouncements(tenantId, propertyId) {
    const tenantRes = await Database.query(
      'SELECT unit, unit_id FROM tenants WHERE id = $1 AND deleted_at IS NULL',
      [tenantId]
    );
    const unitToken = tenantRes.rows[0]?.unit ? String(tenantRes.rows[0].unit) : null;
    const unitIdToken = tenantRes.rows[0]?.unit_id ? String(tenantRes.rows[0].unit_id) : null;

    const query = `
      SELECT pa.*, tar.viewed_at, tar.acknowledged
      FROM property_announcements pa
      LEFT JOIN tenant_announcement_reads tar ON pa.id = tar.announcement_id AND tar.tenant_id = $1
      WHERE pa.property_id = $2
        AND pa.deleted_at IS NULL
        AND pa.published = TRUE
        AND (pa.expires_at IS NULL OR pa.expires_at > NOW())
        AND (
          pa.target_all_tenants = TRUE
          OR pa.target_specific_units IS NULL
          OR (pa.target_specific_units ? $3)
          OR ($4::text IS NOT NULL AND pa.target_specific_units ? $4::text)
        )
      ORDER BY pa.priority = 'urgent' DESC, pa.published_at DESC
    `;
    const result = await Database.query(query, [tenantId, propertyId, unitToken ?? '', unitIdToken]);
    return result.rows;
  }

  static async markAnnouncementViewed(tenantId, announcementId) {
    const query = `
      INSERT INTO tenant_announcement_reads (announcement_id, tenant_id, viewed_at, acknowledged)
      VALUES ($1, $2, NOW(), FALSE)
      ON CONFLICT (announcement_id, tenant_id)
      DO UPDATE SET viewed_at = NOW()
      RETURNING *
    `;
    const result = await Database.query(query, [announcementId, tenantId]);
    return result.rows[0];
  }

  static async acknowledgeAnnouncement(tenantId, announcementId) {
    const query = `
      INSERT INTO tenant_announcement_reads (announcement_id, tenant_id, viewed_at, acknowledged, acknowledged_at)
      VALUES ($1, $2, NOW(), TRUE, NOW())
      ON CONFLICT (announcement_id, tenant_id)
      DO UPDATE SET
        acknowledged = TRUE,
        acknowledged_at = NOW(),
        viewed_at = COALESCE(tenant_announcement_reads.viewed_at, NOW())
      RETURNING *
    `;
    const result = await Database.query(query, [announcementId, tenantId]);
    return result.rows[0];
  }

  static async markAnnouncementRead(tenantId, announcementId) {
    return await this.acknowledgeAnnouncement(tenantId, announcementId);
  }

  static async getNotifications(tenantId, unreadOnly = false) {
    const tenantRes = await Database.query('SELECT user_id FROM tenants WHERE id = $1 AND deleted_at IS NULL', [tenantId]);
    const userId = tenantRes.rows[0]?.user_id;
    if (!userId) return [];

    let query = `SELECT * FROM notifications WHERE user_id = $1 AND deleted_at IS NULL`;
    const params = [userId];
    if (unreadOnly) {
      query += ` AND is_read = FALSE`;
    }
    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await Database.query(query, params);
    return result.rows;
  }

  static async markNotificationRead(tenantId, notificationId) {
    const tenantRes = await Database.query('SELECT user_id FROM tenants WHERE id = $1 AND deleted_at IS NULL', [tenantId]);
    const userId = tenantRes.rows[0]?.user_id;
    if (!userId) throw new Error('Tenant not found');

    const query = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await Database.query(query, [notificationId, userId]);
    return result.rows[0];
  }

  static async logQuickAction(tenantId, actionType, timeMs) {
    await Database.query(`
      INSERT INTO tenant_quick_actions_log (tenant_id, action_type, execution_time_ms)
      VALUES ($1, $2, $3)
    `, [tenantId, actionType, timeMs]);
  }
  
  static async getPreferences(tenantId) {
      const query = `SELECT * FROM tenant_preferences WHERE tenant_id = $1`;
      const result = await Database.query(query, [tenantId]);
      if (result.rows.length === 0) {
          // Create default
          const insert = `INSERT INTO tenant_preferences (tenant_id) VALUES ($1) RETURNING *`;
          const res = await Database.query(insert, [tenantId]);
          return res.rows[0];
      }
      return result.rows[0];
  }
  
  static async updatePreferences(tenantId, prefs) {
      // Construct dynamic update
      const fields = Object.keys(prefs).filter(k => k !== 'id' && k !== 'tenant_id' && k !== 'created_at' && k !== 'updated_at');
      if (fields.length === 0) return await this.getPreferences(tenantId);
      
      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const values = fields.map(f => prefs[f]);
      
      const query = `
        UPDATE tenant_preferences 
        SET ${setClause}, updated_at = NOW()
        WHERE tenant_id = $1
        RETURNING *
      `;
      
      const result = await Database.query(query, [tenantId, ...values]);
      return result.rows[0];
  }
}

module.exports = TenantDashboardService;
