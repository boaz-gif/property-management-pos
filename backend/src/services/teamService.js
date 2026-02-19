const Team = require('../models/Team');
const PermissionService = require('./PermissionService');

class TeamService {
  static async listTeams(organizationId, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    return await Team.listByOrganization(organizationId);
  }

  static async getTeam(organizationId, teamId, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    const team = await Team.findById(organizationId, teamId);
    if (!team) throw new Error('Team not found');
    return team;
  }

  static async createTeam(organizationId, payload, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    const name = payload?.name;
    if (!name) throw new Error('name is required');
    return await Team.create(organizationId, { name }, user.id);
  }

  static async updateTeam(organizationId, teamId, payload, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    const updated = await Team.update(organizationId, teamId, { name: payload?.name }, user.id);
    if (!updated) throw new Error('Team not found');
    return updated;
  }

  static async deleteTeam(organizationId, teamId, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    const archived = await Team.archive(organizationId, teamId, user.id);
    if (!archived) throw new Error('Team not found');
    return archived;
  }

  static async listMembers(organizationId, teamId, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    const team = await Team.findById(organizationId, teamId);
    if (!team) throw new Error('Team not found');
    return await Team.listMembers(teamId);
  }

  static async addMember(organizationId, teamId, memberUserId, memberRole, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    const team = await Team.findById(organizationId, teamId);
    if (!team) throw new Error('Team not found');
    if (!memberUserId) throw new Error('userId is required');
    return await Team.addMember(teamId, memberUserId, memberRole || 'member');
  }

  static async removeMember(organizationId, teamId, memberUserId, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    const team = await Team.findById(organizationId, teamId);
    if (!team) throw new Error('Team not found');
    if (!memberUserId) throw new Error('userId is required');
    const removed = await Team.removeMember(teamId, memberUserId);
    if (!removed) throw new Error('Member not found');
    return removed;
  }
}

module.exports = TeamService;

