const express = require('express');
const router = express.Router();
const OpcaoRelatorioController = require('../controllers/OpcaoRelatorioController');

router.get('/', OpcaoRelatorioController.listar);
router.post('/', OpcaoRelatorioController.criar);
router.delete('/:nome', OpcaoRelatorioController.deletar);

module.exports = router;

