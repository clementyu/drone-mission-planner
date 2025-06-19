const express = require('express');
const router = express.Router();
const fileReportController = require('../controllers/fileReportController');

// Python will POST here:
router.post('/report', fileReportController.receiveReport);

// Front end can GET the latest report here:
router.get('/report/latest', fileReportController.getLatestReport);

module.exports = router;
