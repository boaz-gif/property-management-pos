const Database = require('../utils/database');
const BaseSoftDeleteModel = require('./BaseSoftDeleteModel');

class Unit extends BaseSoftDeleteModel {
  constructor() {
    super('units', Database);
  }

  static async listByProperty(propertyId) {
    const result = await Database.query(
      `
      SELECT u.*
      FROM units u
      WHERE u.property_id = $1 AND u.deleted_at IS NULL
      ORDER BY u.unit_number ASC
      `,
      [propertyId]
    );
    return result.rows;
  }

  static async findById(unitId) {
    const result = await Database.query(
      `
      SELECT *
      FROM units
      WHERE id = $1 AND deleted_at IS NULL
      `,
      [unitId]
    );
    return result.rows[0] || null;
  }

  static async findByPropertyAndNumber(propertyId, unitNumber) {
    const result = await Database.query(
      `
      SELECT *
      FROM units
      WHERE property_id = $1 AND unit_number = $2 AND deleted_at IS NULL
      `,
      [propertyId, unitNumber]
    );
    return result.rows[0] || null;
  }

  static async create(propertyId, payload, userId) {
    const result = await Database.query(
      `
      INSERT INTO units (property_id, unit_number, floor, bedrooms, bathrooms, notes, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
      `,
      [
        propertyId,
        payload.unit_number,
        payload.floor ?? null,
        payload.bedrooms ?? null,
        payload.bathrooms ?? null,
        payload.notes ?? null,
        userId ?? null
      ]
    );
    return result.rows[0];
  }

  static async update(propertyId, unitId, payload) {
    const result = await Database.query(
      `
      UPDATE units
      SET unit_number = COALESCE($1, unit_number),
          floor = COALESCE($2, floor),
          bedrooms = COALESCE($3, bedrooms),
          bathrooms = COALESCE($4, bathrooms),
          notes = COALESCE($5, notes),
          updated_at = NOW()
      WHERE id = $6 AND property_id = $7 AND deleted_at IS NULL
      RETURNING *
      `,
      [
        payload?.unit_number ?? payload?.unitNumber ?? null,
        payload?.floor ?? null,
        payload?.bedrooms ?? null,
        payload?.bathrooms ?? null,
        payload?.notes ?? null,
        unitId,
        propertyId
      ]
    );
    return result.rows[0] || null;
  }

  static async archive(propertyId, unitId, userId) {
    const result = await Database.query(
      `
      UPDATE units
      SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
      WHERE id = $2 AND property_id = $3 AND deleted_at IS NULL
      RETURNING *
      `,
      [userId ?? null, unitId, propertyId]
    );
    return result.rows[0] || null;
  }
}

module.exports = Unit;

