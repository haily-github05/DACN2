// Backend: Xử lý dữ liệu tài khoản và mật khẩu.
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const authService = {
  checkPhoneExists: async (phone) => {
    const [rows] = await db.query('SELECT user_id FROM users WHERE phone = ?', [phone]);
    return rows.length > 0;
  },

  registerUser: async (fullName, phone, plainPassword) => {
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const [result] = await db.query(
      "INSERT INTO users (full_name, phone, password_hash, role, created_at) VALUES (?, ?, ?, 'USER', NOW())",
      [fullName, phone, passwordHash],
    );
    return result.insertId;
  },

  authenticateUser: async (identifier, plainPassword) => {
    const isEmail = identifier.includes('@');
    const [rows] = await db.query(
      isEmail
        ? 'SELECT user_id, full_name, phone, password_hash, is_active FROM users WHERE LOWER(email) = ? LIMIT 2'
        : 'SELECT user_id, full_name, phone, password_hash, is_active FROM users WHERE phone = ? LIMIT 1',
      [isEmail ? identifier.toLowerCase() : identifier],
    );
    if (rows.length !== 1) return null;

    const user = rows[0];
    const passwordMatches = user.password_hash && await bcrypt.compare(plainPassword, user.password_hash);
    if (!passwordMatches) return null;
    if(Number(user.is_active)!==1) throw Object.assign(new Error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.'),{status:403});
    const [result]=await db.query('UPDATE users SET last_login_at=NOW() WHERE user_id=? AND is_active=1',[user.user_id]);
    if(!result.affectedRows) throw Object.assign(new Error('Tài khoản đã bị khóa.'),{status:403});

    return {
      user_id: user.user_id,
      full_name: user.full_name,
      phone: user.phone,
    };
  },
};

module.exports = authService;
