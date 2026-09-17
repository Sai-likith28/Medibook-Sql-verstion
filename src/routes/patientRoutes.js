const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticateToken, optionalAuthenticateToken, requireRole } = require('../middleware/auth');

// Public Doctor & Slot Discovery
router.get('/doctors', patientController.getAllDoctors);
router.get('/doctors/:id/slots', patientController.getDoctorSlots);

// Booking Endpoint (supports optional auth for authenticated patient vs public)
router.post('/bookings', optionalAuthenticateToken, patientController.bookSlot);
router.get('/bookings/:id', patientController.getBooking);

// Authenticated Patient History & Inspection
router.get('/patients/me/appointments', authenticateToken, requireRole('PATIENT'), patientController.getMyAppointments);
router.get('/patients/me/appointments/:id', authenticateToken, requireRole('PATIENT', 'ADMIN'), patientController.getMyAppointmentById);
router.get('/patients/me/tests', authenticateToken, requireRole('PATIENT'), patientController.getMyTests);
router.get('/patients/me/appointments/:id/tests', authenticateToken, requireRole('PATIENT', 'ADMIN'), patientController.getMyAppointmentTests);

module.exports = router;
