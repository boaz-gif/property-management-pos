const PropertyAnnouncement = require('../models/PropertyAnnouncement');
const PermissionService = require('./PermissionService');

class PropertyAnnouncementService {
  static async listForAdmin(propertyId, user) {
    await PermissionService.ensurePropertyAccess(user, propertyId);
    return await PropertyAnnouncement.listByProperty(propertyId, { includeUnpublished: true });
  }

  static async create(propertyId, payload, user) {
    await PermissionService.ensurePropertyAccess(user, propertyId);
    if (user.role === 'tenant') throw new Error('Access denied');
    if (!payload?.title) throw new Error('title is required');
    if (!payload?.content) throw new Error('content is required');
    return await PropertyAnnouncement.create(propertyId, payload, user.id);
  }

  static async update(propertyId, announcementId, payload, user) {
    await PermissionService.ensurePropertyAccess(user, propertyId);
    if (user.role === 'tenant') throw new Error('Access denied');
    const updated = await PropertyAnnouncement.update(propertyId, announcementId, payload);
    if (!updated) throw new Error('Announcement not found');
    return updated;
  }

  static async publish(propertyId, announcementId, published, user) {
    await PermissionService.ensurePropertyAccess(user, propertyId);
    if (user.role === 'tenant') throw new Error('Access denied');
    const updated = await PropertyAnnouncement.setPublished(propertyId, announcementId, published);
    if (!updated) throw new Error('Announcement not found');
    return updated;
  }

  static async archive(propertyId, announcementId, user) {
    await PermissionService.ensurePropertyAccess(user, propertyId);
    if (user.role === 'tenant') throw new Error('Access denied');
    const archived = await PropertyAnnouncement.archive(propertyId, announcementId, user.id);
    if (!archived) throw new Error('Announcement not found');
    return archived;
  }
}

module.exports = PropertyAnnouncementService;

