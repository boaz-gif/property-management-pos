const Database = require('../utils/database');

class Organization {
  static async findAllForUser(user) {
    if (user.role === 'super_admin') {
      const result = await Database.query(
        'SELECT * FROM organizations WHERE deleted_at IS NULL ORDER BY created_at DESC',
        []
      );
      return result.rows;
    }

    const properties = Array.isArray(user.properties) ? user.properties : [];

    const result = await Database.query(
      `
      SELECT DISTINCT o.*
      FROM organizations o
      LEFT JOIN organization_members om ON om.organization_id = o.id AND om.user_id = $1
      LEFT JOIN properties p ON p.organization_id = o.id AND p.deleted_at IS NULL
      WHERE o.deleted_at IS NULL
        AND (
          om.user_id IS NOT NULL
          OR (array_length($2::int[], 1) IS NOT NULL AND p.id = ANY($2::int[]))
          OR o.owner_user_id = $1
        )
      ORDER BY o.created_at DESC
      `,
      [user.id, properties]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await Database.query(
      'SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  }

  static async create({ name, slug, ownerUserId }, createdByUserId) {
    const result = await Database.query(
      `
      INSERT INTO organizations (name, slug, owner_user_id, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
      `,
      [name, slug, ownerUserId ?? null]
    );

    const org = result.rows[0];

    if (ownerUserId) {
      await Database.query(
        `
        INSERT INTO organization_members (organization_id, user_id, member_role)
        VALUES ($1, $2, 'owner')
        ON CONFLICT DO NOTHING
        `,
        [org.id, ownerUserId]
      );
    } else if (createdByUserId) {
      await Database.query(
        `
        INSERT INTO organization_members (organization_id, user_id, member_role)
        VALUES ($1, $2, 'owner')
        ON CONFLICT DO NOTHING
        `,
        [org.id, createdByUserId]
      );
      await Database.query('UPDATE organizations SET owner_user_id = $1 WHERE id = $2', [createdByUserId, org.id]);
      org.owner_user_id = createdByUserId;
    }

    return org;
  }

  static async update(id, { name, slug }, updatedByUserId) {
    const result = await Database.query(
      `
      UPDATE organizations
      SET name = COALESCE($1, name),
          slug = COALESCE($2, slug),
          updated_at = NOW()
      WHERE id = $3 AND deleted_at IS NULL
      RETURNING *
      `,
      [name ?? null, slug ?? null, id]
    );
    return result.rows[0] || null;
  }

  static async archive(id, userId) {
    const result = await Database.query(
      `
      UPDATE organizations
      SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
      `,
      [userId, id]
    );
    return result.rows[0] || null;
  }

  static async addMember(organizationId, userId, memberRole = 'member') {
    const result = await Database.query(
      `
      INSERT INTO organization_members (organization_id, user_id, member_role)
      VALUES ($1, $2, $3)
      ON CONFLICT (organization_id, user_id)
      DO UPDATE SET member_role = EXCLUDED.member_role
      RETURNING *
      `,
      [organizationId, userId, memberRole]
    );
    return result.rows[0];
  }

  static async removeMember(organizationId, userId) {
    const result = await Database.query(
      'DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2 RETURNING *',
      [organizationId, userId]
    );
    return result.rows[0] || null;
  }

  static async listMembers(organizationId) {
    const result = await Database.query(
      `
      SELECT om.organization_id, om.user_id, om.member_role, om.created_at,
             u.name, u.email, u.role
      FROM organization_members om
      JOIN users u ON u.id = om.user_id AND u.deleted_at IS NULL
      WHERE om.organization_id = $1
      ORDER BY om.created_at ASC
      `,
      [organizationId]
    );
    return result.rows;
  }
}

module.exports = Organization;

