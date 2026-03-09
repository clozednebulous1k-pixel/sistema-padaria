const express = require('express');
const router = express.Router();
const EmpresaController = require('../controllers/EmpresaController');

router.get('/', EmpresaController.listar);
router.post('/', EmpresaController.criar);
router.delete('/:id', EmpresaController.deletar);

module.exports = router;

