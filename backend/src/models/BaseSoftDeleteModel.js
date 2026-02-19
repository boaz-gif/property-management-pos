class BaseSoftDeleteModel {
  constructor(tableName, pool) {
    this.tableName = tableName;
    this.pool = pool;
  }

  // Find all active records (deleted_at IS NULL) - DEFAULT BEHAVIOR
  async findAll(user, options = {}) {
    const { where = '', params = [], joins = '' } = options;
    const query = `
      SELECT * FROM ${this.tableName}
      ${joins}
      WHERE deleted_at IS NULL
      ${where ? 'AND ' + where : ''}
    `;
    return await this.pool.query(query, params);
  }

  // Find ALL records including soft deleted
  async findAllWithDeleted(user, options = {}) {
    const { where = '', params = [], joins = '' } = options;
    const query = `
      SELECT * FROM ${this.tableName}
      ${joins}
      WHERE 1=1
      ${where ? 'AND ' + where : ''}
    `;
    return await this.pool.query(query, params);
  }

  // Find ONLY soft deleted records
  async findOnlyDeleted(user, options = {}) {
    const { where = '', params = [], joins = '' } = options;
    const query = `
      SELECT * FROM ${this.tableName}
      ${joins}
      WHERE deleted_at IS NOT NULL
      ${where ? 'AND ' + where : ''}
    `;
    return await this.pool.query(query, params);
  }

  // Find by ID (active only)
  async findById(id, user) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1 AND deleted_at IS NULL`;
    return await this.pool.query(query, [id]);
  }

  // Find by ID including deleted
  async findByIdWithDeleted(id, user) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    return await this.pool.query(query, [id]);
  }

  // SOFT DELETE - Set deleted_at timestamp
  async archive(id, user) {
    const query = `
      UPDATE ${this.tableName} 
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 
      WHERE id = $2 AND deleted_at IS NULL 
      RETURNING *
    `;
    return await this.pool.query(query, [user.id, id]);
  }

  // RESTORE - Clear deleted_at
  async restore(id, user) {
    const query = `
      UPDATE ${this.tableName} 
      SET deleted_at = NULL, deleted_by = NULL 
      WHERE id = $1 AND deleted_at IS NOT NULL 
      RETURNING *
    `;
    return await this.pool.query(query, [id]);
  }

  // PERMANENT DELETE - Only for super_admin role
  async permanentDelete(id, user) {
    // Verify user.role === 'super_admin'
    if (user.role !== 'super_admin') {
      throw new Error('Only super admins can permanently delete records');
    }
    
    // Hard delete from database
    const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
    return await this.pool.query(query, [id]);
  }

  // Check if record is archived
  async isArchived(id) {
    const query = `SELECT deleted_at IS NOT NULL as is_archived FROM ${this.tableName} WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0]?.is_archived || false;
  }
}

module.exports = BaseSoftDeleteModel;