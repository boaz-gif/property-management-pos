const Database = require('../utils/database');

class Document {
  static async create(docData) {
    const { userId, name, type, url, size, mimeType } = docData;

    const query = `
      INSERT INTO documents (user_id, name, type, url, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    // Note: Schema might need updates if we want to store size/mimeType explicitly
    // For now mapping to existing schema columns based on description
    // Assuming 'type' in schema refers to document category (lease, receipt) or file type?
    // Let's assume it's the category/type provided by user or inferred
    
    const values = [userId, name, type || 'general', url];
    const result = await Database.query(query, values);
    return result.rows[0];
  }

  static async findById(id, userId, userRole) {
    const query = `
      SELECT * FROM documents WHERE id = $1
    `;
    const result = await Database.query(query, [id]);
    const doc = result.rows[0];

    if (!doc) return null;

    // Access control
    if (userRole === 'tenant' && doc.user_id !== userId) {
      // Tenants can only see their own documents
      // UNLESS it's a shared document? For now strict ownership
      return null; 
    }
    
    // Admins might need access to tenant documents? 
    // If so, we'd need to check if tenant belongs to admin's property
    // For simplicity in this iteration:
    if (userRole === 'admin') {
        // Check if document owner is a tenant of this admin
        // This requires a join or separate check. 
        // Let's allow admins to see documents if they are the owner OR if they manage the user
        // For now, let's return the doc and let Service handle complex permission logic if needed
        // or add a basic check here:
        if (doc.user_id !== userId) {
             // Check if doc owner is a tenant of a property managed by admin
             const accessCheck = await Database.query(`
                SELECT 1 
                FROM tenants t
                JOIN properties p ON t.property_id = p.id
                WHERE t.id = $1 AND p.admin_id = $2
             `, [doc.user_id, userId]);
             
             if (accessCheck.rows.length === 0) {
                 // Maybe doc owner is not a tenant (e.g. another admin?), then deny
                 return null;
             }
        }
    }

    return doc;
  }

  static async findAll(userId, userRole) {
    let query = `SELECT * FROM documents`;
    let params = [];

    if (userRole === 'tenant') {
      query += ` WHERE user_id = $1`;
      params.push(userId);
    } else if (userRole === 'admin') {
      // Admin sees their own docs AND docs of their tenants
      query += ` 
        WHERE user_id = $1 
        OR user_id IN (
          SELECT t.id 
          FROM tenants t 
          JOIN properties p ON t.property_id = p.id 
          WHERE p.admin_id = $1
        )
      `;
      params.push(userId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await Database.query(query, params);
    return result.rows;
  }

  static async delete(id) {
    const query = `DELETE FROM documents WHERE id = $1 RETURNING *`;
    const result = await Database.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Document;
