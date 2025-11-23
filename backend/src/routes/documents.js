const express = require('express');
const DocumentController = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

// POST /api/documents/upload - Upload a file
router.post('/upload', upload.single('file'), DocumentController.uploadDocument);

// GET /api/documents - List all documents
router.get('/', DocumentController.getAllDocuments);

// GET /api/documents/:id - Get document metadata
router.get('/:id', DocumentController.getDocumentById);

// GET /api/documents/:id/download - Download file
router.get('/:id/download', DocumentController.downloadDocument);

// DELETE /api/documents/:id - Delete document
router.delete('/:id', DocumentController.deleteDocument);

module.exports = router;
