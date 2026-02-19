const Workflow = require('../../models/Workflow');
const WorkItem = require('../../models/WorkItem');
const PermissionService = require('../auth/PermissionService');
const Database = require('../../utils/database');

class WorkflowService {
  static async listWorkflows(organizationId, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    return await Workflow.listDefinitions(organizationId);
  }

  static async getWorkflow(organizationId, workflowId, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    const data = await Workflow.getDefinition(organizationId, workflowId);
    if (!data) throw new Error('Workflow not found');
    return data;
  }

  static async createWorkflow(organizationId, payload, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);

    const name = payload?.name;
    const resourceType = payload?.resourceType ?? payload?.resource_type;
    const states = Array.isArray(payload?.states) ? payload.states : [];
    const transitions = Array.isArray(payload?.transitions) ? payload.transitions : [];

    if (!name) throw new Error('name is required');
    if (!resourceType) throw new Error('resourceType is required');
    if (states.length === 0) throw new Error('states is required');

    const workflow = await Workflow.createDefinition(organizationId, {
      name,
      resourceType,
      isActive: payload?.isActive ?? payload?.is_active,
    });

    const createdStates = [];
    for (const state of states) {
      if (!state?.name) throw new Error('state name is required');
      const key = state.state_key ?? state.stateKey;
      if (!key) throw new Error('state_key is required');
      createdStates.push(await Workflow.createState(workflow.id, state));
    }

    const keyToId = new Map(createdStates.map((s) => [s.state_key, s.id]));
    for (const t of transitions) {
      const fromKey = t.from_state_key ?? t.fromStateKey ?? t.from_key ?? t.fromKey;
      const toKey = t.to_state_key ?? t.toStateKey ?? t.to_key ?? t.toKey;
      const tName = t.name;
      if (!fromKey || !toKey || !tName) continue;
      const fromId = keyToId.get(fromKey);
      const toId = keyToId.get(toKey);
      if (fromId && toId) {
        await Workflow.createTransition(workflow.id, { fromStateId: fromId, toStateId: toId, name: tName });
      }
    }

    return await Workflow.getDefinition(organizationId, workflow.id);
  }

  static async deleteWorkflow(organizationId, workflowId, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    const archived = await Workflow.archiveDefinition(organizationId, workflowId, user.id);
    if (!archived) throw new Error('Workflow not found');
    return archived;
  }

  static async ensureDefaultWorkItemForMaintenance({ propertyId, maintenanceId, user }) {
    await PermissionService.ensurePropertyAccess(user, propertyId);
    const organizationId = await PermissionService.getOrganizationIdForProperty(propertyId);
    if (!organizationId) return null;

    const wfRes = await Database.query(
      `
      SELECT id
      FROM workflow_definitions
      WHERE organization_id = $1 AND resource_type = 'maintenance' AND name = 'Default Maintenance Workflow' AND deleted_at IS NULL
      LIMIT 1
      `,
      [organizationId]
    );
    const workflowId = wfRes.rows[0]?.id;
    if (!workflowId) return null;

    const stateRes = await Database.query(
      `
      SELECT id
      FROM workflow_states
      WHERE workflow_id = $1 AND is_initial = TRUE
      ORDER BY sort_order ASC, id ASC
      LIMIT 1
      `,
      [workflowId]
    );
    const initialStateId = stateRes.rows[0]?.id;
    if (!initialStateId) return null;

    return await WorkItem.create({
      organizationId,
      resourceType: 'maintenance',
      resourceId: maintenanceId,
      workflowId,
      currentStateId: initialStateId,
    });
  }

  static async getWorkItemByResource(organizationId, resourceType, resourceId, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    const wi = await WorkItem.findByResource(organizationId, resourceType, resourceId);
    if (!wi) throw new Error('Work item not found');
    return wi;
  }
}

module.exports = WorkflowService;

