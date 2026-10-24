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
      'INSERT INTO users (full_name, phone, password_hash, created_at) VALUES (?, ?, ?, NOW())',
      [fullName, phone, passwordHash],
    );
    return result.insertId;
  },

  authenticateUser: async (phone, plainPassword) => {
    const [rows] = await db.query(
      'SELECT user_id, full_name, phone, password_hash FROM users WHERE phone = ? LIMIT 1',
      [phone],
    );
    if (rows.length === 0) return null;

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(plainPassword, user.password_hash);
    if (!passwordMatches) return null;

    return {
      user_id: user.user_id,
      full_name: user.full_name,
      phone: user.phone,
    };
  },
};

module.exports = authService;
