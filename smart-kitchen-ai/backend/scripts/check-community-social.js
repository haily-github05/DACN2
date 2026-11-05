// Kiểm tra: bình luận/theo dõi với MySQL thật; rollback toàn bộ dữ liệu thử.
const assert=require('node:assert/strict');
const db=require('../src/config/db');
const router=require('../src/routes/kitchenRoutes');
(async()=>{
 const conn=await db.getConnection();
 const original=db.query, originalConnection=db.getConnection;
 try{
  await conn.beginTransaction();
  db.query=conn.query.bind(conn);
  db.getConnection=async()=>({query:conn.query.bind(conn),beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}});
  const [users]=await conn.query('SELECT user_id FROM users ORDER BY user_id LIMIT 2');
  assert.equal(users.length,2,'Cần 2 tài khoản để kiểm tra');
  const [author,viewer]=users.map(u=>Number(u.user_id));
  const [insert]=await conn.query("INSERT INTO community_posts (user_id,title,description,category,visibility) VALUES (?,'TEST SOCIAL ROLLBACK','Test','Món ăn','PUBLIC')",[author]);
  const postId=String(insert.insertId);
  const call=async(path,method,userId,body={},extra={},query={})=>{
   const handler=router.stack.find(l=>l.route?.path===path&&l.route.methods[method]).route.stack[0].handle;
   let data,error;
   await handler({userId,params:{postId,...extra},query,body},{json:r=>{data=r;},status(){return this;}},e=>{error=e;});
   return {data,error};
  };
  const base='/:userId/posts/:postId';
  let r=await call(base+'/comments','post',viewer,{content:'Bình luận thử'});
  assert.ifError(r.error);const commentId=r.data.data.id;
  r=await call(base+'/comments','get',author);assert.ifError(r.error);assert.equal(r.data.data.items[0].content,'Bình luận thử');
  r=await call(base+'/comments/:commentId','delete',author,{}, {commentId});assert.equal(r.error.status,404);
  r=await call(base+'/comments','post',author,{content:'Trả lời thử',parentId:commentId});assert.ifError(r.error);
  assert.equal(r.data.data.parentId,commentId);
  r=await call(base+'/comments','get',viewer,{}, {}, {parentId:commentId});assert.ifError(r.error);assert.equal(r.data.data.items[0].content,'Trả lời thử');
  r=await call(base+'/follow','put',viewer,{active:true});assert.ifError(r.error);
  const [[follow]]=await conn.query('SELECT COUNT(*) AS n FROM user_follows WHERE follower_id=? AND followed_id=?',[viewer,author]);assert.equal(Number(follow.n),1);
  r=await call(base+'/follow','put',viewer,{active:false});assert.ifError(r.error);
  r=await call(base+'/comments/:commentId','delete',viewer,{}, {commentId});assert.ifError(r.error);
  await conn.query("UPDATE community_posts SET visibility='PRIVATE' WHERE post_id=?",[postId]);
  r=await call(base+'/comments','get',viewer);assert.equal(r.error.status,404);
  console.log('PASS MySQL: gửi/đọc/xoá bình luận, chặn xoá của người khác, theo dõi/bỏ theo dõi, chặn bài riêng tư. Rollback.');
 }finally{db.query=original;db.getConnection=originalConnection;await conn.rollback();conn.release();}
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.end());
