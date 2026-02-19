const Database = require('../utils/database');
const BaseSoftDeleteModel = require('./BaseSoftDeleteModel');
const Conversation = require('./Conversation');

class Document extends BaseSoftDeleteModel {
  constructor() {
    super('documents', Database);
  }

  static async create(docData) {
    const { 
      userId, 
      name, 
      type, 
      filePath, // using file_path to match DB
      size, 
      mimeType, 
      description,
      entityType,
      entityId,
      category = 'other',
      isEncrypted = false,
      encryptionIv = null,
      encryptionAuthTag = null,
      encryptionKeyId = null,
      encryptionAlgorithm = null
    } = docData;

    const query = `
      INSERT INTO documents (
        user_id, name, type, file_path, file_size, mime_type, description,
        entity_type, entity_id, category, is_encrypted, encryption_iv, encryption_auth_tag, encryption_key_id, encryption_algorithm,
        created_at, uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15)
      RETURNING *
    `;

    const values = [
      userId, 
      name, 
      type || 'general', 
      filePath, 
      size, 
      mimeType, 
      description,
      entityType,
      entityId,
      category,
      Boolean(isEncrypted),
      encryptionIv,
      encryptionAuthTag,
      encryptionKeyId,
      encryptionAlgorithm,
      userId
    ];

    const result = await Database.query(query, values);
    return result.rows[0];
  }

  static async findById(id, userId, userRole, userProperties) {
    const query = `
      SELECT d.*, u.name as uploader_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.id = $1 AND d.deleted_at IS NULL
    `;
    const result = await Database.query(query, [id]);
    const doc = result.rows[0];

    if (!doc) return null;

    // Access control
    if (userRole === 'super_admin') return doc;

    // Check ownership
    if (doc.user_id === userId || doc.uploaded_by === userId) return doc;

    // Check context access
    const hasAccess = await this.checkAccess(doc, userId, userRole, userProperties);
    if (!hasAccess) return null;

    return doc;
  }

  // Helper to check contextual access
  static async checkAccess(doc, userId, userRole, userProperties) {
    // 1. Property-Linked Documents
    if (doc.entity_type === 'property') {
      // Admin owns the property?
      if (userRole === 'admin' && userProperties && userProperties.includes(doc.entity_id)) {
        return true;
      }
      // Tenant lives in the property? (Needs expensive check or rely on caller)
      // For now, restrictive: only admins see property docs unless public
    }

    // 2. Tenant-Linked Documents
    if (doc.entity_type === 'tenant') {
      // Is this the tenant?
      // Need to resolve tenant_id from user_id to be sure, or pass it in.
      // Assuming caller handles basic "is this my doc" logic before.
      
      // Admin owns the property the tenant belongs to?
      if (userRole === 'admin') {
         const tenantCheck = await Database.query(
             'SELECT property_id FROM tenants WHERE id = $1', [doc.entity_id]
         );
         if (tenantCheck.rows.length > 0 && userProperties.includes(tenantCheck.rows[0].property_id)) {
             return true;
         }
      }
    }
    
    // 3. Maintenance/Payment (Indirect link to Property)
    // ... logic would go here

    // 4. Conversation attachments
    if (doc.entity_type === 'conversation') {
      const isParticipant = await Conversation.isParticipant(doc.entity_id, userId);
      if (isParticipant) return true;
    }

    return false;
  }

  static async findAll(filters) {
    const { 
      userId, 
      userRole, 
      userProperties,
      entityType, 
      entityId,
      category
    } = filters;

    let query = `
      SELECT d.*, u.name as uploader_name 
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.deleted_at IS NULL
    `;
    let params = [];
    let paramCount = 1;

    // Context Filtering
    if (entityType && entityId) {
      query += ` AND d.entity_type = $${paramCount} AND d.entity_id = $${paramCount + 1}`;
      params.push(entityType, entityId);
      paramCount += 2;
    }

    if (category) {
      query += ` AND d.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    // Security Filtering
    if (entityType === 'conversation' && entityId) {
      if (userRole !== 'super_admin') {
        const isParticipant = await Conversation.isParticipant(parseInt(entityId), userId);
        if (!isParticipant) {
          return [];
        }
      }
      query += ` ORDER BY d.created_at DESC`;
      const result = await Database.query(query, params);
      return result.rows;
    }

    if (userRole === 'tenant') {
       // Tenants see: 
       // 1. Docs they own/uploaded
       // 2. Docs linked to them explicitly
       // 3. Docs linked to their Property that are NOT sensitive (TODO: Add 'is_public' flag later?)
       query += ` AND (d.user_id = $${paramCount} OR (d.entity_type = 'tenant' AND d.entity_id = (SELECT id FROM tenants WHERE user_id = $${paramCount} LIMIT 1)))`;
       params.push(userId);
       paramCount++;
    } else if (userRole === 'admin') {
       // Admins see:
       // 1. Docs they uploaded
       // 2. Docs linked to their properties
       // 3. Docs linked to tenants in their properties
       if (userProperties && userProperties.length > 0) {
         query += ` 
           AND (
             d.uploaded_by = $${paramCount}
             OR (d.entity_type = 'property' AND d.entity_id = ANY($${paramCount+1}))
             OR (d.entity_type = 'tenant' AND d.entity_id IN (SELECT id FROM tenants WHERE property_id = ANY($${paramCount+1})))
             OR (d.entity_type = 'maintenance' AND d.entity_id IN (SELECT id FROM maintenance WHERE property_id = ANY($${paramCount+1})))
             OR (d.entity_type = 'payment' AND d.entity_id IN (SELECT id FROM payments WHERE property_id = ANY($${paramCount+1})))
           )
         `;
         params.push(userId, userProperties);
         paramCount += 2;
       } else {
         query += ` AND d.uploaded_by = $${paramCount}`;
         params.push(userId);
         paramCount++;
       }
    }

    query += ` ORDER BY d.created_at DESC`;

    const result = await Database.query(query, params);
    return result.rows;
  }
}

module.exports = Document;
