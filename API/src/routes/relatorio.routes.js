const express = require('express');
const router = express.Router();
const RelatorioController = require('../controllers/RelatorioController');

router.get('/vendas', RelatorioController.vendasPorPeriodo);
router.get('/faturamento', RelatorioController.faturamentoPorDia);
router.get('/produtos-mais-vendidos', RelatorioController.produtosMaisVendidos);
router.get('/quantidade-por-produto', RelatorioController.quantidadePorProduto);

module.exports = router;
