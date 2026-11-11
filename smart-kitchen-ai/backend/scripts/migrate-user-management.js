const db=require('../src/config/db');
async function ensureUserManagement(){
 const [columns]=await db.query('SHOW COLUMNS FROM users');const names=new Set(columns.map(c=>c.Field));
 const additions=[];
 if(!names.has('is_active'))additions.push('ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
 if(!names.has('locked_reason'))additions.push('ADD COLUMN locked_reason VARCHAR(500) NULL');
 if(!names.has('last_login_at'))additions.push('ADD COLUMN last_login_at DATETIME NULL');
 if(additions.length)await db.query('ALTER TABLE users '+additions.join(', '));
}
if(require.main===module)ensureUserManagement().then(()=>console.log('Đã thêm trạng thái tài khoản và thời điểm đăng nhập.')).catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.end());
module.exports={ensureUserManagement};
