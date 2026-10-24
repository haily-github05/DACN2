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
        data: { user_id: userId, full_name: normalizedName, phone: normalizedPhone },
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
      const { phone, password } = req.body;
      const normalizedPhone = typeof phone === 'string' ? phone.replace(/\s/g, '') : '';

      if (!normalizedPhone || typeof password !== 'string' || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại và mật khẩu' });
      }
      if (!/^(0[35789]\d{8}|[35789]\d{8})$/.test(normalizedPhone)) {
        return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ' });
      }

      const user = await authService.authenticateUser(normalizedPhone, password);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Số điện thoại hoặc mật khẩu không đúng' });
      }

      return res.json({ success: true, message: 'Đăng nhập thành công', data: user });
    } catch (error) {
      console.error('Login error:', error.message);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi đăng nhập' });
    }
  },
};

module.exports = authController;
