const DocumentService = require('../services/documentService');
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
      const documents = await DocumentService.getAllDocuments(req.user);
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
      const filePath = await DocumentService.getFilePath(req.params.id, req.user);
      res.download(filePath);
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
}

module.exports = DocumentController;
