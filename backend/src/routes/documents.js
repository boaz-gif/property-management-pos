const express = require('express');
const DocumentController = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');
const scopeMiddleware = require('../middleware/scopeMiddleware');
const upload = require('../middleware/upload');
const { auditMiddleware, auditView } = require('../middleware/auditMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

// All routes require authentication and scoping
router.use(authenticate);
router.use(scopeMiddleware);

// POST /api/documents/upload - Upload a file (with audit logging)
router.post('/upload', 
  requirePermission('document', 'create'),
  upload.single('file'), 
  auditMiddleware,
  DocumentController.uploadDocument
);

// GET /api/documents - List all documents
router.get('/', requirePermission('document', 'read'), DocumentController.getAllDocuments);

// GET /api/documents/:id - Get document metadata
router.get(
  '/:id',
  requirePermission('document', 'read', { documentIdParam: 'id' }),
  auditView('document', (req) => parseInt(req.params.id, 10)),
  DocumentController.getDocumentById
);

// GET /api/documents/:id/download - Download file
router.get(
  '/:id/download',
  requirePermission('document', 'read', { documentIdParam: 'id' }),
  auditView('document', (req) => parseInt(req.params.id, 10)),
  DocumentController.downloadDocument
);

// DELETE /api/documents/:id - Delete document (with audit logging)
router.delete('/:id', 
  requirePermission('document', 'delete', { documentIdParam: 'id' }),
  auditMiddleware,
  DocumentController.deleteDocument
);

// Soft Delete routes for documents
router.put('/:id/archive', 
  requirePermission('document', 'manage', { documentIdParam: 'id' }),
  auditMiddleware,
  DocumentController.archiveDocument
);

router.put('/:id/restore', 
  requirePermission('document', 'manage', { documentIdParam: 'id' }),
  auditMiddleware,
  DocumentController.restoreDocument
);

router.delete('/:id/permanent', 
  requirePermission('document', 'manage', { documentIdParam: 'id' }),
  auditMiddleware,
  DocumentController.permanentDeleteDocument
);

module.exports = router;
