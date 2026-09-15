const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/', reportController.listReports);
router.get('/:reportName', reportController.getReportByName);

module.exports = router;
