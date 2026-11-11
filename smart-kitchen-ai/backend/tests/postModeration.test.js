const test=require('node:test');
const assert=require('node:assert/strict');
const dbPath=require.resolve('../src/config/db');
let queryImpl;
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:(...args)=>queryImpl(...args)}};
const router=require('../src/routes/adminPostRoutes');
async function request(method,path,body,params={},query={}){
 let status=200,data;const res={set(){return this;},status(value){status=value;return this;},json(value){data=value;return this;}};
 const layer=router.stack.find(l=>l.route?.path===path&&l.route.methods[method]);assert(layer);
 await layer.route.stack[0].handle({body,params,query,admin:{id:3}},res);
 return {status,data};
}
for(const status of ['APPROVED','REJECTED'])test(`decision ${status} is scoped to public pending post and records authenticated reviewer`,async()=>{
 queryImpl=async(sql,values)=>{assert.match(sql,/visibility='PUBLIC' AND moderation_status='PENDING'/);assert.match(sql,/reviewed_by=\?,reviewed_at=NOW\(\)/);assert.deepEqual(values,[status,status==='REJECTED'?'Spam':null,3,42]);return [{affectedRows:1}];};
 const result=await request('patch','/posts/:postId/moderation',{status,reason:' Spam ',reviewedBy:999},{postId:'42'});assert.equal(result.status,200);
});
test('invalid decisions and rejection without reason do not write',async()=>{
 queryImpl=()=>assert.fail('no writes');
 for(const body of [{status:'PUBLIC'},{status:'REJECTED'},{status:'REJECTED',reason:' '},{status:'REJECTED',reason:'a'.repeat(1001)}])assert.equal((await request('patch','/posts/:postId/moderation',body,{postId:'42'})).status,400);
});
test('competing reviews or deletion produce conflict',async()=>{
 queryImpl=async()=>[{affectedRows:0}];assert.equal((await request('patch','/posts/:postId/moderation',{status:'APPROVED'},{postId:'42'})).status,409);
});
test('notifications count pending public posts and bind read state to the current admin',async()=>{
 queryImpl=async(sql,values)=>{assert.deepEqual(values,[3]);assert.match(sql,/visibility='PUBLIC' AND p.moderation_status='PENDING'/);assert.match(sql,/r.admin_id=\?/);return sql.includes('COUNT(*)')?[[{pending:25,unread:23}]]:[[{post_id:42,title:'Món mới',author:'An',read_at:null}]];};
 const result=await request('get','/notifications');assert.equal(result.data.data.pending,25);assert.equal(result.data.data.unread,23);assert.equal(result.data.data.items[0].read,false);
});
test('read actions cannot change another admin read state or include private/reviewed posts',async()=>{
 let calls=0;queryImpl=async(sql,values)=>{calls++;assert.match(sql,/INSERT IGNORE INTO admin_post_reads/);assert.match(sql,/visibility='PUBLIC' AND moderation_status='PENDING'/);assert.equal(values[0],3);return [{affectedRows:1}];};
 await request('put','/notifications/:postId/read',null,{postId:'42'});
 await request('put','/notifications/read-all');assert.equal(calls,2);
});

test('community list filters public posts with bound search/category and returns real totals',async()=>{
 queryImpl=async(sql,values)=>{
  if(sql.startsWith('SELECT p.*')){
   assert.match(sql,/p.visibility='PUBLIC' AND p.moderation_status=\? AND p.category=\?/);
   assert.match(sql,/ESCAPE '!'/);assert.deepEqual(values,['PENDING','Món ăn','%dau%','%h!_%',11,10]);
   return [[{post_id:42,title:'Đậu hũ',description:'Bài mới',category:'Món ăn',user_id:1,author:'An',moderation_status:'PENDING'}]];
  }
  if(sql.startsWith('SELECT COUNT(*) AS total FROM')){assert.deepEqual(values,['PENDING','Món ăn','%dau%','%h!_%']);return [[{total:12}]];}
  if(sql.startsWith('SELECT COUNT(*) AS total,SUM'))return [[{total:40,pending:12,rejected:2}]];
  if(sql.startsWith('SELECT DISTINCT'))return [[{category:'Món ăn'}]];
  assert.fail(sql);
 };
 const result=await request('get','/posts',undefined,{}, {status:'PENDING',page:'2',pageSize:'10',q:'đau h_',category:'Món ăn'});
 assert.equal(result.status,200);assert.equal(result.data.data.total,12);assert.deepEqual(result.data.data.stats,{total:40,pending:12,rejected:2});assert(result.data.data.categories.includes('Món ăn'));assert(result.data.data.categories.includes('Mẹo vặt nhà bếp'));assert(result.data.data.categories.length>=14);
});
test('community list rejects invalid pagination and oversized filters without a query',async()=>{
 queryImpl=()=>assert.fail('must not query');
 for(const query of [{pageSize:'10000'},{page:'0'},{q:'x'.repeat(151)},{category:'x'.repeat(51)}])assert.equal((await request('get','/posts',undefined,{},query)).status,400);
});

