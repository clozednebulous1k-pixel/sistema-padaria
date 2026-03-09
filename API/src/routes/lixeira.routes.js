const express = require('express');
const router = express.Router();
const LixeiraController = require('../controllers/LixeiraController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', LixeiraController.listar);
router.post('/restaurar', LixeiraController.restaurar);
router.delete('/excluir-definitivo', LixeiraController.excluirDefinitivo);
router.post('/limpar-tudo', LixeiraController.limparTudo);

module.exports = router;
