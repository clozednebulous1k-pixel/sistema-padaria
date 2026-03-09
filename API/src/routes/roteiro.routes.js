const express = require('express');
const router = express.Router();
const RoteiroController = require('../controllers/RoteiroController');

router.post('/', RoteiroController.criar);
router.get('/', RoteiroController.listar);
router.get('/:id', RoteiroController.buscarPorId);
router.get('/:id/impressao', RoteiroController.gerarImpressao);
router.put('/:id', RoteiroController.atualizar);
router.put('/:id/itens', RoteiroController.atualizarItens);
router.delete('/:id', RoteiroController.deletar);

module.exports = router;
