// Phân loại biên tập theo phong cách vùng miền, không khẳng định nguồn gốc độc quyền.
// Tham khảo https://vietnam.travel/things-to-do/vietnam-foodie-guide-region/
// và https://vietnam.travel/things-to-do/must-try-noodles-vietnam/
// Chỉ điền các món mẫu 9201–9300 còn trống; mặc định rollback, --apply để lưu.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const db=require('../src/config/db');
const groups={
 'Miền Bắc':['Phở bò tái','Phở gà','Bún riêu cua','Bún chả Hà Nội','Miến gà','Bánh cuốn nhân thịt','Nem rán','Thịt heo rang cháy cạnh','Bò sốt vang','Canh mồng tơi nấu cua'],
 'Miền Trung':['Bún bò Huế','Mì Quảng gà','Thịt heo luộc cuốn bánh tráng'],
 'Miền Nam':['Cơm gà xối mỡ','Cơm tấm sườn nướng','Cơm cá kho tộ','Cơm thịt kho trứng','Bún thịt nướng','Bún măng vịt','Hủ tiếu Nam Vang','Bánh xèo tôm thịt','Bánh khọt tôm','Gỏi cuốn tôm thịt','Thịt kho tàu','Bò kho cà rốt','Bò cuốn lá lốt','Cá basa kho tiêu','Canh chua cá','Canh khổ qua nhồi thịt','Canh khoai mỡ','Cà tím nướng mỡ hành','Gỏi gà bắp cải','Gỏi xoài tôm khô','Súp cua'],
 'Quốc tế':['Cơm gà Hải Nam','Cơm chiên dương châu','Cá hồi sốt chanh dây','Cá hồi nướng rau củ','Salad cá ngừ','Salad ức gà','Salad khoai tây trứng','Khoai tây nghiền'],
};
const regions=new Map();for(const [region,names]of Object.entries(groups))for(const name of names){assert(!regions.has(name));regions.set(name,region);}
async function main(){
 const conn=await db.getConnection(),apply=process.argv.includes('--apply');
 try{
  await conn.beginTransaction();
  const [before]=await conn.query('SELECT * FROM recipes ORDER BY recipe_id FOR UPDATE');
  const changes=[];
  for(const r of before){const id=Number(r.recipe_id);if(r.region?.trim()||id<9201||id>9300)continue;const region=regions.get(r.name)||'Toàn quốc';changes.push({id,name:r.name,before:r.region,after:region});await conn.query('UPDATE recipes SET region=? WHERE recipe_id=?',[region,id]);}
  const [after]=await conn.query('SELECT * FROM recipes ORDER BY recipe_id');
  assert.deepEqual(after.map(r=>{const c=changes.find(c=>c.id===Number(r.recipe_id));return c?{...r,region:c.before}:r;}),before,'Không được thay đổi trường khác');
  let backup=null;
  if(apply){if(changes.length){const dir=path.join(__dirname,'../backups');fs.mkdirSync(dir,{recursive:true});backup=path.join(dir,`recipe-region-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(backup,JSON.stringify({basis:'Phân loại biên tập: món đặc trưng theo vùng; món phổ biến nhiều miền là Toàn quốc; món nước ngoài là Quốc tế',changes},null,2),{flag:'wx',mode:0o600});}await conn.commit();}else await conn.rollback();
  console.log(JSON.stringify({mode:apply?'APPLIED':'DRY_RUN',updated:changes.length,missing:after.filter(r=>!r.region?.trim()).length,summary:after.reduce((out,r)=>{const key=r.region||'Chưa có';out[key]=(out[key]||0)+1;return out;},{}),backup}));
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.end());
