const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rotas públicas
router.post('/login', AuthController.login);
router.post('/registro', AuthController.registro);

// Rota protegida
router.get('/me', authMiddleware, AuthController.me);

module.exports = router;

