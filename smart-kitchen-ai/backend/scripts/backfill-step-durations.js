// Thời gian ước tính biên tập từ thao tác/hướng dẫn hiện có, gồm chờ ngâm/ướp.
// Không sửa thời gian cấp món hay các bước đã có duration_minutes.
// Mỗi hàng 10 công thức, lần lượt 9201–9300; mỗi công thức có hai bước.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const db=require('../src/config/db');
const estimates=[
 [45,15],[25,25],[30,30],[20,10],[15,15],[25,10],[25,30],[20,45],[25,30],[20,10],
 [125,10],[40,15],[90,15],[25,20],[25,25],[25,25],[30,20],[45,20],[20,10],[35,15],
 [75,15],[20,30],[12,10],[15,15],[25,30],[35,10],[30,15],[125,40],[10,8],[25,25],
 [20,20],[15,25],[10,25],[25,10],[20,25],[10,20],[20,35],[35,50],[15,25],[35,35],
 [30,10],[20,15],[25,85],[25,85],[15,10],[15,10],[15,20],[15,90],[20,30],[25,10],
 [10,35],[35,35],[15,15],[20,45],[15,20],[20,35],[10,27],[10,25],[20,40],[10,15],
 [15,25],[10,15],[10,12],[10,10],[15,10],[15,15],[10,12],[10,15],[65,10],[15,20],
 [10,12],[10,12],[10,15],[20,15],[25,30],[15,10],[25,15],[10,20],[10,8],[10,10],
 [10,6],[10,12],[5,30],[10,15],[15,20],[10,10],[35,5],[25,5],[10,5],[15,15],
 [25,5],[10,10],[10,25],[15,20],[25,5],[10,15],[30,10],[25,10],[150,10],[7,3],
];
assert.equal(estimates.length,100);
async function main(){
 const conn=await db.getConnection(),apply=process.argv.includes('--apply');
 try{
  await conn.beginTransaction();
  const [before]=await conn.query('SELECT * FROM recipe_steps ORDER BY step_id FOR UPDATE');
  const [recipes]=await conn.query('SELECT recipe_id,name,prep_time,cook_time FROM recipes ORDER BY recipe_id');
  const changes=[];
  for(const row of before){
   if(row.duration_minutes!==null)continue;
   const recipeId=Number(row.recipe_id),step=Number(row.step_number);
   assert(recipeId>=9201&&recipeId<=9300&&[1,2].includes(step),`Cần phân loại riêng bước ${row.step_id}`);
   const duration=estimates[recipeId-9201][step-1];assert(Number.isInteger(duration)&&duration>0);
   changes.push({id:row.step_id,recipeId,step,instruction:row.instruction,before:null,after:duration});
   await conn.query('UPDATE recipe_steps SET duration_minutes=? WHERE step_id=? AND duration_minutes IS NULL',[duration,row.step_id]);
  }
  const [after]=await conn.query('SELECT * FROM recipe_steps ORDER BY step_id');
  assert.deepEqual(after.map(row=>{const c=changes.find(c=>c.id===row.step_id);return c?{...row,duration_minutes:c.before}:row;}),before,'Không được thay đổi dữ liệu khác');
  const [recipesAfter]=await conn.query('SELECT recipe_id,name,prep_time,cook_time FROM recipes ORDER BY recipe_id');assert.deepEqual(recipesAfter,recipes);
  const affected=new Set(changes.map(c=>c.recipeId));
  const discrepancies=recipes.filter(r=>affected.has(Number(r.recipe_id))).map(r=>({id:r.recipe_id,name:r.name,recipeMinutes:Number(r.prep_time||0)+Number(r.cook_time||0),stepMinutes:after.filter(s=>Number(s.recipe_id)===Number(r.recipe_id)).reduce((sum,s)=>sum+Number(s.duration_minutes||0),0)})).filter(r=>r.recipeMinutes!==r.stepMinutes);
  let backup=null,report=null;
  if(apply){
   if(changes.length){const stamp=new Date().toISOString().replace(/[:.]/g,'-');const dir=path.join(__dirname,'../backups');fs.mkdirSync(dir,{recursive:true});backup=path.join(dir,`step-durations-${stamp}.json`);fs.writeFileSync(backup,JSON.stringify({basis:'Ước tính thao tác và chờ theo hướng dẫn hiện tại',changes},null,2),{flag:'wx',mode:0o600});const reportDir=path.join(__dirname,'../reports');fs.mkdirSync(reportDir,{recursive:true});report=path.join(reportDir,`recipe-duration-differences-${stamp}.json`);fs.writeFileSync(report,JSON.stringify({note:'Chỉ báo cáo chênh lệch; chưa điều chỉnh tổng thời gian món. Các bước có thể gồm thời gian chờ hoặc thao tác song song.',items:discrepancies},null,2),{flag:'wx'});}
   await conn.commit();
  }else await conn.rollback();
  console.log(JSON.stringify({mode:apply?'APPLIED':'DRY_RUN',updated:changes.length,missing:after.filter(s=>s.duration_minutes===null).length,existingPreserved:true,discrepancies:discrepancies.length,backup,report}));
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.end());
