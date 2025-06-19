const express = require('express');
const router = express.Router();
const missionController = require('../controllers/missionController');

// POST /api/mission/process
router.post('/process', missionController.processMission);

module.exports = router;
