const db = require('../config/db');
const { tokenUser } = require('./sessionService');

async function requireAdmin(req, res, next) {
  const userId = tokenUser(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để truy cập trang quản trị.' });
  try {
    const [users] = await db.query('SELECT user_id, full_name, role, is_active, avatar_url FROM users WHERE user_id=?', [userId]);
    if (!users.length) return res.status(401).json({ success: false, message: 'Tài khoản không còn tồn tại.' });
    if (Number(users[0].is_active)!==1) return res.status(403).json({success:false,message:'Tài khoản đã bị khóa.'});
    if (users[0].role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Tài khoản không có quyền quản trị.' });
    req.admin = { id: Number(users[0].user_id), name: users[0].full_name, role: users[0].role, avatar: users[0].avatar_url || '' };
    next();
  } catch (error) {
    console.error('Admin session:', error.message);
    res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu. Vui lòng thử lại.' });
  }
}
module.exports = { requireAdmin };
