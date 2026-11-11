const test=require('node:test'),assert=require('node:assert/strict');
const servicePath=require.resolve('../src/services/authService');let authenticate;
require.cache[servicePath]={id:servicePath,filename:servicePath,loaded:true,exports:{authenticateUser:(...args)=>authenticate(...args)}};
const controller=require('../src/controllers/authController');
async function login(body){let status=200,data;await controller.login({body},{status(n){status=n;return this;},json(v){data=v;}});return {status,data};}
test('login accepts normalized email as identifier or email field and keeps legacy phone requests',async()=>{
 for(const [body,expected]of [[{identifier:' Admin@Gmail.com ',password:'secret'},'admin@gmail.com'],[{email:'Admin@gmail.com',password:'secret'},'admin@gmail.com'],[{phone:'090 123 4567',password:'secret'},'0901234567']]){authenticate=async(id,password)=>{assert.equal(id,expected);assert.equal(password,'secret');return {user_id:7,full_name:'Admin',phone:'0901234567'};};const r=await login(body);assert.equal(r.status,200);assert(r.data.data.token);}
});
test('invalid email or phone never reaches authentication',async()=>{authenticate=()=>assert.fail('must not authenticate');for(const identifier of ['invalid','bad@','a b@gmail.com'])assert.equal((await login({identifier,password:'secret'})).status,400);});
