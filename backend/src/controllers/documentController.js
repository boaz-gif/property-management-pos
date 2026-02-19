const DocumentService = require('../services/tenants/documentService');
const { HTTP_STATUS } = require('../utils/constants');
const path = require('path');

class DocumentController {
  static async uploadDocument(req, res, next) {
    try {
      const document = await DocumentService.uploadDocument(req.file, req.body, req.user);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllDocuments(req, res, next) {
    try {
      const documents = await DocumentService.getAllDocuments(req.user, req.query);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: documents
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDocumentById(req, res, next) {
    try {
      const document = await DocumentService.getDocumentById(req.params.id, req.user);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: document
      });
    } catch (error) {
      next(error);
    }
  }

  static async downloadDocument(req, res, next) {
    try {
      await DocumentService.streamDocument(req.params.id, req.user, res);
    } catch (error) {
      next(error);
    }
  }

  static async deleteDocument(req, res, next) {
    try {
      const result = await DocumentService.deleteDocument(req.params.id, req.user);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Soft Delete Methods
  static async archiveDocument(req, res, next) {
    try {
      const { id } = req.params;
      const result = await DocumentService.archiveDocument(id, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Document archived', data: result });
    } catch (error) { next(error); }
  }

  static async restoreDocument(req, res, next) {
    try {
      const { id } = req.params;
      const result = await DocumentService.restoreDocument(id, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Document restored', data: result });
    } catch (error) { next(error); }
  }

  static async permanentDeleteDocument(req, res, next) {
    try {
      const { id } = req.params;
      if (req.user.role !== 'super_admin') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Only super admins can permanently delete records' });
      }
      const result = await DocumentService.permanentDeleteDocument(id, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Document permanently deleted', data: result });
    } catch (error) { next(error); }
  }
}

module.exports = DocumentController;
