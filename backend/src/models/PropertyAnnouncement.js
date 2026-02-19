const Database = require('../utils/database');

class PropertyAnnouncement {
  static async listByProperty(propertyId, { includeUnpublished = false } = {}) {
    const query = `
      SELECT *
      FROM property_announcements
      WHERE property_id = $1
        AND deleted_at IS NULL
        ${includeUnpublished ? '' : 'AND published = TRUE'}
      ORDER BY (priority = 'urgent') DESC, published_at DESC NULLS LAST, created_at DESC
    `;
    const result = await Database.query(query, [propertyId]);
    return result.rows;
  }

  static async findById(propertyId, announcementId) {
    const result = await Database.query(
      `
      SELECT *
      FROM property_announcements
      WHERE id = $1 AND property_id = $2 AND deleted_at IS NULL
      `,
      [announcementId, propertyId]
    );
    return result.rows[0] || null;
  }

  static async create(propertyId, payload, userId) {
    const {
      title,
      content,
      announcement_type,
      priority,
      target_all_tenants,
      target_specific_units,
      published,
      expires_at,
      attachments,
    } = payload || {};

    const result = await Database.query(
      `
      INSERT INTO property_announcements (
        property_id, title, content, announcement_type, priority,
        target_all_tenants, target_specific_units,
        published, published_at, expires_at, attachments,
        created_by, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, COALESCE($5, 'normal'),
        COALESCE($6, TRUE), $7,
        COALESCE($8, FALSE),
        CASE WHEN COALESCE($8, FALSE) = TRUE THEN NOW() ELSE NULL END,
        $9, $10,
        $11, NOW(), NOW()
      )
      RETURNING *
      `,
      [
        propertyId,
        title,
        content,
        announcement_type ?? null,
        priority ?? null,
        target_all_tenants !== undefined ? target_all_tenants : true,
        target_specific_units ?? null,
        published !== undefined ? published : false,
        expires_at ?? null,
        attachments ?? null,
        userId,
      ]
    );
    return result.rows[0];
  }

  static async update(propertyId, announcementId, payload) {
    const result = await Database.query(
      `
      UPDATE property_announcements
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          announcement_type = COALESCE($3, announcement_type),
          priority = COALESCE($4, priority),
          target_all_tenants = COALESCE($5, target_all_tenants),
          target_specific_units = COALESCE($6, target_specific_units),
          expires_at = COALESCE($7, expires_at),
          attachments = COALESCE($8, attachments),
          updated_at = NOW()
      WHERE id = $9 AND property_id = $10 AND deleted_at IS NULL
      RETURNING *
      `,
      [
        payload?.title ?? null,
        payload?.content ?? null,
        payload?.announcement_type ?? payload?.announcementType ?? null,
        payload?.priority ?? null,
        payload?.target_all_tenants ?? payload?.targetAllTenants ?? null,
        payload?.target_specific_units ?? payload?.targetSpecificUnits ?? null,
        payload?.expires_at ?? payload?.expiresAt ?? null,
        payload?.attachments ?? null,
        announcementId,
        propertyId,
      ]
    );
    return result.rows[0] || null;
  }

  static async setPublished(propertyId, announcementId, published) {
    const result = await Database.query(
      `
      UPDATE property_announcements
      SET published = $1,
          published_at = CASE WHEN $1 = TRUE THEN NOW() ELSE NULL END,
          updated_at = NOW()
      WHERE id = $2 AND property_id = $3 AND deleted_at IS NULL
      RETURNING *
      `,
      [published, announcementId, propertyId]
    );
    return result.rows[0] || null;
  }

  static async archive(propertyId, announcementId, userId) {
    const result = await Database.query(
      `
      UPDATE property_announcements
      SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
      WHERE id = $2 AND property_id = $3 AND deleted_at IS NULL
      RETURNING *
      `,
      [userId, announcementId, propertyId]
    );
    return result.rows[0] || null;
  }

  static async markRead(tenantId, announcementId) {
    const result = await Database.query(
      `
      INSERT INTO tenant_announcement_reads (announcement_id, tenant_id, viewed_at, acknowledged)
      VALUES ($1, $2, NOW(), TRUE)
      ON CONFLICT (announcement_id, tenant_id)
      DO UPDATE SET acknowledged = TRUE, acknowledged_at = NOW()
      RETURNING *
      `,
      [announcementId, tenantId]
    );
    return result.rows[0];
  }
}

module.exports = PropertyAnnouncement;

