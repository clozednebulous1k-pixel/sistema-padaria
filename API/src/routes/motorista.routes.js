const express = require('express');
const router = express.Router();
const MotoristaController = require('../controllers/MotoristaController');

router.get('/', MotoristaController.listar);
router.post('/', MotoristaController.criar);
router.delete('/:id', MotoristaController.deletar);

module.exports = router;

