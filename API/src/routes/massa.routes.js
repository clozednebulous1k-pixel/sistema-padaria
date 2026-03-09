const express = require('express');
const router = express.Router();
const MassaController = require('../controllers/MassaController');

router.get('/', MassaController.listar);
router.post('/', MassaController.criar);
router.delete('/:nome', MassaController.deletar);

module.exports = router;
