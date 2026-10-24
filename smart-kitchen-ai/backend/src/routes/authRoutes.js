const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Khai báo đường dẫn API xử lý đăng ký tài khoản
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
