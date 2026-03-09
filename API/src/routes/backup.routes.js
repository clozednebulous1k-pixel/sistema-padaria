const express = require('express');
const router = express.Router();
const BackupController = require('../controllers/BackupController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, BackupController.exportar);

module.exports = router;