for(const hidden of [true,false])test(`${hidden?'hide':'restore'} only transitions an already approved or hidden public post`,async()=>{
 queryImpl=async(sql,values)=>{assert.match(sql,/visibility='PUBLIC' AND moderation_status=\?/);assert.deepEqual(values,[hidden?'HIDDEN':'APPROVED',3,42,hidden?'APPROVED':'HIDDEN']);return [{affectedRows:1}];};
 const result=await request('patch','/posts/:postId/visibility',{hidden},{postId:'42'});assert.equal(result.status,200);
});
test('visibility action rejects invalid body and conflicts without bypassing approval',async()=>{
 queryImpl=()=>assert.fail('must not write');assert.equal((await request('patch','/posts/:postId/visibility',{hidden:'true'},{postId:'42'})).status,400);
 queryImpl=async()=>[{affectedRows:0}];assert.equal((await request('patch','/posts/:postId/visibility',{hidden:false},{postId:'42'})).status,409);
});
test('admin deletion is limited to public posts and reports already deleted records',async()=>{
 for(const affectedRows of [0,1]){
  queryImpl=async(sql,values)=>{assert.equal(sql,"DELETE FROM community_posts WHERE post_id=? AND visibility='PUBLIC'");assert.deepEqual(values,[42]);return [{affectedRows}];};
  const result=await request('delete','/posts/:postId',null,{postId:'42'});assert.equal(result.status,affectedRows?200:404);
 }
});
test('date filtering binds a calendar-day range and applies it to the result and total',async()=>{
 let bounded=0;
 queryImpl=async(sql,values)=>{
  if(sql.startsWith('SELECT p.*')||sql.startsWith('SELECT COUNT(*) AS total FROM')){
   assert.match(sql,/p.created_at>=DATE_SUB\(CURDATE\(\),INTERVAL \? DAY\) AND p.created_at<DATE_ADD\(CURDATE\(\),INTERVAL 1 DAY\)/);assert.equal(values[0],6);bounded++;
   return sql.startsWith('SELECT p.*')?[[]]:[[{total:0}]];
  }
  return sql.startsWith('SELECT DISTINCT')?[[]]:[[{total:1,pending:0,rejected:0}]];
 };
 const result=await request('get','/posts',null,{}, {status:'ALL',days:'7'});assert.equal(result.status,200);assert.equal(bounded,2);
 queryImpl=()=>assert.fail('Invalid date range must not query');assert.equal((await request('get','/posts',null,{}, {days:'365'})).status,400);
});

test('notification history includes processed public posts, reviewer and pagination',async()=>{
 queryImpl=async(sql,values)=>{
  assert.match(sql,/visibility='PUBLIC'/);assert(!sql.includes("moderation_status='PENDING'"));
  if(sql.includes('COUNT(*)'))return [[{total:25}]];
  assert.deepEqual(values,[3,20]);assert.match(sql,/COALESCE\(p.reviewed_at,p.created_at\) DESC/);
  return [[{post_id:42,title:'Món ăn',author:'An',moderation_status:'REJECTED',reviewer:'Admin',rejection_reason:'Nội dung trùng',read_at:'2026-11-12',reviewed_at:'2026-11-12'}]];
 };
 const result=await request('get','/notifications/history',null,{}, {page:'2'});assert.equal(result.status,200);assert.equal(result.data.data.total,25);const item=result.data.data.items[0];assert.equal(item.status,'REJECTED');assert.equal(item.reviewer,'Admin');assert.equal(item.reason,'Nội dung trùng');assert.equal(item.read,true);
});
test('notification history validates page before querying',async()=>{
 queryImpl=()=>assert.fail('invalid page must not query');
 for(const page of ['0','-1','x','1.5'])assert.equal((await request('get','/notifications/history',null,{}, {page})).status,400);
});

test('engagement scopes to a public post and paginates likes with real totals',async()=>{
 queryImpl=async(sql,values)=>{
  if(sql.startsWith('SELECT post_id FROM')){assert.match(sql,/visibility='PUBLIC'/);assert.deepEqual(values,[42]);return [[{post_id:42}]];}
  if(sql.startsWith('SELECT (SELECT COUNT')){assert.deepEqual(values,[42,42,42]);return [[{likes:25,saves:2,comments:3}]];}
  assert.match(sql,/r.kind=\?/);assert.deepEqual(values,[42,'like',20]);return [[{user_id:7,author:'An'}]];
 };
 const r=await request('get','/posts/:postId/engagement',null,{postId:'42'},{type:'likes',page:'2'});assert.equal(r.status,200);assert.deepEqual(r.data.data.counts,{likes:25,saves:2,comments:3});assert.equal(r.data.data.items[0].userId,'7');
});
test('engagement comments show reply context only from the same post',async()=>{
 queryImpl=async(sql,values)=>{
  if(sql.startsWith('SELECT post_id'))return [[{post_id:42}]];
  if(sql.startsWith('SELECT (SELECT COUNT'))return [[{likes:0,saves:0,comments:1}]];
  assert.match(sql,/parent.post_id=c.post_id/);assert.deepEqual(values,[42,0]);return [[{comment_id:8,user_id:7,author:'An',content:'Cảm ơn',parent_comment_id:2,parent_content:'Món ngon'}]];
 };
 const r=await request('get','/posts/:postId/engagement',null,{postId:'42'});assert.equal(r.data.data.items[0].parentId,'2');assert.equal(r.data.data.items[0].content,'Cảm ơn');
});
test('engagement rejects invalid requests and does not expose private or deleted posts',async()=>{
 queryImpl=()=>assert.fail('invalid filter must not query');assert.equal((await request('get','/posts/:postId/engagement',null,{postId:'42'},{type:'bad'})).status,400);
 queryImpl=async sql=>{assert.match(sql,/visibility='PUBLIC'/);return [[]];};assert.equal((await request('get','/posts/:postId/engagement',null,{postId:'42'})).status,404);
});
