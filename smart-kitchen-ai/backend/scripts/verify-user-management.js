// Tạo tài khoản thử và kiểm tra quyền/trạng thái qua HTTP; rollback toàn bộ dữ liệu.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const express=require('express');
const db=require('../src/config/db');
const {createToken}=require('../src/services/sessionService');
async function main(){
 const conn=await db.getConnection();const originalQuery=db.query,originalGet=db.getConnection;let server;
 const tag='VERIFY-USERS-'+crypto.randomUUID();
 try{
  await conn.beginTransaction();db.query=(...args)=>conn.query(...args);
  // Các transaction của endpoint dùng savepoint, không commit transaction thử bên ngoài.
  db.getConnection=async()=>({query:(...args)=>conn.query(...args),beginTransaction:()=>conn.query('SAVEPOINT user_management_test'),commit:()=>conn.query('RELEASE SAVEPOINT user_management_test'),rollback:()=>conn.query('ROLLBACK TO SAVEPOINT user_management_test'),release(){}});
  const [admins]=await conn.query("SELECT user_id FROM users WHERE role='ADMIN' AND is_active=1 ORDER BY user_id LIMIT 1");assert(admins.length,'Cần tài khoản admin hoạt động.');
  const adminId=Number(admins[0].user_id),adminToken=createToken(adminId);
  let phone;for(let i=0;i<10;i++){phone='09'+String(crypto.randomInt(0,100000000)).padStart(8,'0');const [rows]=await conn.query('SELECT user_id FROM users WHERE phone=?',[phone]);if(!rows.length)break;phone=null;}assert(phone);
  const password='Test-'+crypto.randomUUID();
  const app=express();app.use(express.json());app.use(require('../src/services/accountStatusService').checkAccountStatus);app.use('/api/auth',require('../src/routes/authRoutes'));app.use('/api/admin',require('../src/routes/adminUserRoutes'));app.use('/api/kitchen',require('../src/routes/kitchenRoutes'));app.use((err,req,res,next)=>res.status(err.status||500).json({success:false,message:err.message}));
  server=app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});const base='http://127.0.0.1:'+server.address().port;
  async function request(path,token,method='GET',body){const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};}
  assert.equal((await request('/api/admin/users')).status,401);
  const created=await request('/api/admin/users',adminToken,'POST',{name:tag,phone,password,role:'USER'});assert.equal(created.status,201);const id=created.body.data.id;
  const list=await request('/api/admin/users?q='+encodeURIComponent(tag),adminToken);assert.equal(list.status,200);assert.equal(list.body.data.total,1);assert(!('password_hash'in list.body.data.items[0]));
  const detail=await request('/api/admin/users/'+id,adminToken);assert.equal(detail.status,200);assert.equal(detail.body.data.stats.posts,0);
  const login=await request('/api/auth/login',null,'POST',{phone,password});assert.equal(login.status,200);const token=login.body.data.token;
  assert.equal((await request('/api/admin/users',token)).status,403);
  assert.equal((await request('/api/admin/users/'+id,adminToken,'PATCH',{role:'MODERATOR'})).status,200);
  assert.equal((await request('/api/admin/users',token)).status,403);
  assert.equal((await request('/api/admin/users/'+id,adminToken,'PATCH',{role:'ADMIN'})).status,200);
  assert.equal((await request('/api/admin/users',token)).status,200);
  assert.equal((await request('/api/admin/users/'+id,adminToken,'PATCH',{role:'USER'})).status,200);
  assert.equal((await request('/api/admin/users',token)).status,403);
  assert.equal((await request('/api/admin/users/'+adminId,adminToken,'PATCH',{active:false})).status,400);
  assert.equal((await request('/api/admin/users/'+adminId,adminToken,'PATCH',{role:'USER'})).status,400);
  assert.equal((await request('/api/admin/users/'+id,adminToken,'PATCH',{active:false,reason:'Tài khoản thử'})).status,200);
  assert.equal((await request('/api/auth/login',null,'POST',{phone,password})).status,403);
  assert.equal((await request(`/api/kitchen/${id}/activity`,token)).status,403);
  assert.equal((await request(`/api/profile/00${id}`)).status,403);
  assert.equal((await request('/api/admin/users/'+id,adminToken,'PATCH',{active:true})).status,200);
  assert.equal((await request('/api/auth/login',null,'POST',{phone,password})).status,200);
  const unlocked=await request('/api/admin/users/'+id,adminToken);assert.equal(unlocked.body.data.active,true);assert(unlocked.body.data.lastLoginAt);assert.equal(unlocked.body.data.lockedReason,'');
  console.log('PASS: user list/details/create, role changes with same token, lock/unlock, blocked login/old sessions/legacy URL, self-protection.');
 }finally{db.query=originalQuery;db.getConnection=originalGet;if(server)await new Promise(resolve=>server.close(resolve));await conn.rollback();conn.release();console.log('Đã rollback tài khoản và dữ liệu thử.');}
 const [remaining]=await db.query('SELECT user_id FROM users WHERE full_name=?',[tag]);assert.equal(remaining.length,0);
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(()=>db.end());
