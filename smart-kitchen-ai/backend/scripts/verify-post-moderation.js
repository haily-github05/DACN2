// Kiểm tra HTTP và MySQL thật; toàn bộ dữ liệu thử được rollback.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const express=require('express');
const db=require('../src/config/db');
const {createToken}=require('../src/services/sessionService');
async function main(){
 const conn=await db.getConnection();const originalQuery=db.query;let server;
 const tag=`VERIFY-${crypto.randomUUID()}`;
 try{
  await conn.beginTransaction();db.query=(...args)=>conn.query(...args);
  const [users]=await conn.query('SELECT user_id,role FROM users');
  const admin=users.find(u=>u.role==='ADMIN'),author=users.find(u=>u.role==='USER');assert(admin&&author,'Cần tài khoản ADMIN và USER để kiểm tra.');
  const app=express();app.use(express.json());app.use('/api/admin',require('../src/routes/adminPostRoutes'));app.use('/api/kitchen',require('../src/routes/kitchenRoutes'));app.use((err,req,res,next)=>res.status(err.status||500).json({success:false,message:err.message}));
  server=app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  const base=`http://127.0.0.1:${server.address().port}`;
  async function request(path,user,method='GET',body){const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:`Bearer ${createToken(Number(user.user_id))}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,body:await res.json()};}
  const authorPath=`/api/kitchen/${author.user_id}/posts`;
  const catalog=await request('/api/kitchen/post-categories');assert.equal(catalog.status,200);assert(catalog.body.data.postCategories.length>=14);assert(catalog.body.data.postCategories.includes('Món chay'));
  const baseline=await request('/api/admin/notifications',admin);assert.equal(baseline.status,200);
  const guest=await request('/api/admin/notifications');assert.equal(guest.status,401);
  const forbidden=await request('/api/admin/posts',author);assert.equal(forbidden.status,403);
  const created=await request(authorPath,author,'POST',{title:tag,description:'Nội dung kiểm tra',category:'Món ăn',visibility:'PUBLIC',moderationStatus:'APPROVED'});assert.equal(created.body.data.moderationStatus,'PENDING');const id=created.body.data.id;
  const queue=await request('/api/admin/posts?'+new URLSearchParams({status:'PENDING',page:'1',pageSize:'10',q:tag,category:'Món ăn'}),admin);
  assert.equal(queue.status,200);assert.equal(queue.body.data.total,1);assert.equal(queue.body.data.items[0].id,id);assert.equal(queue.body.data.stats.pending,baseline.body.data.pending+1);assert(queue.body.data.categories.includes('Món ăn'));
  assert.equal((await request(`/api/kitchen/public-posts?id=${id}`)).body.data.length,0);
  assert.equal((await request(`${authorPath}?id=${id}`,author)).body.data[0].moderationStatus,'PENDING');
  assert(!(await request(authorPath,author)).body.data.some(post=>post.id===id));
  const notice=await request('/api/admin/notifications',admin);assert.equal(notice.body.data.unread,baseline.body.data.unread+1);assert(notice.body.data.items.some(item=>item.id===id&&!item.read));
  await request(`/api/admin/notifications/${id}/read`,admin,'PUT');assert.equal((await request('/api/admin/notifications',admin)).body.data.unread,baseline.body.data.unread);
  assert.equal((await request(`/api/admin/posts/${id}/moderation`,admin,'PATCH',{status:'APPROVED'})).status,200);
  assert.equal((await request(`/api/kitchen/public-posts?id=${id}`)).body.data.length,1);
  assert.equal((await request(`/api/admin/posts/${id}/moderation`,admin,'PATCH',{status:'REJECTED',reason:'Xử lý lần hai'})).status,409);
  const approvedNotice=await request(`/api/kitchen/${author.user_id}/notifications`,author);assert.equal(approvedNotice.status,200);assert(approvedNotice.body.data.some(item=>item.id.startsWith(`moderation:${id}:APPROVED:`)));
  assert.equal((await request(`/api/admin/posts/${id}/visibility`,admin,'PATCH',{hidden:true})).status,200);
  assert.equal((await request(`/api/kitchen/public-posts?id=${id}`)).body.data.length,0);
  assert.equal((await request(`${authorPath}?id=${id}`,author)).body.data[0].moderationStatus,'HIDDEN');
  assert.equal((await request(`/api/admin/posts/${id}/visibility`,admin,'PATCH',{hidden:false})).status,200);
  assert.equal((await request(`/api/kitchen/public-posts?id=${id}`)).body.data.length,1);
  await conn.query('UPDATE community_posts SET created_at=DATE_SUB(NOW(),INTERVAL 15 DAY) WHERE post_id=?',[id]);
  const recent=await request('/api/admin/posts?'+new URLSearchParams({status:'ALL',days:'7',q:tag}),admin);assert.equal(recent.body.data.total,0);
  const month=await request('/api/admin/posts?'+new URLSearchParams({status:'ALL',days:'30',q:tag}),admin);assert.equal(month.body.data.total,1);
  await conn.query('UPDATE community_posts SET created_at=NOW() WHERE post_id=?',[id]);
  await conn.query('INSERT INTO community_comments(post_id,user_id,content) VALUES(?,?,?)',[id,author.user_id,'Bình luận kiểm tra cascade']);
  await conn.query('INSERT INTO community_reactions(user_id,post_id,kind) VALUES(?,?,?)',[author.user_id,id,'like']);
  assert.equal((await request(`/api/admin/posts/${id}`,author,'DELETE')).status,403);
  assert.equal((await request(`/api/admin/posts/${id}`,admin,'DELETE')).status,200);
  assert.equal((await request(`/api/admin/posts/${id}`,admin,'DELETE')).status,404);
  for(const table of ['community_comments','community_reactions','admin_post_reads']){const [remaining]=await conn.query(`SELECT COUNT(*) AS count FROM ${table} WHERE post_id=?`,[id]);assert.equal(Number(remaining[0].count),0);}
  const second=await request(authorPath,author,'POST',{title:tag+'-reject',description:'Bài thử từ chối',category:'Món ăn'});const rejectedId=second.body.data.id;
  assert.equal((await request(`/api/admin/posts/${rejectedId}/moderation`,admin,'PATCH',{status:'REJECTED',reason:'Lý do kiểm tra'})).status,200);
  assert.equal((await request(`/api/kitchen/public-posts?id=${rejectedId}`)).body.data.length,0);
  assert.equal((await request(`${authorPath}?id=${rejectedId}`,author)).body.data[0].rejectionReason,'Lý do kiểm tra');
  assert(!(await request(authorPath,author)).body.data.some(post=>post.id===rejectedId));
  const rejectionNotice=await request(`/api/kitchen/${author.user_id}/notifications`,author);assert.equal(rejectionNotice.status,200);const rejectedNotification=rejectionNotice.body.data.find(item=>item.id.startsWith(`moderation:${rejectedId}:REJECTED:`));assert(rejectedNotification);assert(rejectedNotification.body.includes('Lý do kiểm tra'));assert.equal(rejectedNotification.params.id,rejectedId);
  const adminNotices=await request(`/api/kitchen/${admin.user_id}/notifications`,admin);assert(!adminNotices.body.data.some(item=>item.id.startsWith(`moderation:${rejectedId}:`)));
  const privatePost=await request(authorPath,author,'POST',{title:tag+'-private',description:'Bài cá nhân',category:'Món ăn',visibility:'PRIVATE'});const privateId=privatePost.body.data.id;
  assert.equal((await request(`/api/admin/posts/${privateId}`,admin)).status,404);
  assert.equal((await request('/api/admin/notifications',admin)).body.data.pending,baseline.body.data.pending);
  assert.equal((await request(`/api/admin/posts/${privateId}`,admin,'DELETE')).status,404);
  console.log('PASS: category catalogue, approved-only feed (including owner), author approval/rejection notices, permissions, hide/restore, date ranges, deletion cascade, private isolation.');
 }finally{db.query=originalQuery;if(server)await new Promise(resolve=>server.close(resolve));await conn.rollback();conn.release();console.log('Đã rollback dữ liệu thử.');}
 const [remaining]=await db.query('SELECT post_id FROM community_posts WHERE title LIKE ?',[tag+'%']);assert.equal(remaining.length,0);
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(()=>db.end());
