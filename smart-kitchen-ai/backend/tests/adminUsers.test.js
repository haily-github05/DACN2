const test=require('node:test');
const assert=require('node:assert/strict');
const dbPath=require.resolve('../src/config/db');
let queryImpl,events=[];
const conn={query:(...args)=>queryImpl(...args),beginTransaction:async()=>events.push('begin'),commit:async()=>events.push('commit'),rollback:async()=>events.push('rollback'),release:()=>events.push('release')};
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:(...args)=>queryImpl(...args),getConnection:async()=>conn}};
const router=require('../src/routes/adminUserRoutes');
const {checkAccountStatus}=require('../src/services/accountStatusService');
const {createToken}=require('../src/services/sessionService');
async function request(method,path,body,params={},query={}){let status=200,data;const res={set(){return this;},status(n){status=n;return this;},json(value){data=value;return this;}};const layer=router.stack.find(l=>l.route?.path===path&&l.route.methods[method]);assert(layer);await layer.route.stack[0].handle({body,params,query,admin:{id:3}},res);return {status,data};}
test('user filters are bound and query never selects password hashes',async()=>{
 queryImpl=async(sql,values)=>{assert.doesNotMatch(sql,/password_hash|SELECT \*/);if(sql.startsWith('SELECT user_id')){assert.deepEqual(values,['USER',0,'%dau%',0]);return [[{user_id:7,full_name:'Đậu',role:'USER',is_active:0}]];}if(sql.includes(' AS locked'))return [[{total:20,active:18,locked:2,admins:1,new_month:3}]];return [[{total:1}]];};
 const result=await request('get','/users',null,{}, {role:'USER',status:'LOCKED',q:'đau'});assert.equal(result.status,200);assert.equal(result.data.data.items[0].active,false);assert.equal(result.data.data.stats.locked,2);assert.equal(result.data.data.stats.active,18);assert.equal(result.data.data.stats.newMonth,3);assert.equal(result.data.data.stats.admins,1);
});
test('self-demotion and self-locking fail before any mutation',async()=>{
 queryImpl=()=>assert.fail('must not access database');
 for(const body of [{role:'USER'},{active:false}])assert.equal((await request('patch','/users/:userId',body,{userId:'3'})).status,400);
});
test('role/status update locks active admins, binds role, and commits',async()=>{
 events=[];queryImpl=async(sql,values)=>{if(sql.includes('ORDER BY user_id FOR UPDATE'))return [[{user_id:3}]];if(sql.startsWith('SELECT user_id,role'))return [[{user_id:7,role:'USER',is_active:1}]];assert.match(sql,/UPDATE users SET role=\?,is_active=\?,locked_reason=\?/);assert.deepEqual(values,['MODERATOR',1,null,7]);return [{affectedRows:1}];};
 assert.equal((await request('patch','/users/:userId',{role:'MODERATOR'},{userId:'7'})).status,200);assert.deepEqual(events,['begin','commit','release']);
});
test('revoked admin role is checked again inside the transaction',async()=>{
 events=[];queryImpl=async()=>[[]];
 assert.equal((await request('patch','/users/:userId',{active:false},{userId:'7'})).status,403);assert.deepEqual(events,['begin','rollback','release']);
});
test('legacy URL ids and signed old sessions are denied for locked accounts',async()=>{
 queryImpl=async()=>[[{user_id:7,is_active:0}]];
 for(const path of ['/api/kitchen/7/posts','/api/profile/007','/api/home/7.0','/api/users/%37/preferences','/api/pantry/7']){
  let status;const res={status(n){status=n;return this;},json(){}};await checkAccountStatus({path,headers:{}},res,()=>assert.fail('must reject locked target'));assert.equal(status,403);
 }
 let status;const res={status(n){status=n;return this;},json(){}};await checkAccountStatus({path:'/api/admin/users',headers:{authorization:`Bearer ${createToken(7)}`}},res,()=>assert.fail('must reject old token'));assert.equal(status,403);
});
test('invalid creation fields and unrecognized roles cannot create a user',async()=>{
 queryImpl=()=>assert.fail('must not query');assert.equal((await request('post','/users',{name:'An',phone:'0901234567',password:'password',role:'SUPERADMIN'})).status,400);
});
