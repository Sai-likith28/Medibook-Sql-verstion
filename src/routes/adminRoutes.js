const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.post('/doctors', adminController.createDoctor);
router.get('/doctors', adminController.getDoctors);
router.post('/slots', adminController.createSlot);
router.get('/slots', adminController.getSlots);

module.exports = router;
