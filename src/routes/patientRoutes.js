const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

router.get('/doctors', patientController.getAllDoctors);
router.get('/doctors/:id/slots', patientController.getDoctorSlots);
router.post('/bookings', patientController.bookSlot);
router.get('/bookings/:id', patientController.getBooking);

module.exports = router;
