const test=require('node:test');
const assert=require('node:assert/strict');
const dbPath=require.resolve('../src/config/db');
let queryImpl,events=[];
const conn={query:(...args)=>queryImpl(...args),beginTransaction:async()=>events.push('begin'),commit:async()=>events.push('commit'),rollback:async()=>events.push('rollback'),release:()=>events.push('release')};
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:(...args)=>queryImpl(...args),getConnection:async()=>conn}};
const router=require('../src/routes/adminIngredientRoutes');
async function request(method,path,body,params={},query={},file){let status=200,data;const res={set(){return this;},status(n){status=n;return this;},json(value){data=value;return this;}};const layer=router.stack.find(l=>l.route?.path===path&&l.route.methods[method]);assert(layer);await layer.route.stack.at(-1).handle({body,params,query,file},res);return {status,data};}
const sample={name:'Cà rốt',category:'Rau củ',unit:'g',storage:'Ngăn mát',image:''};
test('catalog filters bind text, category and unit and aggregate real schema fields',async()=>{
 queryImpl=async(sql,values)=>{
  if(sql.startsWith('SELECT i.ingredient_id')){assert.match(sql,/recipe_ingredients/);assert.match(sql,/pantry_items/);assert.deepEqual(values,['Rau củ','g','%ca%',10,0]);return [[{ingredient_id:7,name:'Cà rốt',default_unit:'g',category:'Rau củ',recipe_count:2,pantry_count:1,shopping_count:0}]];}
  if(sql.startsWith('SELECT COUNT(*) AS total FROM ingredients i'))return [[{total:1}]];
  if(sql.includes(' AS categories'))return [[{total:12,categories:3,units:2,storage:6}]];
  if(sql.includes(' AS category_name'))return [[{category_name:'Rau củ',count:4}]];
  if(sql.includes(' AS storage_name'))return [[{storage_name:'Ngăn mát',count:6}]];
  return [[{name:'g',count:8}]];
 };
 const result=await request('get','/ingredients',null,{}, {q:'ca',category:'Rau củ',unit:'g'});assert.equal(result.status,200);assert.equal(result.data.data.items[0].usage.recipes,2);assert.equal(result.data.data.stats.storage,6);
});
test('new ingredients bind values and validate unit/name/image paths',async()=>{
 let wrote=false;queryImpl=async(sql,values)=>{wrote=true;assert.match(sql,/INSERT INTO ingredients/);assert.deepEqual(values,['Cà rốt','Rau củ','g','Ngăn mát',null]);return [{insertId:7}];};
 assert.equal((await request('post','/ingredients',sample)).status,201);assert(wrote);
 queryImpl=()=>assert.fail('invalid input must not write');
 for(const body of [{...sample,unit:''},{...sample,name:''},{...sample,image:'file:///secret'},{...sample,storage:'x'.repeat(31)}])assert.equal((await request('post','/ingredients',body)).status,400);
});
test('bulk deletion rolls back every item when any ingredient is referenced',async()=>{
 events=[];queryImpl=async sql=>{assert.match(sql,/FOR UPDATE/);return [[{ingredient_id:7,name:'Chưa dùng',recipe_count:0,pantry_count:0,shopping_count:0},{ingredient_id:8,name:'Đang dùng',recipe_count:1,pantry_count:0,shopping_count:0}]];};
 const result=await request('post','/ingredients/bulk-delete',{ids:[7,8]});assert.equal(result.status,409);assert.deepEqual(events,['begin','rollback','release']);
});
test('unreferenced ingredient deletion uses locked IDs and commits',async()=>{
 events=[];queryImpl=async(sql,values)=>{assert.deepEqual(values,[7]);if(sql.startsWith('SELECT'))return [[{ingredient_id:7,name:'Chưa dùng',recipe_count:0,pantry_count:0,shopping_count:0}]];assert.equal(sql,'DELETE FROM ingredients WHERE ingredient_id IN (?)');return [{affectedRows:1}];};
 assert.equal((await request('delete','/ingredients/:ingredientId',null,{ingredientId:'7'})).status,200);assert.deepEqual(events,['begin','commit','release']);
});
test('bulk edits only modify explicitly chosen category/storage fields',async()=>{
 queryImpl=async(sql,values)=>{if(sql.startsWith('SELECT'))return [[{ingredient_id:7}]];assert.equal(sql,'UPDATE ingredients SET category=? WHERE ingredient_id IN (?)');assert.deepEqual(values,['Gia vị',7]);return [{affectedRows:1}];};
 assert.equal((await request('patch','/ingredients/bulk',{ids:[7],category:'Gia vị'})).status,200);
});
test('image uploads reject unsupported signatures before writing',async()=>{
 const result=await request('post','/ingredients/image',null,{}, {},{buffer:Buffer.from('<svg/>')});assert.equal(result.status,400);
});

