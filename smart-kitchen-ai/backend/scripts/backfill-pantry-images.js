// Bổ sung ảnh từ đúng ingredient_id; giữ ảnh riêng và các trường khác.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const db=require('../src/config/db');
async function main(){
 const apply=process.argv.includes('--apply'),conn=await db.getConnection();
 try{
  await conn.beginTransaction();
  const [before]=await conn.query('SELECT * FROM pantry_items ORDER BY pantry_item_id FOR UPDATE');
  const [ingredients]=await conn.query('SELECT ingredient_id,image_url FROM ingredients');
  const images=new Map(ingredients.map(row=>[String(row.ingredient_id),row.image_url]));
  const changes=[];
  for(const row of before){
   if(row.image_url?.trim())continue;
   const image=images.get(String(row.ingredient_id));if(!image?.trim())continue;
   if(image.startsWith('/uploads/'))assert(fs.statSync(path.join(__dirname,'..',image)).isFile(),`Ảnh không tồn tại: ${image}`);
   changes.push({id:row.pantry_item_id,ingredientId:row.ingredient_id,before:row.image_url,after:image});
   await conn.query('UPDATE pantry_items SET image_url=? WHERE pantry_item_id=?',[image,row.pantry_item_id]);
  }
  const [after]=await conn.query('SELECT * FROM pantry_items ORDER BY pantry_item_id');
  // updated_at có thể do MySQL tự cập nhật khi thay ảnh.
  const comparable=rows=>rows.map(({updated_at,...row})=>row);
  assert.deepEqual(comparable(after.map(row=>{const change=changes.find(c=>c.id===row.pantry_item_id);return change?{...row,image_url:change.before}:row;})),comparable(before));
  let backup=null;
  if(apply){
   if(changes.length){const dir=path.join(__dirname,'../backups');fs.mkdirSync(dir,{recursive:true});backup=path.join(dir,`pantry-images-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(backup,JSON.stringify({changes},null,2),{flag:'wx',mode:0o600});}
   await conn.commit();
  }else await conn.rollback();
  console.log(JSON.stringify({mode:apply?'APPLIED':'DRY_RUN',updated:changes.length,total:after.length,missing:after.filter(row=>!row.image_url?.trim()).length,backup}));
 }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.end());
