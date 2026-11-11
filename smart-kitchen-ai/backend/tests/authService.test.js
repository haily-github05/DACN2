const test = require('node:test');
const assert = require('node:assert/strict');
const dbPath = require.resolve('../src/config/db');
let queryImpl;
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: (...args) => queryImpl(...args) } };
const authService = require('../src/services/authService');
const bcrypt = require('bcryptjs');

test('registration loads successfully and always inserts USER with a hashed password', async () => {
  let queried = false;
  queryImpl = async (sql, values) => {
    queried = true;
    assert.match(sql, /role, created_at\) VALUES \(\?, \?, \?, 'USER', NOW\(\)\)/);
    assert.equal(values.length, 3);
    assert.deepEqual(values.slice(0, 2), ['Tên kiểm tra', '0901234567']);
    assert.notEqual(values[2], 'test-password');
    assert.equal(await bcrypt.compare('test-password', values[2]), true);
    return [{ insertId: 42 }];
  };
  assert.equal(await authService.registerUser('Tên kiểm tra', '0901234567', 'test-password'), 42);
  assert.equal(queried, true);
});

test('correct password cannot log in when the account is locked', async()=>{
 const hash=await bcrypt.hash('test-password',4);
 queryImpl=async sql=>{assert.match(sql,/SELECT/);return [[{user_id:7,password_hash:hash,is_active:0}]];};
 await assert.rejects(()=>authService.authenticateUser('0901234567','test-password'),error=>error.status===403);
});

test('email login normalizes case and verifies the stored password',async()=>{
 const hash=await bcrypt.hash('test-password',4);let updated=false;
 queryImpl=async(sql,values)=>{
  if(sql.startsWith('SELECT')){assert.match(sql,/LOWER\(email\) = \? LIMIT 2/);assert.deepEqual(values,['admin@gmail.com']);return [[{user_id:7,full_name:'Admin',phone:'0901234567',password_hash:hash,is_active:1}]];}
  assert.deepEqual(values,[7]);updated=true;return [{affectedRows:1}];
 };
 const user=await authService.authenticateUser('Admin@Gmail.com','test-password');assert.equal(user.user_id,7);assert(updated);
});
test('email login rejects wrong passwords and ambiguous email accounts',async()=>{
 const hash=await bcrypt.hash('test-password',4);
 queryImpl=async sql=>{assert.match(sql,/SELECT/);return [[{password_hash:hash,is_active:1}]];};assert.equal(await authService.authenticateUser('admin@gmail.com','wrong'),null);
 queryImpl=async()=>[[{user_id:1},{user_id:2}]];assert.equal(await authService.authenticateUser('admin@gmail.com','test-password'),null);
});
test('email login cannot bypass account locks',async()=>{
 const hash=await bcrypt.hash('test-password',4);queryImpl=async sql=>{assert.match(sql,/SELECT/);return [[{password_hash:hash,is_active:0}]];};await assert.rejects(()=>authService.authenticateUser('admin@gmail.com','test-password'),e=>e.status===403);
});
