const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const db = require('../config/db');
const { requireAdmin } = require('../services/adminService');
const router = express.Router(); router.use(requireAdmin);
const defaults = { theme: 'light', notifications: true, idleMinutes: 60 };
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const route = fn => async (req, res) => { res.set('Cache-Control', 'no-store'); try { await fn(req, res); } catch (e) { console.error('Admin settings:', e.code || e.status || 'error'); res.status(e.status || (e.code === 'ER_DUP_ENTRY' ? 409 : 503)).json({ success: false, message: e.status ? e.message : e.code === 'ER_DUP_ENTRY' ? 'Email hoặc số điện thoại đã được sử dụng.' : 'Không lưu được cài đặt. Vui lòng thử lại.' }); } };
router.get('/settings', route(async (req, res) => {
    const [[users], [prefs]] = await Promise.all([db.query('SELECT user_id,full_name,email,phone,avatar_url,role,is_active,created_at,last_login_at FROM users WHERE user_id=?', [req.admin.id]), db.query('SELECT theme,notifications,idle_minutes FROM admin_preferences WHERE admin_id=?', [req.admin.id])]);
    if (!users.length) throw fail('Không tìm thấy tài khoản.', 404); const u = users[0], p = prefs[0];
    res.json({ success: true, data: { profile: { id: String(u.user_id), name: u.full_name, email: u.email || '', phone: u.phone || '', avatar: u.avatar_url || '', role: u.role, active: !!u.is_active, createdAt: u.created_at, lastLoginAt: u.last_login_at }, preferences: p ? { theme: p.theme, notifications: !!p.notifications, idleMinutes: Number(p.idle_minutes) } : defaults } });
}));
router.put('/settings/profile', route(async (req, res) => {
    const b = req.body || {}; if (typeof b.name !== 'string' || !b.name.trim() || b.name.trim().length > 100 || typeof b.email !== 'string' || b.email.length > 150 || (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) || typeof b.phone !== 'string' || !/^0\d{9}$/.test(b.phone)) throw fail('Nhập họ tên, email hợp lệ và số điện thoại gồm 10 chữ số.');
    await db.query('UPDATE users SET full_name=?,email=?,phone=?,updated_at=NOW() WHERE user_id=?', [b.name.trim(), b.email.trim() || null, b.phone, req.admin.id]); res.json({ success: true, data: null });
}));
router.put('/settings/password', route(async (req, res) => {
    const b = req.body || {}; if (typeof b.currentPassword !== 'string' || typeof b.newPassword !== 'string' || b.newPassword.length < 8 || Buffer.byteLength(b.newPassword) > 72 || b.newPassword !== b.confirmPassword) throw fail('Mật khẩu mới cần từ 8 ký tự, tối đa 72 byte và xác nhận khớp nhau.');
    const [users] = await db.query('SELECT password_hash FROM users WHERE user_id=?', [req.admin.id]);
    if (!users.length || !users[0].password_hash || !await bcrypt.compare(b.currentPassword, users[0].password_hash)) throw fail('Mật khẩu hiện tại không đúng.');
    if (await bcrypt.compare(b.newPassword, users[0].password_hash)) throw fail('Mật khẩu mới phải khác mật khẩu hiện tại.');
    const hash = await bcrypt.hash(b.newPassword, 10); const [result] = await db.query('UPDATE users SET password_hash=?,updated_at=NOW() WHERE user_id=? AND password_hash=?', [hash, req.admin.id, users[0].password_hash]); if (!result.affectedRows) throw fail('Mật khẩu vừa được thay đổi. Hãy thử lại.', 409);
    res.json({ success: true, data: null });
}));
router.put('/settings/preferences', route(async (req, res) => {
    const b = req.body || {}; if (!['light', 'dark', 'system'].includes(b.theme) || typeof b.notifications !== 'boolean' || ![0, 15, 30, 60].includes(b.idleMinutes)) throw fail('Tùy chọn giao diện hoặc thời gian phiên không hợp lệ.');
    await db.query('INSERT INTO admin_preferences(admin_id,theme,notifications,idle_minutes) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE theme=VALUES(theme),notifications=VALUES(notifications),idle_minutes=VALUES(idle_minutes)', [req.admin.id, b.theme, b.notifications ? 1 : 0, b.idleMinutes]); res.json({ success: true, data: b });
}));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
router.post('/settings/avatar', upload.single('avatar'), route(async (req, res) => {
    if (!req.file) throw fail('Chọn ảnh đại diện.'); const b = req.file.buffer;
    const ext = b.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ? 'jpg' : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'png' : b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null;
    if (!ext) throw fail('Ảnh phải là JPEG, PNG hoặc WebP.');
    const filename = randomUUID() + '.' + ext, folder = path.join(__dirname, '../../uploads/avatars'); await fs.mkdir(folder, { recursive: true }); const file = path.join(folder, filename); await fs.writeFile(file, b, { flag: 'wx' });
    const avatar = '/uploads/avatars/' + filename;
    try { await db.query('UPDATE users SET avatar_url=?,updated_at=NOW() WHERE user_id=?', [avatar, req.admin.id]); } catch (e) { await fs.unlink(file); throw e; }
    res.json({ success: true, data: { avatar } });
}));
router.delete('/settings/avatar', route(async (req, res) => { await db.query('UPDATE users SET avatar_url=NULL,updated_at=NOW() WHERE user_id=?', [req.admin.id]); res.json({ success: true, data: null }); }));
router.use((e, req, res, next) => res.status(400).json({ success: false, message: e.code === 'LIMIT_FILE_SIZE' ? 'Ảnh tối đa 5 MB.' : 'Không đọc được ảnh tải lên.' }));
module.exports = router;
