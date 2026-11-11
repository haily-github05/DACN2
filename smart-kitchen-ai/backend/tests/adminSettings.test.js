const test=require('node:test');
const assert=require('node:assert/strict');
const bcrypt=require('bcryptjs');
const dbPath=require.resolve('../src/config/db');
let queryImpl;
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:(...args)=>queryImpl(...args)}};
const router=require('../src/routes/adminSettingsRoutes');
async function request(method,path,body,file){let status=200,data;const res={set(){return this;},status(n){status=n;return this;},json(v){data=v;return this;}};const layer=router.stack.find(l=>l.route?.path===path&&l.route.methods[method]);assert(layer);await layer.route.stack.at(-1).handle({body,file,admin:{id:3}},res);return {status,data};}
test('profile updates are bound to signed-in admin, ignoring spoofed account ID and role',async()=>{
 queryImpl=async(sql,values)=>{assert.equal(sql,'UPDATE users SET full_name=?,email=?,phone=?,updated_at=NOW() WHERE user_id=?');assert.deepEqual(values,['Hải Ly','ly@example.com','0865529572',3]);return [{affectedRows:1}];};
 assert.equal((await request('put','/settings/profile',{name:' Hải Ly ',email:'ly@example.com',phone:'0865529572',id:9,role:'USER'})).status,200);
 queryImpl=()=>assert.fail('invalid profile must not query');assert.equal((await request('put','/settings/profile',{name:'',phone:'123',email:''})).status,400);
});
test('preferences use current admin and reject unsupported values',async()=>{
 queryImpl=async(sql,values)=>{assert.match(sql,/INSERT INTO admin_preferences/);assert.deepEqual(values,[3,'dark',0,30]);return [{affectedRows:1}];};
 assert.equal((await request('put','/settings/preferences',{theme:'dark',notifications:false,idleMinutes:30,adminId:9})).status,200);
 queryImpl=()=>assert.fail('must not query');assert.equal((await request('put','/settings/preferences',{theme:'bad',notifications:true,idleMinutes:30})).status,400);
});
test('password change requires correct current password and hashes the new one with race protection',async()=>{
 const oldHash=await bcrypt.hash('OldPassword123',4);let writes=0;
 queryImpl=async(sql,values)=>{if(sql.startsWith('SELECT')){assert.deepEqual(values,[3]);return [[{password_hash:oldHash}]];}writes++;assert.match(sql,/WHERE user_id=\? AND password_hash=\?/);assert.equal(values[1],3);assert.equal(values[2],oldHash);assert(await bcrypt.compare('NewPassword456',values[0]));return [{affectedRows:1}];};
 assert.equal((await request('put','/settings/password',{currentPassword:'wrong',newPassword:'NewPassword456',confirmPassword:'NewPassword456'})).status,400);assert.equal(writes,0);
 assert.equal((await request('put','/settings/password',{currentPassword:'OldPassword123',newPassword:'NewPassword456',confirmPassword:'NewPassword456'})).status,200);assert.equal(writes,1);
});
test('password validation and avatar validation reject bad input before SQL',async()=>{
 queryImpl=()=>assert.fail('invalid input must not query');
 assert.equal((await request('put','/settings/password',{currentPassword:'old',newPassword:'short',confirmPassword:'short'})).status,400);
 assert.equal((await request('put','/settings/password',{currentPassword:'old',newPassword:'NewPassword456',confirmPassword:'different'})).status,400);
 assert.equal((await request('post','/settings/avatar',null,{buffer:Buffer.from('<svg/>')})).status,400);
});
test('settings returns real profile and sensible defaults without password hash',async()=>{
 queryImpl=async(sql,values)=>{assert.deepEqual(values,[3]);return sql.includes('FROM users')?[[{user_id:3,full_name:'Ly',role:'ADMIN',is_active:1}]]:[[]];};
 const result=await request('get','/settings');assert.equal(result.status,200);assert.equal(result.data.data.profile.id,'3');assert.equal(result.data.data.profile.role,'ADMIN');assert.equal(result.data.data.preferences.theme,'light');assert(!('password_hash' in result.data.data.profile));
});
