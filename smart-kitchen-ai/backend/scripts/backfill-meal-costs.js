// Chỉ điền chi phí NULL, giữ ngân sách/chi phí đã nhập. Tiền tính bằng DECIMAL MySQL.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const db=require('../src/config/db');
async function main(){
 const conn=await db.getConnection(),apply=process.argv.includes('--apply');
 try{
  await conn.beginTransaction();
  const [plansBefore]=await conn.query('SELECT * FROM meal_plans ORDER BY meal_plan_id FOR UPDATE');
  const [itemsBefore]=await conn.query('SELECT * FROM meal_plan_items ORDER BY plan_item_id FOR UPDATE');
  const [invalid]=await conn.query('SELECT m.plan_item_id FROM meal_plan_items m LEFT JOIN recipes r ON r.recipe_id=m.recipe_id WHERE m.planned_cost IS NULL AND (r.recipe_id IS NULL OR r.estimated_cost IS NULL OR r.estimated_cost<0 OR r.default_servings IS NULL OR r.default_servings<=0 OR m.servings IS NULL OR m.servings<=0)');
  assert.equal(invalid.length,0,'Có món thiếu giá/khẩu phần hợp lệ, cần kiểm tra trước khi tính');
  await conn.query('UPDATE meal_plan_items m JOIN recipes r ON r.recipe_id=m.recipe_id SET m.planned_cost=ROUND(r.estimated_cost*m.servings/r.default_servings,2) WHERE m.planned_cost IS NULL');
  await conn.query('UPDATE meal_plans p LEFT JOIN (SELECT meal_plan_id,SUM(planned_cost) AS total FROM meal_plan_items GROUP BY meal_plan_id) m ON m.meal_plan_id=p.meal_plan_id SET p.budget_total=COALESCE(m.total,0) WHERE p.budget_total IS NULL');
  const [itemsAfter]=await conn.query('SELECT * FROM meal_plan_items ORDER BY plan_item_id');
  const [plansAfter]=await conn.query('SELECT * FROM meal_plans ORDER BY meal_plan_id');
  const itemChanges=itemsBefore.filter(r=>r.planned_cost===null).map(r=>({id:r.plan_item_id,before:null,after:itemsAfter.find(a=>a.plan_item_id===r.plan_item_id).planned_cost}));
  const planChanges=plansBefore.filter(r=>r.budget_total===null).map(r=>({id:r.meal_plan_id,before:null,after:plansAfter.find(a=>a.meal_plan_id===r.meal_plan_id).budget_total}));
  assert.deepEqual(itemsAfter.map(r=>itemChanges.some(c=>c.id===r.plan_item_id)?{...r,planned_cost:null}:r),itemsBefore);
  // updated_at peut être géré automatiquement par MySQL.
  const comparable=rows=>rows.map(({updated_at,...r})=>r);
  assert.deepEqual(comparable(plansAfter.map(r=>planChanges.some(c=>c.id===r.meal_plan_id)?{...r,budget_total:null}:r)),comparable(plansBefore));
  assert(itemsAfter.every(r=>r.planned_cost!==null));assert(plansAfter.every(r=>r.budget_total!==null));
  let backup=null;
  if(apply){if(itemChanges.length||planChanges.length){const dir=path.join(__dirname,'../backups');fs.mkdirSync(dir,{recursive:true});backup=path.join(dir,`meal-costs-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(backup,JSON.stringify({formula:'ROUND(estimated_cost * servings / default_servings, 2); budget_total = SUM(planned_cost), empty plan = 0',items:itemChanges,plans:planChanges},null,2),{flag:'wx',mode:0o600});}await conn.commit();}else await conn.rollback();
  console.log(JSON.stringify({mode:apply?'APPLIED':'DRY_RUN',plannedCostUpdated:itemChanges.length,budgetTotalUpdated:planChanges.length,emptyPlansSetToZero:planChanges.filter(c=>Number(c.after)===0).length,plans:planChanges,existingValuesPreserved:true,backup}));
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.end());
