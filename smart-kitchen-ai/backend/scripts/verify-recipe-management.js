// Kiểm tra HTTP/MySQL; tất cả dữ liệu thử được rollback.
const assert=require('node:assert/strict');
const express=require('express');
const {randomUUID}=require('node:crypto');
const db=require('../src/config/db');
const {createToken}=require('../src/services/sessionService');
async function main(){
 const conn=await db.getConnection(),originalQuery=db.query,originalGet=db.getConnection;let server;
 try{
  await conn.beginTransaction();db.query=(...args)=>conn.query(...args);
  db.getConnection=async()=>({query:(...args)=>conn.query(...args),beginTransaction:()=>conn.query('SAVEPOINT recipe_test'),commit:()=>conn.query('RELEASE SAVEPOINT recipe_test'),rollback:()=>conn.query('ROLLBACK TO SAVEPOINT recipe_test'),release(){}});
  const [users]=await conn.query('SELECT user_id,role,is_active FROM users');const admin=users.find(u=>u.role==='ADMIN'&&Number(u.is_active)===1),user=users.find(u=>u.role==='USER'&&Number(u.is_active)===1);assert(admin&&user);
  const app=express();app.use(express.json());app.use('/api/admin',require('../src/routes/adminRecipeRoutes'));
  server=app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  const base='http://127.0.0.1:'+server.address().port;
  async function request(path,method='GET',body,who=admin){const res=await fetch(base+'/api/admin'+path,{method,headers:{'Content-Type':'application/json',...(who?{Authorization:'Bearer '+createToken(Number(who.user_id))}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,body:await res.json()};}
  assert.equal((await request('/recipes','GET',null,null)).status,401);assert.equal((await request('/recipes','GET',null,user)).status,403);
  assert.equal((await request('/recipes?page=bad')).status,400);
  const list=await request('/recipes');assert.equal(list.status,200);assert(list.body.data.stats.total>0);
  const [ingredients]=await conn.query('SELECT ingredient_id,name FROM ingredients LIMIT 1');const ingredient=ingredients[0];
  const payload={name:'VERIFY-RECIPE-'+randomUUID(),description:'Món kiểm tra',image:'',region:'Miền Trung',category:'Thử nghiệm',difficulty:'Dễ',prepTime:3,cookTime:5,servings:2,calories:200,active:true,ingredients:[{id:String(ingredient.ingredient_id),quantity:100,unit:'g',optional:true,note:'Ghi chú giữ nguyên'}],steps:[{instruction:'Sơ chế và nấu',duration:5,image:'/uploads/ingredients/test.jpg'}]};
  assert.equal((await request('/recipes','POST',{...payload,ingredients:[]})).status,400);
  const created=await request('/recipes','POST',payload);assert.equal(created.status,201);const id=created.body.data.id;
  const detail=await request('/recipes/'+id);assert.equal(detail.status,200);assert.equal(detail.body.data.ingredients[0].quantity,100);assert.equal(detail.body.data.steps[0].duration,5);
  const filters=new URLSearchParams({q:payload.name,category:payload.category,difficulty:'Dễ',status:'active',quick:'1',calories:'low'});
  const filtered=await request('/recipes?'+filters);assert.equal(filtered.status,200);assert.equal(filtered.body.data.total,1);
  assert.equal((await request('/recipes?q='+encodeURIComponent(ingredient.name))).status,200);
  assert.equal((await request('/recipes/'+id,'PUT',{...detail.body.data,name:payload.name+' sửa'})).status,200);
  const edited=await request('/recipes/'+id);assert.equal(edited.body.data.ingredients[0].optional,true);assert.equal(edited.body.data.ingredients[0].note,payload.ingredients[0].note);assert.equal(edited.body.data.steps[0].image,payload.steps[0].image);
  const copy=await request('/recipes/'+id+'/copy','POST');assert.equal(copy.status,201);const copyDetail=await request('/recipes/'+copy.body.data.id);assert.equal(copyDetail.body.data.active,false);assert.deepEqual(copyDetail.body.data.ingredients,edited.body.data.ingredients);assert.deepEqual(copyDetail.body.data.steps,edited.body.data.steps);
  await conn.query('INSERT INTO recipe_favorites(user_id,recipe_id) VALUES(?,?)',[user.user_id,id]);assert.equal((await request('/recipes/'+id,'DELETE')).status,409);
  assert.equal((await request('/recipes/'+id+'/status','PATCH',{active:false})).status,200);
  assert.equal((await request('/recipes/'+copy.body.data.id,'DELETE')).status,200);assert.equal((await request('/recipes/'+copy.body.data.id)).status,404);
  console.log('PASS: quyền admin, bộ lọc, tạo/sửa, giữ ghi chú/ảnh bước, sao chép đầy đủ, chặn xóa công thức đã lưu, ngừng hoạt động và xóa công thức chưa dùng.');
 }finally{db.query=originalQuery;db.getConnection=originalGet;if(server)await new Promise(resolve=>server.close(resolve));await conn.rollback();conn.release();console.log('Đã rollback toàn bộ dữ liệu thử.');}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(()=>db.end());
