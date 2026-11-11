const test = require('node:test');
const assert = require('node:assert/strict');
const { createToken } = require('../src/services/sessionService');
const dbPath = require.resolve('../src/config/db');
let queryImpl;
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: (...args) => queryImpl(...args) } };
const { requireAdmin } = require('../src/services/adminService');
const { getOverview } = require('../src/services/adminOverviewService');
const router = require('../src/routes/adminRoutes');
function response() {
  const res = { statusCode: 200, body: null, status(n) { this.statusCode = n; return this; }, json(value) { this.body = value; return this; }, set() { return this; } };
  return res;
}
test('role checks reject guests, ordinary users, moderators and missing roles', async () => {
  const res = response();
  queryImpl=()=>assert.fail('Guest must not query');
  await requireAdmin({headers:{}},res,()=>assert.fail('must not pass'));
  assert.equal(res.statusCode,401);
  process.env.ADMIN_USER_IDS='3'; // Legacy configuration must not grant access.
  try {
    for(const role of ['USER','MODERATOR',undefined]) {
      queryImpl=async()=>[[{user_id:3,full_name:'User',role,is_active:1}]];
      const responseValue=response();
      await requireAdmin({headers:{authorization:`Bearer ${createToken(3)}`}},responseValue,()=>assert.fail('must not pass'));
      assert.equal(responseValue.statusCode,403);
    }
  } finally { delete process.env.ADMIN_USER_IDS; }
});
test('admin role is read on every request, so demotion takes effect with the same token', async () => {
  const req={headers:{authorization:`Bearer ${createToken(3)}`}};
  let role='ADMIN';
  queryImpl=async(sql,values)=>{assert.match(sql,/SELECT user_id, full_name, role/);assert.deepEqual(values,[3]);return [[{user_id:3,full_name:'Admin',role,is_active:1}]];};
  let passed=false;
  await requireAdmin(req,response(),()=>{passed=true;});
  assert.equal(passed,true);assert.deepEqual(req.admin,{id:3,name:'Admin',role:'ADMIN',avatar:''});
  role='USER';
  const denied=response();
  await requireAdmin(req,denied,()=>assert.fail('demoted user must not pass'));
  assert.equal(denied.statusCode,403);
  queryImpl=async()=>[[]];
  const missing=response();
  await requireAdmin(req,missing,()=>assert.fail('deleted user must not pass'));
  assert.equal(missing.statusCode,401);
});
test('overview fills missing days with zeros and derives category shares from active recipes', async () => {
  queryImpl = async (sql, values) => {
    assert.doesNotMatch(sql,/INSERT|UPDATE|DELETE|password_hash|phone/);
    if (sql.startsWith('SELECT\n')) { assert.deepEqual(values,[6,6,6,6,6,6]); return [[{users:5,recipes:4,ingredients:8,posts:2,comments:3,cooked:7,new_users:1,new_recipes:2,new_ingredients:3,new_posts:1,new_comments:1,new_cooked:2}]]; }
    if (sql.includes('AS today')) return [[{today:'2026-11-11'}]];
    if (sql.includes('GROUP BY day')) { assert.deepEqual(values,[6]);return [[{day:'2026-11-10',count:sql.includes('FROM users')?1:2}]]; }
    if (sql.includes('GROUP BY category_name')) return [[{category_name:'Món Việt',count:2}]];
    if (sql.includes('FROM recipes r ORDER')) return [[{recipe_id:1,name:'Canh',description:null,image_url:null,is_active:0,ingredient_count:2}]];
    if (sql.includes('UNION ALL')) { assert.match(sql,/visibility='PUBLIC'/);return [[{id:'recipe-1',type:'recipe',title:'Canh',body:'Thêm công thức',time:'2026-11-10'}]]; }
    assert.fail(sql);
  };
  const result = await getOverview(7);
  assert.equal(result.trends.length,7);
  assert.deepEqual(result.trends[0],{day:'2026-11-05',users:0,cooked:0});
  assert.deepEqual(result.trends[5],{day:'2026-11-10',users:1,cooked:2});
  assert.equal(result.stats.find(s=>s.key==='community').value,5);
  assert.deepEqual(result.categories,[{name:'Món Việt',count:2,percent:50}]);
  assert.equal(result.recipes[0].active,false);
  assert.equal(result.ai.configured,false);
});
test('overview rejects unsupported date windows before accessing MySQL', async () => {
  queryImpl=()=>assert.fail('Invalid periods must not query');
  const layer=router.stack.find(item=>item.route?.path==='/overview');
  for(const days of ['0','-7','365','7 OR 1=1']) {
    const res=response();
    await layer.route.stack[0].handle({query:{days}},res);
    assert.equal(res.statusCode,400);
  }
});
test('overview route reports database failure instead of returning fake values', async () => {
  queryImpl=async()=>{throw new Error('Database unavailable');};
  const layer=router.stack.find(item=>item.route?.path==='/overview');
  const res=response();
  await layer.route.stack[0].handle({query:{days:'7'}},res);
  assert.equal(res.statusCode,503);assert.equal(res.body.success,false);
});
