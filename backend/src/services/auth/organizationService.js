const Organization = require('../../models/Organization');
const PermissionService = require('./PermissionService');

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

class OrganizationService {
  static async listOrganizations(user) {
    return await Organization.findAllForUser(user);
  }

  static async getOrganizationById(id, user) {
    await PermissionService.ensureOrganizationAccess(user, id);
    const org = await Organization.findById(id);
    if (!org) throw new Error('Organization not found');
    return org;
  }

  static async createOrganization(payload, user) {
    if (user.role === 'tenant') throw new Error('Access denied');

    const name = payload?.name;
    if (!name) throw new Error('name is required');

    const baseSlug = slugify(payload?.slug || name) || `org-${Date.now()}`;
    const slug = payload?.slug ? baseSlug : `${baseSlug}-${Date.now().toString(36)}`;

    const ownerUserId = payload?.owner_user_id ?? payload?.ownerUserId ?? user.id;
    return await Organization.create({ name, slug, ownerUserId }, user.id);
  }

  static async updateOrganization(id, payload, user) {
    await PermissionService.ensureOrganizationAccess(user, id);

    const next = {
      name: payload?.name ?? null,
      slug: payload?.slug ? slugify(payload.slug) : null,
    };

    const updated = await Organization.update(id, next, user.id);
    if (!updated) throw new Error('Organization not found');
    return updated;
  }

  static async deleteOrganization(id, user) {
    await PermissionService.ensureOrganizationAccess(user, id);
    const archived = await Organization.archive(id, user.id);
    if (!archived) throw new Error('Organization not found');
    return archived;
  }

  static async listMembers(organizationId, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    return await Organization.listMembers(organizationId);
  }

  static async addMember(organizationId, memberUserId, memberRole, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    if (!memberUserId) throw new Error('userId is required');
    return await Organization.addMember(organizationId, memberUserId, memberRole || 'member');
  }

  static async removeMember(organizationId, memberUserId, user) {
    await PermissionService.ensureOrganizationAccess(user, organizationId);
    if (!memberUserId) throw new Error('userId is required');
    const removed = await Organization.removeMember(organizationId, memberUserId);
    if (!removed) throw new Error('Member not found');
    return removed;
  }
}

module.exports = OrganizationService;

