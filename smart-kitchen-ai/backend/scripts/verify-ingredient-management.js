// Kiểm thử HTTP/MySQL; rollback dữ liệu và dọn đúng ảnh thử đã tải.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const path=require('node:path');
const express=require('express');
const db=require('../src/config/db');
const {createToken}=require('../src/services/sessionService');
async function main(){
 const conn=await db.getConnection(),originalQuery=db.query,originalGet=db.getConnection;let server,image;
 const tag='VERIFY-INGREDIENTS-'+crypto.randomUUID();
 try{
  await conn.beginTransaction();db.query=(...args)=>conn.query(...args);
  db.getConnection=async()=>({query:(...args)=>conn.query(...args),beginTransaction:()=>conn.query('SAVEPOINT ingredient_test'),commit:()=>conn.query('RELEASE SAVEPOINT ingredient_test'),rollback:()=>conn.query('ROLLBACK TO SAVEPOINT ingredient_test'),release(){}});
  const [users]=await conn.query('SELECT user_id,role,is_active FROM users');const admin=users.find(u=>u.role==='ADMIN'&&Number(u.is_active)===1),user=users.find(u=>u.role==='USER'&&Number(u.is_active)===1);assert(admin&&user,'Cần tài khoản admin và người dùng đang hoạt động.');
  const app=express();app.use(express.json());app.use('/api/admin',require('../src/routes/adminIngredientRoutes'));
  server=app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});const base='http://127.0.0.1:'+server.address().port;
  async function request(url,who=admin,method='GET',body){const form=body instanceof FormData;const res=await fetch(base+url,{method,headers:{...(form?{}:{'Content-Type':'application/json'}),...(who?{Authorization:'Bearer '+createToken(Number(who.user_id))}:{})},...(body?{body:form?body:JSON.stringify(body)}:{})});return {status:res.status,body:await res.json()};}
  assert.equal((await request('/api/admin/ingredients',null)).status,401);assert.equal((await request('/api/admin/ingredients',user)).status,403);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVMsAAAAASUVORK5CYII=','base64');
  const form=new FormData();form.append('image',new Blob([png],{type:'image/png'}),'test.png');const upload=await request('/api/admin/ingredients/image',admin,'POST',form);assert.equal(upload.status,200);image=upload.body.data.url;assert(/^\/uploads\/ingredients\/[a-f0-9-]+\.png$/.test(image));
  const payload={name:tag,category:'Rau củ',unit:'g',storage:'Ngăn mát',image};
  const first=await request('/api/admin/ingredients',admin,'POST',payload);assert.equal(first.status,201);const id=first.body.data.id;
  const [imageBefore]=await conn.query('SELECT * FROM ingredients WHERE ingredient_id=?',[id]);
  assert.equal((await request(`/api/admin/ingredients/${id}/image`,admin,'PATCH',{image:'',previousImage:image})).status,200);
  const [imageAfter]=await conn.query('SELECT * FROM ingredients WHERE ingredient_id=?',[id]);assert.deepEqual({...imageAfter[0],image_url:imageBefore[0].image_url},imageBefore[0]);
  assert.equal((await request(`/api/admin/ingredients/${id}/image`,admin,'PATCH',{image,previousImage:'',name:'Không được đổi tên'})).status,400);
  assert.equal((await request(`/api/admin/ingredients/${id}/image`,admin,'PATCH',{image,previousImage:image})).status,409);
  assert.equal((await request(`/api/admin/ingredients/${id}/image`,admin,'PATCH',{image,previousImage:''})).status,200);
  const [imageRestored]=await conn.query('SELECT * FROM ingredients WHERE ingredient_id=?',[id]);assert.deepEqual(imageRestored[0],imageBefore[0]);
  assert.equal((await request('/api/admin/ingredients',admin,'POST',payload)).status,409);
  const second=await request('/api/admin/ingredients',admin,'POST',{...payload,name:tag+'-used',image:''});assert.equal(second.status,201);const usedId=second.body.data.id;
  const list=await request('/api/admin/ingredients?'+new URLSearchParams({q:tag,category:'Rau củ',unit:'g'}));assert.equal(list.status,200);assert.equal(list.body.data.total,2);assert.equal(list.body.data.items.length,2);assert(list.body.data.stats.total>=2);
  assert.equal((await request(`/api/admin/ingredients/${id}`,admin,'PUT',{...payload,unit:'kg'})).status,200);
  const [recipes]=await conn.query('SELECT recipe_id FROM recipes LIMIT 1');assert(recipes.length);
  await conn.query("INSERT INTO recipe_ingredients(recipe_id,ingredient_id,quantity,unit,is_optional) VALUES(?,?,1,'g',0)",[recipes[0].recipe_id,usedId]);
  const usedList=await request('/api/admin/ingredients?q='+encodeURIComponent(tag+'-used'));assert.equal(usedList.body.data.items[0].usage.recipes,1);
  assert.equal((await request(`/api/admin/ingredients/${usedId}`,admin,'PUT',{...payload,name:tag+'-used',unit:'kg'})).status,200);
  const [links]=await conn.query('SELECT unit FROM recipe_ingredients WHERE ingredient_id=?',[usedId]);assert.equal(links[0].unit,'g');
  assert.equal((await request('/api/admin/ingredients/bulk',admin,'PATCH',{ids:[id,usedId],category:'Khác',storage:'Khô ráo'})).status,200);
  const blocked=await request('/api/admin/ingredients/bulk-delete',admin,'POST',{ids:[id,usedId]});assert.equal(blocked.status,409);
  const [still]=await conn.query('SELECT ingredient_id FROM ingredients WHERE ingredient_id IN (?,?)',[id,usedId]);assert.equal(still.length,2);
  assert.equal((await request(`/api/admin/ingredients/${id}`,admin,'DELETE')).status,200);
  assert.equal((await request(`/api/admin/ingredients/${usedId}`,admin,'DELETE')).status,409);
  console.log('PASS: permissions, image upload, create/duplicate, filters/statistics, edit, bulk update, reference protection, unchanged recipe units, delete unused.');
 }finally{
  db.query=originalQuery;db.getConnection=originalGet;if(server)await new Promise(resolve=>server.close(resolve));await conn.rollback();conn.release();
  if(image){const filename=path.basename(image);if(/^[a-f0-9-]+\.png$/.test(filename))await fs.unlink(path.join(__dirname,'../uploads/ingredients',filename));}
  console.log('Đã rollback dữ liệu và dọn ảnh thử.');
 }
 const [remaining]=await db.query('SELECT ingredient_id FROM ingredients WHERE name LIKE ?',[tag+'%']);assert.equal(remaining.length,0);
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(()=>db.end());
