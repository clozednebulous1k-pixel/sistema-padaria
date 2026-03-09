const express = require('express');
const router = express.Router();
const RecheioController = require('../controllers/RecheioController');

router.get('/', RecheioController.listar);
router.post('/', RecheioController.criar);
router.delete('/:nome', RecheioController.deletar);

module.exports = router;
