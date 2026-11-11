const { createToken } = require("../services/sessionService");
// Backend: Xử lý yêu cầu đăng nhập và đăng ký.
const authService = require('../services/authService');

const authController = {
  register: async (req, res) => {
    try {
      const { full_name, phone, password } = req.body;
      const normalizedPhone = typeof phone === 'string' ? phone.replace(/\s/g, '') : '';
      const normalizedName = typeof full_name === 'string' ? full_name.trim() : '';

      if (!normalizedName || !normalizedPhone || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
      }
      if (!/^(0[35789]\d{8}|[35789]\d{8})$/.test(normalizedPhone)) {
        return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ' });
      }
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự' });
      }

      if (await authService.checkPhoneExists(normalizedPhone)) {
        return res.status(409).json({ success: false, message: 'Số điện thoại đã được đăng ký' });
      }

      const userId = await authService.registerUser(normalizedName, normalizedPhone, password);
      return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công!',
        data: { user_id: userId, full_name: normalizedName, phone: normalizedPhone, token: createToken(userId) },
      });
    } catch (error) {
      console.error('Registration error:', error.message);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'Số điện thoại đã được đăng ký' });
      }
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi đăng ký' });
    }
  },

  login: async (req, res) => {
    try {
      const { password } = req.body;
      const rawIdentifier = req.body.identifier ?? req.body.email ?? req.body.phone;
      const value = typeof rawIdentifier === 'string' ? rawIdentifier.trim() : '';
      const isEmail = value.includes('@');
      const identifier = isEmail ? value.toLowerCase() : value.replace(/\s/g, '');

      if (!identifier || typeof password !== 'string' || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập email hoặc số điện thoại và mật khẩu' });
      }
      if (isEmail ? identifier.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) : !/^(0[35789]\d{8}|[35789]\d{8})$/.test(identifier)) {
        return res.status(400).json({ success: false, message: 'Email hoặc số điện thoại không hợp lệ' });
      }

      const user = await authService.authenticateUser(identifier, password);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Email, số điện thoại hoặc mật khẩu không đúng' });
      }

      return res.json({ success: true, message: 'Đăng nhập thành công', data: { ...user, token: createToken(user.user_id) } });
    } catch (error) {
      console.error('Login error:', error.message);
      return res.status(error.status===403?403:500).json({ success: false, message: error.status===403?error.message:'Lỗi hệ thống khi đăng nhập' });
    }
  },
};

module.exports = authController;
