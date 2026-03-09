const express = require('express');
const router = express.Router();
const VendaController = require('../controllers/VendaController');

router.post('/', VendaController.criar);
router.get('/', VendaController.listar);
router.get('/:id', VendaController.buscarPorId);

module.exports = router;
