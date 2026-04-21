const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota: POST /api/auth/register
router.post('/register', authController.register);

// Rota: POST /api/auth/login
router.post('/login', authController.login);

// Rota: POST /api/auth/subscribe (Para salvar o push do celular)
router.post('/subscribe', authController.updateSubscription);

module.exports = router;