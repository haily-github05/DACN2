// Chỉ bổ sung gợi ý chung còn thiếu; không thay pantry_items.storage_location.
// Mặc định chạy thử và rollback. --apply ghi dữ liệu sau khi sao lưu.
// Tham khảo: https://www.foodsafety.gov/food-safety-charts
// https://www.fda.gov/consumers/consumer-updates/are-you-storing-food-safely
// Nhãn sản phẩm được ưu tiên; nhóm dưới giả định rau/nấm tươi, bột/đậu khô.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const db=require('../src/config/db');
const groups={
 'Ngăn đông':['Thịt gà','Sườn heo','Tôm','Mực','Cá basa','Xương bò','Xương heo','Cua đồng','Cá rô phi','Thịt vịt','Cá thu','Cá diêu hồng','Cá nục','Nghêu','Thịt cua'],
 'Ngăn mát':['Cải xanh','Hành lá','Gừng','Cơm chín','Lạp xưởng','Đậu Hà Lan','Ớt chuông','Nước dừa','Bánh phở','Rau mùi','Bún tươi','Sả','Ớt','Đu đủ xanh','Thì là','Măng tươi','Nấm hương','Hủ tiếu','Giá đỗ','Mì Quảng','Nghệ','Cần tây','Lá lốt','Hạt sen','Chanh dây','Đậu bắp','Rau ngổ','Rau ngót','Bí xanh','Mồng tơi','Khổ qua','Nấm kim châm','Rau muống','Đậu que','Cà tím','Bắp cải','Rau răm','Xoài xanh','Tôm khô','Sốt mayonnaise','Bơ sữa','Ngô non','Ngô ngọt','Sữa chua','Xoài chín','Dâu tây'],
 'Khô ráo':['Nước mắm','Dầu ăn','Đường','Muối','Nước tương','Tiêu','Hành tím','Mật ong','Quế','Hoa hồi','Mắm ruốc','Giấm','Đậu phộng','Miến dong','Mì trứng','Đậu xanh','Bột gạo','Bột năng','Mộc nhĩ','Nước cốt dừa','Bánh tráng','Rượu vang đỏ','Me','Bột mì','Rong biển khô','Khoai mỡ','Cá ngừ đóng hộp','Dầu mè','Dầu ô liu','Đường phèn'],
 'Nhiệt độ phòng':['Bánh mì','Dứa','Chuối'],
};
async function main(){
 const apply=process.argv.includes('--apply'),conn=await db.getConnection();
 try{
  await conn.beginTransaction();
  const [before]=await conn.query('SELECT * FROM ingredients ORDER BY ingredient_id FOR UPDATE');
  const [pantry]=await conn.query('SELECT * FROM pantry_items ORDER BY pantry_item_id');
  const names=new Map();for(const [storage,list]of Object.entries(groups))for(const name of list){assert(!names.has(name),`Trùng tên: ${name}`);names.set(name,storage);}
  const changes=[];
  for(const row of before){
   if(row.storage_type?.trim())continue;
   const storage=names.get(row.name);assert(storage,`Chưa phân loại: ${row.name}`);
   changes.push({id:row.ingredient_id,name:row.name,before:row.storage_type,after:storage});
   await conn.query('UPDATE ingredients SET storage_type=? WHERE ingredient_id=?',[storage,row.ingredient_id]);
  }
  const [after]=await conn.query('SELECT * FROM ingredients ORDER BY ingredient_id');
  assert.deepEqual(after.map(row=>{const change=changes.find(c=>c.id===row.ingredient_id);return change?{...row,storage_type:change.before}:row;}),before);
  const [pantryAfter]=await conn.query('SELECT * FROM pantry_items ORDER BY pantry_item_id');assert.deepEqual(pantryAfter,pantry,'Không được thay đổi kho người dùng');
  let backup=null;
  if(apply){
   if(changes.length){const dir=path.join(__dirname,'../backups');fs.mkdirSync(dir,{recursive:true});backup=path.join(dir,`ingredient-storage-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(backup,JSON.stringify({changes},null,2),{flag:'wx',mode:0o600});}
   await conn.commit();
  }else await conn.rollback();
  console.log(JSON.stringify({mode:apply?'APPLIED':'DRY_RUN',updated:changes.length,pantryUnchanged:true,backup,changes},null,2));
 }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.end());
