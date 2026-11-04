// Kiểm tra đầy đủ upload -> lưu -> đọc ảnh nguyên liệu; dọn dữ liệu thử sau khi chạy.
const assert=require("node:assert/strict");
const express=require("express");
const fs=require("node:fs/promises");
const path=require("node:path");
const {randomUUID}=require("node:crypto");
const db=require("../src/config/db");
const {createToken}=require("../src/services/sessionService");
const app=express();app.use(express.json());
app.use("/api/kitchen",require("../src/routes/ingredientImageRoutes"));
app.use("/api/kitchen",require("../src/routes/kitchenRoutes"));
let server,userId,image,ingredientId;
const name="TEST-MANUAL-"+randomUUID();
(async()=>{
 const [users]=await db.query("SELECT user_id FROM users ORDER BY user_id LIMIT 1");
 assert.ok(users.length);userId=users[0].user_id;
 server=await new Promise(resolve=>{const instance=app.listen(0,"127.0.0.1",()=>resolve(instance));});
 const base=`http://127.0.0.1:${server.address().port}/api/kitchen/${userId}`;
 const headers={Authorization:`Bearer ${createToken(userId)}`};
 const bytes=await fs.readFile(path.join(__dirname,"../uploads/ingredients/khoai-tay.jpg"));
 const form=new FormData();form.append("image",new Blob([bytes],{type:"image/jpeg"}),"test.jpg");
 const upload=await fetch(base+"/pantry/image",{method:"POST",headers,body:form});
 const uploaded=await upload.json();assert.equal(upload.status,200,uploaded.message);image=uploaded.data.url;
 const today=new Date().toISOString().slice(0,10);
 const saved=await fetch(base+"/pantry",{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({name,category:"Khác",quantity:1.5,unit:"g",location:"Ngăn mát",purchaseDate:today,expiryDate:today,note:"Kiểm tra luồng lưu",image})});
 const result=await saved.json();assert.equal(saved.status,200,result.message);
 const [rows]=await db.query("SELECT p.ingredient_id,p.quantity,p.image_url,i.name FROM pantry_items p JOIN ingredients i ON i.ingredient_id=p.ingredient_id WHERE p.pantry_item_id=? AND p.user_id=?",[result.data.id,userId]);
 assert.equal(rows.length,1);ingredientId=rows[0].ingredient_id;
 assert.equal(rows[0].name,name);assert.equal(rows[0].image_url,image);assert.equal(Number(rows[0].quantity),1.5);
 console.log("PASS: upload image, save manual ingredient, read persisted image and quantity");
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{
 try {
  if(userId) {
   const [rows]=await db.query("SELECT ingredient_id FROM ingredients WHERE name=?",[name]);
   ingredientId ||= rows[0]?.ingredient_id;
   if(ingredientId) {
    await db.query("DELETE FROM pantry_items WHERE ingredient_id=? AND user_id=?",[ingredientId,userId]);
    await db.query("DELETE FROM ingredients WHERE ingredient_id=? AND name=?",[ingredientId,name]);
   }
  }
  if(image) await fs.unlink(path.join(__dirname,"../uploads/pantry",path.basename(image)));
  console.log("Test records and uploaded file cleaned up");
 } finally {if(server) await new Promise(resolve=>server.close(resolve));await db.end();}
});
