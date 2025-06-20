const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// POST /api/files/upload
router.post('/upload', fileController.uploadFiles);

// POST /api/files/process
router.post('/process', fileController.processFile);

// POST /api/files/preview
router.post('/preview', fileController.previewFile);

module.exports = router;
