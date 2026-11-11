// Chuẩn hóa đơn vị mặc định theo định lượng công thức đã rà soát.
// Không đổi đơn vị/số lượng trong công thức, kho hoặc mua sắm. Mặc định rollback.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const db=require('../src/config/db');
const fixes=[
 {id:9003,name:'Cà rốt',before:'củ',after:'g'},
 {id:9005,name:'Cà chua',before:'quả',after:'g'},
 {id:9008,name:'Khoai tây',before:'củ',after:'g'},
 {id:9009,name:'Hành tây',before:'củ',after:'g'},
 {id:9010,name:'Tỏi',before:'củ',after:'g'},
 {id:9013,name:'Dưa leo',before:'củ',after:'g'},
 {id:9018,name:'Bí đỏ',before:'củ',after:'g'},
 {id:9135,name:'Hành tím',before:'củ',after:'g'},
 {id:9149,name:'Đu đủ xanh',before:'quả',after:'g'},
];
const references=[['recipe_ingredients','recipe_ingredient_id'],['pantry_items','pantry_item_id'],['shopping_list_items','shopping_item_id']];
async function main(){
 const apply=process.argv.includes('--apply'),conn=await db.getConnection();
 try{
  await conn.beginTransaction();
  const [before]=await conn.query('SELECT * FROM ingredients ORDER BY ingredient_id FOR UPDATE');
  const snapshots=[];for(const [table,key] of references){const [rows]=await conn.query(`SELECT * FROM ${table} ORDER BY ${key}`);snapshots.push(rows);}
  const changes=[];
  for(const fix of fixes){
   const row=before.find(item=>Number(item.ingredient_id)===fix.id);assert(row,`Không tìm thấy ${fix.name}`);assert.equal(row.name,fix.name,`Tên nguyên liệu đã thay đổi: ${fix.id}`);
   if(row.default_unit===fix.after)continue;
   assert.equal(row.default_unit,fix.before,`Đơn vị đã thay đổi ngoài kế hoạch: ${fix.name}`);
   const [units]=await conn.query('SELECT DISTINCT unit FROM recipe_ingredients WHERE ingredient_id=?',[fix.id]);
   assert(units.length===1&&units[0].unit===fix.after,`Cần rà soát lại đơn vị công thức của ${fix.name}`);
   await conn.query('UPDATE ingredients SET default_unit=? WHERE ingredient_id=? AND default_unit=?',[fix.after,fix.id,fix.before]);changes.push(fix);
  }
  const [after]=await conn.query('SELECT * FROM ingredients ORDER BY ingredient_id');
  assert.deepEqual(after.map(row=>{const fix=changes.find(item=>item.id===Number(row.ingredient_id));return fix?{...row,default_unit:fix.before}:row;}),before,'Có trường dữ liệu thay đổi ngoài đơn vị mặc định');
  for(const [index,[table,key]]of references.entries()){const [rows]=await conn.query(`SELECT * FROM ${table} ORDER BY ${key}`);assert.deepEqual(rows,snapshots[index],`${table} không được thay đổi`);}
  const [summary]=await conn.query('SELECT default_unit AS unit,COUNT(*) AS count FROM ingredients GROUP BY default_unit ORDER BY count DESC,default_unit');
  let backup=null;
  if(apply){
   if(changes.length){const dir=path.join(__dirname,'../backups');fs.mkdirSync(dir,{recursive:true});backup=path.join(dir,`ingredient-units-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(backup,JSON.stringify({createdAt:new Date().toISOString(),changes},null,2),{flag:'wx',mode:0o600});}
   await conn.commit();
  }else await conn.rollback();
  console.log(JSON.stringify({mode:apply?'APPLIED':'DRY_RUN_ROLLED_BACK',updated:changes.length,changes,summary,referenceTablesUnchanged:true,backup},null,2));
 }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.end());
