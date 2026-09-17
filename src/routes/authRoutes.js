const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public Login Endpoint
router.post('/login', authController.login);

// Public Patient Registration Endpoint
router.post('/register', authController.register);

// Authenticated Current User Endpoint
router.get('/me', authenticateToken, authController.getMe);


module.exports = router;
