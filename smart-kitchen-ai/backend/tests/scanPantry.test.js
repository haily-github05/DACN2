const test=require('node:test'),assert=require('node:assert/strict');
const dbPath=require.resolve('../src/config/db');let queryImpl,events=[];
const conn={query:(...args)=>queryImpl(...args),beginTransaction:async()=>events.push('begin'),commit:async()=>events.push('commit'),rollback:async()=>events.push('rollback'),release:()=>events.push('release')};
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:(...args)=>queryImpl(...args),getConnection:async()=>conn}};
const router=require('../src/routes/kitchenRoutes');
const handler=router.stack.find(l=>l.route?.path==='/:userId/pantry/batch').route.stack.at(-1).handle;
const valid={name:'Cà rốt',category:'Rau củ',unit:'g',quantity:200,location:'Ngăn đông',purchaseDate:'2026-11-12',expiryDate:'2026-12-12',note:'Đã cắt'};
async function request(items){let error,data;await handler({body:{items},userId:7},{json(v){data=v;}},e=>{error=e;});return {error,data};}
test('scan batch stores selected dates, location and note for the authenticated owner',async()=>{
 events=[];queryImpl=async(sql,values)=>{if(sql.startsWith('SELECT ingredient_id'))return [[{ingredient_id:12}]];if(sql.startsWith('SELECT pantry_item_id'))return [[{pantry_item_id:9,purchaseDate:valid.purchaseDate,expiryDate:valid.expiryDate,location:valid.location}]];assert.match(sql,/purchase_date,expiry_date,note/);assert.deepEqual(values,[7,12,200,'g','Ngăn đông','2026-11-12','2026-12-12','Đã cắt']);return [{insertId:9}];};
 const result=await request([valid]);assert(!result.error);assert.equal(result.data.data.count,1);assert.deepEqual(events,['begin','commit','release']);
});
test('batch validates every date and location before writing',async()=>{
 queryImpl=()=>assert.fail('must not query');events=[];
 for(const invalid of [{...valid,expiryDate:''},{...valid,expiryDate:'2026-02-30'},{...valid,expiryDate:'2026-11-01'},{...valid,location:'invalid'}]){const result=await request([valid,invalid]);assert.equal(result.error.status,400);}
 assert.deepEqual(events,[]);
});
test('a later insert failure rolls back all pantry items',async()=>{
 events=[];let writes=0;queryImpl=async sql=>{if(sql.startsWith('SELECT ingredient_id'))return [[{ingredient_id:12}]];if(++writes===2)throw new Error('database failure');return [{insertId:9}];};
 const result=await request([valid,valid]);assert(result.error);assert.deepEqual(events,['begin','rollback','release']);
});

test('retrying the same scan returns the stored result without inserting again',async()=>{
 const result={count:1,items:[{id:'9',purchaseDate:valid.purchaseDate,expiryDate:valid.expiryDate,location:valid.location}]};
 const hash=require('node:crypto').createHash('sha256').update(JSON.stringify([valid])).digest('hex');
 queryImpl=async sql=>{if(sql.startsWith('INSERT IGNORE INTO pantry_scan_batches'))return [{affectedRows:0}];if(sql.startsWith('SELECT payload_hash'))return [[{payload_hash:hash,result_json:result}]];assert.fail('retry must not insert pantry items');};
 let data,error;await handler({body:{items:[valid],requestId:'scan-retry-12345'},userId:7},{json(v){data=v;}},e=>{error=e;});assert(!error);assert.deepEqual(data.data,result);
});
