const fs = require('node:fs');
const path = require('node:path');
const db = require('../src/config/db');

async function ensureUserRoles() {
  const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'role'");
  if (!columns.length) await db.query(fs.readFileSync(path.join(__dirname, '../migrations/20261111_user_roles.sql'), 'utf8'));
}
async function importLegacyAdmins() {
  const values = String(process.env.ADMIN_USER_IDS || '').split(',').map(value => value.trim()).filter(Boolean);
  const ids = [...new Set(values.map(Number))];
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error('ADMIN_USER_IDS chứa ID không hợp lệ.');
  if (!ids.length) return 0;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const id of ids) {
      const [rows] = await conn.query('SELECT user_id FROM users WHERE user_id=? FOR UPDATE', [id]);
      if (!rows.length) throw new Error(`Không tìm thấy tài khoản admin ${id}`);
      await conn.query("UPDATE users SET role='ADMIN' WHERE user_id=?", [id]);
    }
    await conn.commit();
    return ids.length;
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}
if (require.main === module) {
  (async () => {
    await ensureUserRoles();
    const imported = process.argv.includes('--import-legacy-admins') ? await importLegacyAdmins() : 0;
    console.log(`Đã tạo cột role. Chuyển ${imported} tài khoản admin từ cấu hình cũ.`);
  })().catch(error => { console.error(error.message); process.exitCode=1; }).finally(()=>db.end());
}
module.exports = { ensureUserRoles };
