const Database = require('../utils/database');

class WorkItem {
  static async create({ organizationId, resourceType, resourceId, workflowId, currentStateId }) {
    const result = await Database.query(
      `
      INSERT INTO work_items (organization_id, resource_type, resource_id, workflow_id, current_state_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (organization_id, resource_type, resource_id)
      DO UPDATE SET workflow_id = EXCLUDED.workflow_id, current_state_id = EXCLUDED.current_state_id, updated_at = NOW()
      RETURNING *
      `,
      [organizationId, resourceType, resourceId, workflowId, currentStateId]
    );
    return result.rows[0];
  }

  static async findByResource(organizationId, resourceType, resourceId) {
    const result = await Database.query(
      `
      SELECT wi.*, wd.name AS workflow_name, ws.state_key, ws.name AS state_name
      FROM work_items wi
      JOIN workflow_definitions wd ON wd.id = wi.workflow_id
      JOIN workflow_states ws ON ws.id = wi.current_state_id
      WHERE wi.organization_id = $1 AND wi.resource_type = $2 AND wi.resource_id = $3
      `,
      [organizationId, resourceType, resourceId]
    );
    return result.rows[0] || null;
  }

  static async transition(workItemId, nextStateId) {
    const result = await Database.query(
      `
      UPDATE work_items
      SET current_state_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [nextStateId, workItemId]
    );
    return result.rows[0] || null;
  }
}

module.exports = WorkItem;