test('image review updates only image_url and never name/category/unit',async()=>{
 events=[];queryImpl=async(sql,values)=>{if(sql.startsWith('SELECT'))return [[{ingredient_id:7,name:'Cà rốt',image_url:'/uploads/ingredients/old.jpg'}]];assert.equal(sql,'UPDATE ingredients SET image_url=? WHERE ingredient_id=?');assert.deepEqual(values,['https://example.com/carrot.jpg',7]);return [{affectedRows:1}];};
 const result=await request('patch','/ingredients/:ingredientId/image',{image:'https://example.com/carrot.jpg',previousImage:'/uploads/ingredients/old.jpg'},{ingredientId:'7'});assert.equal(result.status,200);assert.equal(result.data.data.name,'Cà rốt');assert.deepEqual(events,['begin','commit','release']);
});
test('image-only endpoint rejects fields that could rename ingredients',async()=>{
 queryImpl=()=>assert.fail('must not query');
 const result=await request('patch','/ingredients/:ingredientId/image',{image:'https://example.com/other.jpg',previousImage:'',name:'Tên khác'},{ingredientId:'7'});assert.equal(result.status,400);
});
test('stale image replacement fails without overwriting a newer photo',async()=>{
 events=[];queryImpl=async sql=>{assert.match(sql,/SELECT/);return [[{ingredient_id:7,name:'Cà rốt',image_url:'/uploads/ingredients/newer.jpg'}]];};
 const result=await request('patch','/ingredients/:ingredientId/image',{image:'https://example.com/other.jpg',previousImage:'/uploads/ingredients/old.jpg'},{ingredientId:'7'});assert.equal(result.status,409);assert.deepEqual(events,['begin','rollback','release']);
});

test('restoring a removed local image is rejected before changing the database',async()=>{
 queryImpl=()=>assert.fail('removed image must not update data');
 const result=await request('patch','/ingredients/:ingredientId/image',{image:'/uploads/ingredients/nonexistent-restore-test.jpg',previousImage:''},{ingredientId:'7'});assert.equal(result.status,400);
});

test('ingredient recipes return only matching recipes with ingredients and ordered steps',async()=>{
 queryImpl=async(sql,values)=>{
  if(sql.startsWith('SELECT ingredient_id,name FROM')){assert.deepEqual(values,[7]);return [[{ingredient_id:7,name:'Cà rốt'}]];}
  if(sql.startsWith('SELECT r.recipe_id')){assert.match(sql,/EXISTS/);assert.deepEqual(values,[7]);return [[{recipe_id:21,name:'Canh',is_active:0,prep_time:5,cook_time:10,default_servings:2}]];}
  assert.deepEqual(values,[21]);
  if(sql.includes('JOIN ingredients'))return [[{recipe_id:21,name:'Cà rốt',quantity:'100',unit:'g'}]];
  assert.match(sql,/ORDER BY recipe_id,step_number/);return [[{recipe_id:21,step_number:1,instruction:'Nấu canh'}]];
 };
 const result=await request('get','/ingredients/:ingredientId/recipes',null,{ingredientId:'7'});
 assert.equal(result.status,200);assert.equal(result.data.data.items[0].minutes,15);assert.equal(result.data.data.items[0].ingredients[0].quantity,100);assert.equal(result.data.data.items[0].active,false);assert.equal(result.data.data.items[0].steps[0].instruction,'Nấu canh');
});
test('recipe usage handles missing ingredient, invalid ID and no recipes',async()=>{
 queryImpl=()=>assert.fail('invalid ID must not query');assert.equal((await request('get','/ingredients/:ingredientId/recipes',null,{ingredientId:'bad'})).status,400);
 queryImpl=async()=>[[]];assert.equal((await request('get','/ingredients/:ingredientId/recipes',null,{ingredientId:'7'})).status,404);
 queryImpl=async sql=>sql.startsWith('SELECT ingredient_id,name FROM')?[[{ingredient_id:7,name:'Cà rốt'}]]:[[]];
 const result=await request('get','/ingredients/:ingredientId/recipes',null,{ingredientId:'7'});assert.equal(result.status,200);assert.deepEqual(result.data.data.items,[]);
});
