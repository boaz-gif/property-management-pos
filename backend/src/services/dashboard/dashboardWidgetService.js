const Database = require('../../utils/database');

class DashboardWidgetService {
  static getDefaultsForRole(role) {
    if (role === 'super_admin') {
      return [
        { type: 'stat_cards', pos: 0 },
        { type: 'quick_actions', pos: 1 },
        { type: 'system_info', pos: 2 }
      ];
    }

    if (role === 'admin' || role === 'property_manager') {
      return [
        { type: 'kpi_cards', pos: 0 },
        { type: 'action_items', pos: 1 },
        { type: 'quick_actions', pos: 2 },
        { type: 'property_comparison', pos: 3 },
        { type: 'revenue_trend', pos: 4 },
        { type: 'recent_activity', pos: 5 },
        { type: 'portfolio_insights', pos: 6 }
      ];
    }

    return [];
  }

  static async getWidgets(user) {
    const result = await Database.query(
      `
        SELECT *
        FROM user_dashboard_widgets
        WHERE user_id = $1
        ORDER BY position ASC
      `,
      [user.id]
    );

    if (result.rows.length > 0) return result.rows;

    const defaults = this.getDefaultsForRole(user.role);
    if (defaults.length === 0) return [];

    await Database.transaction(async (client) => {
      for (const def of defaults) {
        await client.query(
          `
            INSERT INTO user_dashboard_widgets (user_id, role, widget_type, position, visible, created_at, updated_at)
            VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
            ON CONFLICT (user_id, widget_type) DO NOTHING
          `,
          [user.id, user.role, def.type, def.pos]
        );
      }
    });

    const refreshed = await Database.query(
      `
        SELECT *
        FROM user_dashboard_widgets
        WHERE user_id = $1
        ORDER BY position ASC
      `,
      [user.id]
    );
    return refreshed.rows;
  }

  static async updateWidgetOrder(user, widgets) {
    if (!Array.isArray(widgets)) {
      throw new Error('Invalid widgets payload');
    }

    await Database.transaction(async (client) => {
      for (const w of widgets) {
        await client.query(
          `
            UPDATE user_dashboard_widgets
            SET position = $1, visible = $2, updated_at = NOW()
            WHERE id = $3 AND user_id = $4
          `,
          [w.position, w.visible, w.id, user.id]
        );
      }
    });

    return true;
  }
}

module.exports = DashboardWidgetService;
