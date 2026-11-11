const test=require('node:test');
const assert=require('node:assert/strict');
const dbPath=require.resolve('../src/config/db');
let queryImpl;
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:(...args)=>queryImpl(...args)}};
const {searchAdmin}=require('../src/services/adminSearchService');
const router=require('../src/routes/adminRoutes');
test('search binds and escapes literal wildcard input, paginates, and selects no password fields',async()=>{
 queryImpl=async(sql,values)=>{
  assert.doesNotMatch(sql,/password_hash|SELECT \*/);
  assert.match(sql,/ESCAPE '!'/);
  assert.match(sql,/COLLATE utf8mb4_unicode_ci/);
  assert.match(sql,/REPLACE/);
  assert.deepEqual(values, ['%dau%', "%h!_!%'%", 20]);
  return [Array.from({length:21},(_,i)=>({id:100-i,name:'Kết quả'}))];
 };
 // SQL special characters remain bound data; !, _ and % are literal matches.
 const value=await searchAdmin("đau h_%'",'recipes',2);
 assert.equal(value.groups.recipes.items.length,20);
 assert.equal(value.groups.recipes.hasMore,true);
 assert.equal(value.groups.recipes.items[0].id,'100');
 assert.equal(value.groups.users,undefined);
});
test('all search types query their own allowlisted table with all words',async()=>{
 const tables=[];
 queryImpl=async(sql,values)=>{tables.push(sql.match(/FROM (\w+)/)[1]);assert.deepEqual(values,['%pho%','%bo%',0]);return [[]];};
 const value=await searchAdmin('pho bo','all',1);
 assert.deepEqual(tables.sort(),['ingredients','recipes','users']);
 assert.equal(Object.keys(value.groups).length,3);
});
test('route rejects invalid search parameters and skips database for empty query',async()=>{
 queryImpl=()=>assert.fail('must not query');
 const layer=router.stack.find(l=>l.route?.path==='/search');
 for(const query of [{q:'a'.repeat(101)},{q:'test',type:'password_hash'},{q:'test',page:'0'},{q:'test',page:'1.5'}]){
  let status=200;const res={set(){return this;},status(n){status=n;return this;},json(){}};
  await layer.route.stack[0].handle({query},res);assert.equal(status,400);
 }
 let body;
 await layer.route.stack[0].handle({query:{q:'   '}},{set(){return this;},json(value){body=value;}});
 assert.deepEqual(body.data.groups,{});
});
