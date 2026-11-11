const fs = require('node:fs');
const path = require('node:path');
const db = require('../src/config/db');
async function ensurePostModeration() {
  const [columns] = await db.query("SHOW COLUMNS FROM community_posts LIKE 'moderation_status'");
  const statements = fs.readFileSync(path.join(__dirname,'../migrations/20261111_post_moderation.sql'),'utf8').split(';').filter(s=>s.trim());
  for (const statement of columns.length ? statements.slice(1) : statements) await db.query(statement);
  const [current] = await db.query("SHOW COLUMNS FROM community_posts LIKE 'moderation_status'");
  if (!current[0].Type.includes("'HIDDEN'")) await db.query(fs.readFileSync(path.join(__dirname,'../migrations/20261111_hidden_posts.sql'),'utf8'));
}
if(require.main===module) ensurePostModeration().then(()=>console.log('Đã cập nhật duyệt bài và trạng thái đọc thông báo.')).catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.end());
module.exports={ensurePostModeration};
