const Database = require('../utils/database');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../utils/constants');

class User {
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await Database.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT id, name, email, role, properties, property_id, unit, status, created_at, updated_at FROM users WHERE id = $1';
    const result = await Database.query(query, [id]);
    return result.rows[0];
  }

  static async findByIdWithPassword(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await Database.query(query, [id]);
    return result.rows[0];
  }

  static async create(userData) {
    const { name, email, password, role, properties, property_id, unit } = userData;
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (name, email, password, role, properties, property_id, unit, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, name, email, role, properties, property_id, unit, status, created_at, updated_at
    `;
    
    const values = [name, email, hashedPassword, role, properties, property_id, unit, 'active'];
    const result = await Database.query(query, values);
    return result.rows[0];
  }

  static async updateLastLogin(id) {
    const query = 'UPDATE users SET updated_at = NOW() WHERE id = $1';
    await Database.query(query, [id]);
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePassword(id, newPassword) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    const query = 'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2';
    await Database.query(query, [hashedPassword, id]);
  }

  static async getAll(role) {
    let query = 'SELECT id, name, email, role, properties, property_id, unit, status, created_at, updated_at FROM users';
    let values = [];
    
    if (role) {
      query += ' WHERE role = $1';
      values.push(role);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await Database.query(query, values);
    return result.rows;
  }

  static async update(id, userData) {
    const { name, email, role, properties, property_id, unit, status } = userData;
    
    const query = `
      UPDATE users 
      SET name = $1, email = $2, role = $3, properties = $4, property_id = $5, unit = $6, status = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING id, name, email, role, properties, property_id, unit, status, created_at, updated_at
    `;
    
    const values = [name, email, role, properties, property_id, unit, status, id];
    const result = await Database.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1';
    await Database.query(query, [id]);
  }
}

module.exports = User;