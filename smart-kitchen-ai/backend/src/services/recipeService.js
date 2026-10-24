const db = require('../config/db');
const bcrypt = require('bcryptjs');

const authService = {
  // Hàm kiểm tra xem email đã tồn tại trong MySQL chưa
  checkEmailExists: async (email) => {
    const [rows] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    return rows.length > 0;
  },

  // Hàm mã hóa mật khẩu và chèn người dùng mới vào database
  registerUser: async (fullName, email, plainPassword) => {
    // 1. Tiến hành băm mật khẩu để bảo mật chuỗi thuần
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    // 2. Chạy câu lệnh SQL chèn dữ liệu vào bảng users
    const query = `
      INSERT INTO users (full_name, email, password_hash, created_at) 
      VALUES (?, ?, ?, NOW())
    `;
    
    const [result] = await db.query(query, [fullName, email, passwordHash]);
    return result.insertId; // Trả về mã user_id tự động tăng vừa được tạo
  }
};

module.exports = authService;
