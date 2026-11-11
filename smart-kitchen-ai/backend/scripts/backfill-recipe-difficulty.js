// Phân loại biên tập ban đầu theo kỹ thuật món ăn, không phải đánh giá người dùng.
// Chỉ điền các món mẫu 9201–9300 còn trống; mặc định rollback, --apply để lưu.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const db=require('../src/config/db');
const medium=new Set([9201,9202,9203,9206,9207,9208,9209,9212,9214,9215,9216,9217,9218,9220,9221,9222,9230,9231,9232,9233,9234,9235,9238,9239,9240,9243,9244,9247,9248,9250,9251,9252,9254,9257,9258,9260,9261,9262,9266,9268,9274,9275,9287,9298]);
const hard=new Set([9211,9213]);
async function main(){
 const conn=await db.getConnection(),apply=process.argv.includes('--apply');
 try{
  await conn.beginTransaction();
  const [before]=await conn.query('SELECT * FROM recipes ORDER BY recipe_id FOR UPDATE');
  const changes=[];
  for(const r of before){const id=Number(r.recipe_id);if(r.difficulty?.trim()||id<9201||id>9300)continue;const difficulty=hard.has(id)?'Khó':medium.has(id)?'Vừa':'Dễ';changes.push({id,name:r.name,before:r.difficulty,after:difficulty});await conn.query('UPDATE recipes SET difficulty=? WHERE recipe_id=?',[difficulty,id]);}
  const [after]=await conn.query('SELECT * FROM recipes ORDER BY recipe_id');
  assert.deepEqual(after.map(r=>{const c=changes.find(c=>c.id===Number(r.recipe_id));return c?{...r,difficulty:c.before}:r;}),before,'Không được thay đổi trường khác');
  let backup=null;
  if(apply){if(changes.length){const dir=path.join(__dirname,'../backups');fs.mkdirSync(dir,{recursive:true});backup=path.join(dir,`recipe-difficulty-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(backup,JSON.stringify({basis:'Ước tính biên tập theo kỹ thuật món ăn',changes},null,2),{flag:'wx',mode:0o600});}await conn.commit();}else await conn.rollback();
  console.log(JSON.stringify({mode:apply?'APPLIED':'DRY_RUN',updated:changes.length,missing:after.filter(r=>!r.difficulty?.trim()).length,summary:after.reduce((out,r)=>{const key=r.difficulty||'Chưa có';out[key]=(out[key]||0)+1;return out;},{}),backup}));
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.end());
