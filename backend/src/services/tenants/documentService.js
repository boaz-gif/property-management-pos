const Document = require('../../models/Document');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PermissionService = require('../auth/PermissionService');
const { encryptBuffer, getKey } = require('../../utils/encryption');
const Conversation = require('../../models/Conversation');

class DocumentService {
  static async uploadDocument(file, body, user) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const { 
      entityType, 
      entityId, 
      category, 
      description,
      type // Keeping for backward compatibility if sent
    } = body;

    // Security: Check if user has access to the entity they are uploading for
    if (entityType && entityId) {
        if (entityType === 'property') {
            await PermissionService.ensurePropertyAccess(user, entityId);
        } else if (entityType === 'tenant') {
            await PermissionService.ensureTenantAccess(user, entityId);
        } else if (entityType === 'conversation') {
            const isParticipant = await Conversation.isParticipant(parseInt(entityId, 10), user.id);
            if (!isParticipant && user.role !== 'super_admin') {
                throw new Error('Access denied');
            }
        } else if (entityType === 'payment') {
            // Add payment permission check if needed (admins usually have access)
            // For now, if payment belongs to a tenant the user can access:
            // This is handled by controller usually, but for extra safety:
            // We'll trust the flow for now or add explicit check if Payment model supports it easily.
        }
    }

    const docData = {
      userId: user.id, // Owner of the document
      name: file.originalname,
      type: type || 'general',
      filePath: file.path, 
      size: file.size,
      mimeType: file.mimetype,
      description,
      entityType,
      entityId: entityId ? parseInt(entityId) : null,
      category
    };

    const shouldEncrypt = category === 'sensitive' || body.encrypt === 'true';
    if (shouldEncrypt) {
      const plaintext = fs.readFileSync(file.path);
      const encrypted = encryptBuffer(plaintext);
      const encryptedPath = `${file.path}.enc`;
      fs.writeFileSync(encryptedPath, encrypted.ciphertext);
      fs.unlinkSync(file.path);

      docData.filePath = encryptedPath;
      docData.isEncrypted = true;
      docData.encryptionIv = encrypted.iv;
      docData.encryptionAuthTag = encrypted.authTag;
      docData.encryptionKeyId = encrypted.keyId;
      docData.encryptionAlgorithm = encrypted.algorithm;
    }

    const document = await Document.create(docData);
    return document;
  }

  static async getAllDocuments(user, queryParams = {}) {
    const filters = {
      userId: user.id,
      userRole: user.role,
      userProperties: user.properties,
      entityType: queryParams.entityType,
      entityId: queryParams.entityId,
      category: queryParams.category
    };

    return await Document.findAll(filters);
  }

  static async getDocumentById(id, user) {
    const document = await Document.findById(id, user.id, user.role, user.properties);
    if (!document) {
      throw new Error('Document not found or access denied');
    }
    return document;
  }

  static async deleteDocument(id, user) {
    const document = await this.getDocumentById(id, user);
    
    // Soft delete only updates DB, doesn't remove file immediately
    // If we want to keep file for "Restore", do not unlink.
    // If we want to save space, unlink. 
    // Given "Soft Delete" requirement, we usually keep the file until Permanent Delete.
    
    // For now, let's keep the file on disk as it is a soft delete operation in the controller DELETE /:id route mapping to "delete" which is deprecated in favor of archive.
    // However, if the controller calls deleteDocument, usually that implies "Hard Delete" or "Soft Delete" depending on implementation. 
    // In BaseSoftDeleteModel systems, DELETE usually means Soft Delete.
    // Use archive instead for clarity, but if we must support delete:
    
    // Warning: Original implementation unlinked file. 
    // We should probably NOT unlink on soft delete.
    
    await Document.delete(id); // This calls deprecated delete which does soft delete
    return { message: 'Document moved to trash' };
  }

  static async archiveDocument(id, user) {
    const document = await this.getDocumentById(id, user);
    await Document.archive(id, user);
    return { message: 'Document archived successfully' };
  }

  static async restoreDocument(id, user) {
    // Permission check inside model
    await Document.restore(id, user);
    return { message: 'Document restored successfully' };
  }

  static async permanentDeleteDocument(id, user) {
    // Access check in model (super_admin)
    // Here we should delete the file from disk
    const document = await Document.findById(id, user.id, user.role, user.properties); 
    // Note: findById might return null if deleted_at is set. 
    // We might need a "findWithDeleted" or similar, or just query directly.
    // For now assuming super_admin can find it via specific model method or just proceed.
    
    // Actually BaseSoftDeleteModel usually filters out deleted. 
    // Permanent delete usually requires finding it first even if soft-deleted.
    
    if (document && document.file_path && fs.existsSync(document.file_path)) {
      try {
        fs.unlinkSync(document.file_path);
      } catch (err) {
        console.error('Failed to delete file from disk:', err);
      }
    }
    
    await Document.permanentDelete(id, user);
    return { message: 'Document permanently deleted' };
  }
  
  static async getFilePath(id, user) {
    const document = await this.getDocumentById(id, user);
    
    // Map file_path to url (backwards compatibility if needed, but better use file_path)
    const filePath = document.file_path || document.url;
    
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('File not found on server');
    }
    
    return filePath;
  }

  static async streamDocument(id, user, res) {
    const document = await this.getDocumentById(id, user);
    const filePath = document.file_path || document.url;

    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('File not found on server');
    }

    if (!document.is_encrypted) {
      res.download(filePath, document.name);
      return;
    }

    const iv = document.encryption_iv;
    const authTag = document.encryption_auth_tag;
    const algorithm = document.encryption_algorithm || 'aes-256-gcm';
    if (!iv || !authTag) {
      throw new Error('Encrypted document metadata missing');
    }

    const key = getKey();
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.name || 'document')}"`);

    const input = fs.createReadStream(filePath);
    input.on('error', (err) => {
      res.destroy(err);
    });
    decipher.on('error', (err) => {
      res.destroy(err);
    });
    input.pipe(decipher).pipe(res);
  }
}

module.exports = DocumentService;
