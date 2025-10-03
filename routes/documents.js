// routes/documents.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DocumentController = require('../controllers/documentController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Keep original filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Allow multiple file formats
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain', // .txt
      'text/markdown', // .md
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt
      'text/csv', // .csv
      'application/csv', // .csv
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Supported formats: PDF, DOCX, DOC, TXT, MD, PPTX, PPT, CSV, XLSX, XLS'), false);
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit for larger documents
  }
});

// GET /documents/supported-formats - Get supported document formats
router.get('/supported-formats', DocumentController.getSupportedFormats);

// POST /documents/upload - Upload and process document (replaces /Load-document)
router.post('/upload', upload.single('documentFile'), DocumentController.uploadDocument);

// POST /Load-document - Legacy endpoint (keep for backward compatibility)
router.post('/Load-document', upload.single('documentFile'), DocumentController.uploadDocument);

// GET /documents - Get all uploaded documents
router.get('/', DocumentController.getDocuments);

// GET /documents/uploaded-files - Get uploaded files (legacy endpoint)
router.get('/uploaded-files', DocumentController.getUploadedFiles);

// GET /documents/:name - Get document details by name
router.get('/:name', DocumentController.getDocumentByName);

// DELETE /documents/:fileId - Delete uploaded file
router.delete('/:fileId', DocumentController.deleteDocument);

// DELETE /uploaded-files/:fileId - Legacy delete endpoint
router.delete('/uploaded-files/:fileId', DocumentController.deleteDocument);

module.exports = router;