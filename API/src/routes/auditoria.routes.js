const express = require('express');
const router = express.Router();
const AuditoriaController = require('../controllers/AuditoriaController');
const authMiddleware = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');

// Rota para registrar cliques em botões (requer autenticação, mas não precisa ser admin)
router.post('/clique', authMiddleware, AuditoriaController.registrarClique);

// Todas as rotas de auditoria requerem autenticação e permissão de admin
router.get('/', authMiddleware, adminMiddleware, AuditoriaController.listar);
router.get('/estatisticas', authMiddleware, adminMiddleware, AuditoriaController.estatisticas);
router.delete('/', authMiddleware, adminMiddleware, AuditoriaController.limpar);
router.get('/:id', authMiddleware, adminMiddleware, AuditoriaController.buscarPorId);

module.exports = router;

