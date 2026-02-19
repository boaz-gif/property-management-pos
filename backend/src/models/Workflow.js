const Database = require('../utils/database');

class Workflow {
  static async listDefinitions(organizationId) {
    const result = await Database.query(
      `
      SELECT *
      FROM workflow_definitions
      WHERE organization_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      `,
      [organizationId]
    );
    return result.rows;
  }

  static async getDefinition(organizationId, workflowId) {
    const defRes = await Database.query(
      `
      SELECT *
      FROM workflow_definitions
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `,
      [workflowId, organizationId]
    );
    const definition = defRes.rows[0] || null;
    if (!definition) return null;

    const statesRes = await Database.query(
      `
      SELECT *
      FROM workflow_states
      WHERE workflow_id = $1
      ORDER BY sort_order ASC, id ASC
      `,
      [workflowId]
    );

    const transitionsRes = await Database.query(
      `
      SELECT wt.*, fs.state_key AS from_state_key, ts.state_key AS to_state_key
      FROM workflow_transitions wt
      JOIN workflow_states fs ON fs.id = wt.from_state_id
      JOIN workflow_states ts ON ts.id = wt.to_state_id
      WHERE wt.workflow_id = $1
      ORDER BY wt.id ASC
      `,
      [workflowId]
    );

    return { definition, states: statesRes.rows, transitions: transitionsRes.rows };
  }

  static async createDefinition(organizationId, { name, resourceType, isActive }) {
    const result = await Database.query(
      `
      INSERT INTO workflow_definitions (organization_id, name, resource_type, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, COALESCE($4, TRUE), NOW(), NOW())
      RETURNING *
      `,
      [organizationId, name, resourceType, isActive]
    );
    return result.rows[0];
  }

  static async createState(workflowId, state) {
    const result = await Database.query(
      `
      INSERT INTO workflow_states (workflow_id, state_key, name, is_initial, is_terminal, sort_order, created_at)
      VALUES ($1, $2, $3, COALESCE($4, FALSE), COALESCE($5, FALSE), COALESCE($6, 0), NOW())
      RETURNING *
      `,
      [
        workflowId,
        state.state_key ?? state.stateKey,
        state.name,
        state.is_initial ?? state.isInitial,
        state.is_terminal ?? state.isTerminal,
        state.sort_order ?? state.sortOrder,
      ]
    );
    return result.rows[0];
  }

  static async createTransition(workflowId, { fromStateId, toStateId, name }) {
    const result = await Database.query(
      `
      INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, name, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
      `,
      [workflowId, fromStateId, toStateId, name]
    );
    return result.rows[0];
  }

  static async archiveDefinition(organizationId, workflowId, userId) {
    const result = await Database.query(
      `
      UPDATE workflow_definitions
      SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
      WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
      RETURNING *
      `,
      [userId, workflowId, organizationId]
    );
    return result.rows[0] || null;
  }
}

module.exports = Workflow;

