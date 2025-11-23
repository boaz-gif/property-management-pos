const Document = require('../models/Document');
const fs = require('fs');
const path = require('path');

class DocumentService {
  static async uploadDocument(file, metaData, user) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const docData = {
      userId: user.id, // Owner of the document
      name: metaData.name || file.originalname,
      type: metaData.type || 'general',
      url: file.path, // Storing local path for now
      size: file.size,
      mimeType: file.mimetype
    };

    const document = await Document.create(docData);
    return document;
  }

  static async getAllDocuments(user) {
    return await Document.findAll(user.id, user.role);
  }

  static async getDocumentById(id, user) {
    const document = await Document.findById(id, user.id, user.role);
    if (!document) {
      throw new Error('Document not found or access denied');
    }
    return document;
  }

  static async deleteDocument(id, user) {
    const document = await this.getDocumentById(id, user);
    
    // Delete file from filesystem
    if (document.url && fs.existsSync(document.url)) {
      fs.unlinkSync(document.url);
    }

    await Document.delete(id);
    return { message: 'Document deleted successfully' };
  }
  
  static async getFilePath(id, user) {
    const document = await this.getDocumentById(id, user);
    
    if (!document.url || !fs.existsSync(document.url)) {
      throw new Error('File not found on server');
    }
    
    return document.url;
  }
}

module.exports = DocumentService;
