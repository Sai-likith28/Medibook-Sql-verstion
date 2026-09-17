const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Doctor Clinical Test Catalog
router.get('/tests', authenticateToken, requireRole('DOCTOR'), doctorController.getTestCatalog);

// Doctor Appointment History (Assigned to Doctor)
router.get('/appointments', authenticateToken, requireRole('DOCTOR'), doctorController.getDoctorAppointments);

// Single Appointment Consultation Details
router.get('/appointments/:id', authenticateToken, requireRole('DOCTOR', 'ADMIN'), doctorController.getDoctorAppointmentById);

// Clinical Test Suggestions
router.get('/appointments/:id/tests', authenticateToken, requireRole('DOCTOR', 'ADMIN'), doctorController.getAppointmentTests);
router.post('/appointments/:id/tests', authenticateToken, requireRole('DOCTOR'), doctorController.suggestTest);
router.delete('/appointments/:id/tests/:testId', authenticateToken, requireRole('DOCTOR'), doctorController.removeTest);

module.exports = router;
