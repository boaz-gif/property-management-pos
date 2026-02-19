const Database = require('../utils/database');

class Team {
  static async listByOrganization(organizationId) {
    const result = await Database.query(
      `
      SELECT *
      FROM teams
      WHERE organization_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      `,
      [organizationId]
    );
    return result.rows;
  }

  static async findById(organizationId, teamId) {
    const result = await Database.query(
      `
      SELECT *
      FROM teams
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `,
      [teamId, organizationId]
    );
    return result.rows[0] || null;
  }

  static async create(organizationId, { name }, createdByUserId) {
    const result = await Database.query(
      `
      INSERT INTO teams (organization_id, name, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING *
      `,
      [organizationId, name]
    );
    return result.rows[0];
  }

  static async update(organizationId, teamId, { name }) {
    const result = await Database.query(
      `
      UPDATE teams
      SET name = COALESCE($1, name),
          updated_at = NOW()
      WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
      RETURNING *
      `,
      [name ?? null, teamId, organizationId]
    );
    return result.rows[0] || null;
  }

  static async archive(organizationId, teamId, userId) {
    const result = await Database.query(
      `
      UPDATE teams
      SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
      WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
      RETURNING *
      `,
      [userId, teamId, organizationId]
    );
    return result.rows[0] || null;
  }

  static async listMembers(teamId) {
    const result = await Database.query(
      `
      SELECT tm.team_id, tm.user_id, tm.member_role, tm.created_at,
             u.name, u.email, u.role
      FROM team_members tm
      JOIN users u ON u.id = tm.user_id AND u.deleted_at IS NULL
      WHERE tm.team_id = $1
      ORDER BY tm.created_at ASC
      `,
      [teamId]
    );
    return result.rows;
  }

  static async addMember(teamId, userId, memberRole = 'member') {
    const result = await Database.query(
      `
      INSERT INTO team_members (team_id, user_id, member_role)
      VALUES ($1, $2, $3)
      ON CONFLICT (team_id, user_id)
      DO UPDATE SET member_role = EXCLUDED.member_role
      RETURNING *
      `,
      [teamId, userId, memberRole]
    );
    return result.rows[0];
  }

  static async removeMember(teamId, userId) {
    const result = await Database.query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 RETURNING *',
      [teamId, userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = Team;

