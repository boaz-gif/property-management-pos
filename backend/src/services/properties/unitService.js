const Unit = require('../../models/Unit');
const PermissionService = require('../auth/PermissionService');

class UnitService {
  static async listUnits(propertyId, user) {
    await PermissionService.ensurePropertyAccess(user, propertyId);
    return await Unit.listByProperty(propertyId);
  }

  static async createUnit(propertyId, payload, user) {
    await PermissionService.ensurePropertyAccess(user, propertyId);
    if (user.role === 'tenant') throw new Error('Access denied');

    const unitNumber = (payload?.unit_number ?? payload?.unitNumber ?? '').toString().trim();
    if (!unitNumber) throw new Error('unit_number is required');

    const existing = await Unit.findByPropertyAndNumber(propertyId, unitNumber);
    if (existing) throw new Error('Unit already exists');

    return await Unit.create(
      propertyId,
      {
        ...payload,
        unit_number: unitNumber
      },
      user.id
    );
  }

  static async updateUnit(propertyId, unitId, payload, user) {
    await PermissionService.ensurePropertyAccess(user, propertyId);
    if (user.role === 'tenant') throw new Error('Access denied');

    const updated = await Unit.update(propertyId, unitId, payload);
    if (!updated) throw new Error('Unit not found');
    return updated;
  }

  static async archiveUnit(propertyId, unitId, user) {
    await PermissionService.ensurePropertyAccess(user, propertyId);
    if (user.role === 'tenant') throw new Error('Access denied');

    const archived = await Unit.archive(propertyId, unitId, user.id);
    if (!archived) throw new Error('Unit not found');
    return archived;
  }
}

module.exports = UnitService;

