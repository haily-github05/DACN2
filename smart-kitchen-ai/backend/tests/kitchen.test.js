const test = require("node:test");
const assert = require("node:assert/strict");
const dbPath = require.resolve("../src/config/db");
let queryImpl;
let testPreferences = {allergies:[],disliked_ingredients:[]};
const events = [];
const conn = {
  beginTransaction: async () => events.push("begin"),
  commit: async () => events.push("commit"),
  rollback: async () => events.push("rollback"),
  release: () => events.push("release"),
  query: async (...args) => queryImpl(...args),
};
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getConnection: async () => conn, query: (...args) => args[0].startsWith("SELECT allergies, disliked_ingredients") ? Promise.resolve([[testPreferences]]) : queryImpl(...args) } };
const router = require("../src/routes/kitchenRoutes");
async function request(path, method, body, params = {}) {
  const layer = router.stack.find(l => l.route?.path === path && l.route.methods[method]);
  assert.ok(layer, path);
  let result, error;
  const res = { json: value => { result = value; return res; }, status: () => res };
  await layer.route.stack[0].handle({ body, params, query: {}, userId: 7 }, res, err => { error = err; });
  return { result, error };
}
const item = { name: "Cà chua", category: "Rau củ", quantity: 2, unit: "quả", purchaseDate: "2026-11-04", expiryDate: "2026-11-08", location: "Ngăn mát", note: "" };
test("rejects invalid dates before accessing MySQL", async () => {
  queryImpl = () => assert.fail("must not query");
  const { error } = await request("/:userId/pantry", "post", { ...item, expiryDate: "2026-02-30" });
  assert.equal(error.status, 400);
});
test("cross-user pantry update cannot create catalog records", async () => {
  events.length = 0;
  queryImpl = async (sql, values) => { assert.match(sql, /user_id = \? FOR UPDATE/); assert.deepEqual(values, [123, 7]); return [[]]; };
  const { error } = await request("/:userId/pantry/:itemId", "put", item, { itemId: "123" });
  assert.equal(error.status, 404);
  assert.deepEqual(events, ["begin", "rollback", "release"]);
});
test("pantry creation rolls back catalog changes if item insert fails", async () => {
  events.length = 0;
  queryImpl = async sql => {
    if (sql.startsWith("SELECT")) return [[]];
    if (sql.startsWith("INSERT INTO ingredients")) return [{ insertId: 19 }];
    throw new Error("simulated insert failure");
  };
  const { error } = await request("/:userId/pantry", "post", item);
  assert.equal(error.message, "simulated insert failure");
  assert.deepEqual(events, ["begin", "rollback", "release"]);
});
test("shopping transfer rolls back all changes on failure", async () => {
  events.length = 0;
  queryImpl = async (sql, values) => {
    if (sql.startsWith("SELECT")) { assert.deepEqual(values, [7]); return [[{ ingredient_id: 4, shopping_item_id: 9, quantity_to_buy: 2, unit: "quả" }]]; }
    if (sql.startsWith("INSERT")) return [{ insertId: 11 }];
    throw new Error("simulated delete failure");
  };
  const { error } = await request("/:userId/shopping/transfer", "post", {});
  assert.equal(error.message, "simulated delete failure");
  assert.deepEqual(events, ["begin", "rollback", "release"]);
});
test("pantry deletion always includes the owner", async () => {
  queryImpl = async (sql, values) => { assert.match(sql, /user_id=\? AND pantry_item_id=\?/); assert.deepEqual(values, [7, 12]); return [{ affectedRows: 1 }]; };
  const { result, error } = await request("/:userId/pantry/:itemId", "delete", undefined, { itemId: "12" });
  assert.equal(error, undefined);
  assert.equal(result.success, true);
});
test("recipe API returns calories per serving and preserves unknown values", async () => {
  queryImpl = async sql => {
    if (sql.startsWith("SELECT * FROM recipes")) return [[
      {recipe_id:9101,name:"Ức gà",calories:320,default_servings:2},
      {recipe_id:9102,name:"Chưa có calo",calories:null},
      {recipe_id:9103,name:"Không năng lượng",calories:0},
    ]];
    return [[]];
  };
  const {result,error} = await request("/:userId/recipes","get");
  assert.equal(error,undefined);
  assert.deepEqual(result.data.map(r=>r.calories),[320,null,0]);
  assert.equal(result.data[0].defaultServings,2);
});
test("saved meal plans reload calories from recipes", async () => {
  queryImpl = async sql => {
    if (sql.startsWith("SELECT ri.recipe_id")) return [[]];
    assert.match(sql,/r\.calories/);
    return [[{day:"2026-11-04",type:"lunch",recipe_id:9101,name:"Ức gà",calories:320,prep_time:10,cook_time:15}]];
  };
  const {result,error} = await request("/:userId/plans","get");
  assert.equal(error,undefined);
  assert.equal(result.data["2026-11-04"].lunch[0].calories,320);
});

test("recipe endpoint applies the current user's allergy choices", async () => {
  testPreferences = {allergies:["🥚 Trứng"],disliked_ingredients:[]};
  queryImpl = async sql => {
    if (sql.startsWith("SELECT * FROM recipes")) return [[{recipe_id:1,name:"Trứng cuộn"},{recipe_id:2,name:"Cơm"}]];
    if (sql.startsWith("SELECT ri.*")) return [[{recipe_id:1,ingredient_id:10,name:"Trứng gà",quantity:1},{recipe_id:2,ingredient_id:20,name:"Gạo",quantity:1}]];
    return [[]];
  };
  try {
    const {result,error} = await request("/:userId/recipes","get");
    assert.equal(error,undefined);
    assert.deepEqual(result.data.map(r=>r.id),["2"]);
  } finally { testPreferences = {allergies:[],disliked_ingredients:[]}; }
});
test("stale meal plan saves are rejected before any writes", async () => {
  events.length=0;
  testPreferences = {allergies:["Trứng"],disliked_ingredients:[]};
  queryImpl = async sql => {
    if(sql.startsWith("SELECT recipe_id FROM recipes")) return [[{recipe_id:1}]];
    if(sql.startsWith("SELECT ri.recipe_id")) return [[{recipe_id:1,ingredient_id:10,name:"Trứng gà"}]];
    assert.fail("Unexpected query: " + sql);
  };
  try {
    const {error} = await request("/:userId/plans","put",{"2026-11-04":{breakfast:{id:"1"},lunch:null,dinner:null}});
    assert.equal(error.status,400);
    assert.deepEqual(events,[]);
  } finally { testPreferences = {allergies:[],disliked_ingredients:[]}; }
});
test("posts accept an uploaded cover URL and preserve the full recipe text", async () => {
  const description="NGUYÊN LIỆU\n• Cà chua — 2 quả\n\nCÁCH LÀM\n1. Sơ chế\nRửa sạch cà chua.";
  let inserted;
  queryImpl=async(sql,values)=>{assert.match(sql,/INSERT INTO community_posts/);inserted=values;return [{insertId:55}];};
  const {result,error}=await request("/:userId/posts","post",{title:"Món nhà làm",description,category:"🍲 Món Việt",image:"/uploads/posts/7_123456ab-1234-1234-1234-123456abcdef.jpg"});
  assert.equal(error,undefined);
  assert.equal(result.data.id,"55");
  assert.equal(inserted[0],7);
  assert.equal(inserted[2],description);
});
test("posts reject arbitrary local file paths",async()=>{
  queryImpl=()=>assert.fail("must not insert");
  const {error}=await request("/:userId/posts","post",{title:"Món ăn",description:"Nội dung",category:"Món Việt",image:"file:///private/photo.jpg"});
  assert.equal(error.status,400);
});
test("post listing includes public posts and the current owner's private posts",async()=>{
 queryImpl=async(sql,values)=>{
  assert.match(sql,/p\.visibility='PUBLIC' OR p\.user_id=\?/);
  assert.deepEqual(values,[7,7,7]);
  return [[]];
 };
 const {result,error}=await request("/:userId/posts","get",undefined);
 assert.equal(error,undefined);
 assert.deepEqual(result.data,[]);
});
test("private visibility is saved and cannot be bypassed with arbitrary values",async()=>{
 let inserted;
 queryImpl=async(sql,values)=>{inserted=values;return [{insertId:2}];};
 const body={title:"Nhật ký nấu",description:"Nội dung",category:"Món Việt",visibility:"PRIVATE"};
 const {error}=await request("/:userId/posts","post",body);
 assert.equal(error,undefined);
 assert.equal(inserted[5],"PRIVATE");
 assert.equal((await request("/:userId/posts","post",{...body,visibility:"INVALID"})).error.status,400);
});
test("an account cannot publish someone else's uploaded private cover",async()=>{
 queryImpl=()=>assert.fail("must not write");
 const {error}=await request("/:userId/posts","post",{title:"Ảnh khác",description:"Nội dung",category:"Món Việt",image:"/uploads/posts/8_123abc-1234.jpg"});
 assert.equal(error.status,403);
});
test("cooking history preserves servings, rating and notes",async()=>{
 let values;
 queryImpl=async(sql,params)=>{assert.match(sql,/servings,rating,note/);values=params;return [{insertId:1,affectedRows:1}];};
 const {error}=await request("/:userId/cooking","post",{recipeId:10,servings:3,rating:4,note:"  Giảm muối  "});
 assert.equal(error,undefined);
 assert.deepEqual(values,[7,3,4,"Giảm muối",10]);
});
test("cooking history rejects invalid ratings and notes",async()=>{
 queryImpl=()=>assert.fail("must not write");
 for(const data of [{rating:6},{rating:1.5},{note:42}]) {
  const {error}=await request("/:userId/cooking","post",{recipeId:10,servings:2,...data});
  assert.equal(error.status,400);
 }
});
test("catalog searches include ingredients absent from the user's pantry",async()=>{
 queryImpl=async(sql,values)=>{
  assert.match(sql,/FROM ingredients i/);
  assert.match(sql,/p\.user_id=\?/);
  assert.deepEqual(values,[7]);
  return [[{ingredient_id:9008,name:"Khoai tây",category:"Rau củ",default_unit:"g",image_url:"/uploads/ingredients/khoai-tay.jpg",pantry_count:0}]];
 };
 const {result,error}=await request("/:userId/ingredients","get");
 assert.equal(error,undefined);
 assert.equal(result.data[0].name,"Khoai tây");
 assert.equal(result.data[0].inPantry,false);
});
test("adding from catalog reuses its ingredient ID instead of creating a duplicate",async()=>{
 let inserted;
 queryImpl=async(sql,values)=>{
  if(sql.startsWith("SELECT ingredient_id")) {assert.deepEqual(values,[9008]);return [[{ingredient_id:9008}]];}
  if(sql.startsWith("INSERT INTO pantry_items")) {inserted=values;return [{insertId:99}];}
  assert.fail("Unexpected catalog mutation: "+sql);
 };
 const {error}=await request("/:userId/pantry","post",{...item,ingredientId:"9008",name:"Khoai tây"});
 assert.equal(error,undefined);
 assert.equal(inserted[0],9008);
});
test("manual ingredient stores its uploaded image in the pantry row",async()=>{
 let savedValues;
 queryImpl=async(sql,values)=>{
  if(sql.startsWith("SELECT ingredient_id")) return [[{ingredient_id:9}]];
  if(sql.startsWith("INSERT INTO pantry_items")) {assert.match(sql,/image_url/);savedValues=values;return [{insertId:10}];}
  assert.fail("Unexpected query");
 };
 const {error}=await request("/:userId/pantry","post",{...item,image:"/uploads/pantry/7_123abc.jpg"});
 assert.equal(error,undefined);
 assert.equal(savedValues.at(-1),"/uploads/pantry/7_123abc.jpg");
});
test("manual ingredient rejects invalid image data before writing",async()=>{
 queryImpl=()=>assert.fail("must not write");
 const {error}=await request("/:userId/pantry","post",{...item,image:"file:///private/photo.jpg"});
 assert.equal(error.status,400);
});

test("existing onion catalog is reused while pantry keeps units in bulbs", async () => {
  queryImpl = async (sql, values) => {
    if (sql.startsWith('SELECT ingredient_id FROM ingredients WHERE name')) {
      assert.deepEqual(values, ['Hành tây']);
      assert.doesNotMatch(sql, /default_unit|category/);
      return [[{ ingredient_id: 9009 }]];
    }
    assert.match(sql, /^INSERT INTO pantry_items/);
    assert(values.includes(9009));
    assert(values.includes('củ'));
    return [{ insertId: 99 }];
  };
  const { result, error } = await request('/:userId/pantry', 'post', { ...item, name: 'Hành tây', quantity: 3, unit: 'củ' });
  assert.equal(error, undefined);
  assert.equal(result.success, true);
});
test("concurrent catalog creation reuses duplicate name instead of failing", async () => {
  let reads = 0;
  queryImpl = async (sql, values) => {
    if (sql.startsWith('SELECT ingredient_id FROM ingredients WHERE name')) {
      if (++reads === 1) return [[]];
      assert.match(sql, /FOR UPDATE/);
      return [[{ ingredient_id: 9009 }]];
    }
    if (sql.startsWith('INSERT INTO ingredients')) throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
    assert.match(sql, /^INSERT INTO pantry_items/);
    assert(values.includes(9009));
    return [{ insertId: 100 }];
  };
  const { error, result } = await request('/:userId/pantry', 'post', { ...item, name: 'Hành tây', unit: 'củ' });
  assert.equal(error, undefined);
  assert.equal(result.success, true);
});

for (const merge of [true, false]) {
  test(`manual pantry ${merge ? 'adds to matching batch' : 'creates separate batch when dates or units differ'}`, async () => {
    let updated = false, inserted = false;
    queryImpl = async (sql, values) => {
      if (sql.startsWith('SELECT user_id')) { assert.deepEqual(values, [7]); return [[{ user_id: 7 }]]; }
      if (sql.startsWith('SELECT ingredient_id')) return [[{ ingredient_id: 9009 }]];
      if (sql.startsWith('SELECT pantry_item_id, quantity')) {
        assert.match(sql, /user_id=\? AND ingredient_id=\? AND unit=\? AND storage_location=\?/);
        assert.match(sql, /purchase_date=\? AND expiry_date=\?/);
        assert.match(sql, /FOR UPDATE/);
        assert.deepEqual(values, [7, 9009, 'củ', item.location, item.purchaseDate, item.expiryDate, '']);
        return [merge ? [{ pantry_item_id: 12, quantity: 2 }] : []];
      }
      if (sql.startsWith('UPDATE pantry_items SET quantity=quantity+')) {
        assert.deepEqual(values, [3, null, 12, 7]); updated = true; return [{ affectedRows: 1 }];
      }
      assert.match(sql, /^INSERT INTO pantry_items/);
      inserted = true; return [{ insertId: 13 }];
    };
    const { result, error } = await request('/:userId/pantry', 'post', { ...item, name: 'Hành tây', quantity: 3, unit: 'củ', mergeExisting: true });
    assert.equal(error, undefined);
    assert.equal(updated, merge);
    assert.equal(inserted, !merge);
    assert.equal(result.data.id, merge ? 12 : 13);
    assert.equal(Boolean(result.data.merged), merge);
  });
}
test('meal plan API returns all dishes in the same meal', async () => {
 queryImpl=async sql=>{
  if(sql.startsWith('SELECT ri.recipe_id')) return [[]];
  return [[1,2].map(id=>({day:'2026-11-05',type:'lunch',recipe_id:id,name:`Món ${id}`,calories:100,prep_time:5,cook_time:10}))];
 };
 const {result,error}=await request('/:userId/plans','get');
 assert.equal(error,undefined);
 assert.equal(result.data['2026-11-05'].lunch.length,2);
});
test('meal plan saves every dish and accepts empty meal arrays', async () => {
 const inserts=[];
 queryImpl=async(sql,values)=>{
  if(sql==='SELECT recipe_id FROM recipes WHERE is_active=1') return [[{recipe_id:1},{recipe_id:2}]];
  if(sql.startsWith('SELECT ri.recipe_id')) return [[]];
  if(sql.startsWith('SELECT user_id')) return [[{user_id:7}]];
  if(sql.startsWith('INSERT INTO meal_plans')) return [{insertId:99}];
  if(sql.startsWith('INSERT INTO meal_plan_items')) inserts.push(values);
  return [{affectedRows:1}];
 };
 const {error}=await request('/:userId/plans','put',{'2026-11-05':{breakfast:[],lunch:[{id:'1'},{id:'2'}],dinner:[]}});
 assert.equal(error,undefined);
 assert.deepEqual(inserts,[[99,'2026-11-05','LUNCH',1],[99,'2026-11-05','LUNCH',2]]);
});

for (const affectedRows of [0, 1]) {
 test(`post deletion ${affectedRows ? 'succeeds for owner' : 'rejects absent or other owner post'}`, async () => {
  queryImpl = async (sql, values) => {
   assert.equal(sql, 'DELETE FROM community_posts WHERE post_id=? AND user_id=?');
   assert.deepEqual(values, [42, 7]);
   return [{ affectedRows }];
  };
  const { error, result } = await request('/:userId/posts/:postId', 'delete', undefined, { postId:'42' });
  if (affectedRows) { assert.equal(error, undefined); assert.equal(result.success, true); }
  else { assert.equal(error.status,404); assert.equal(result,undefined); }
 });
}
test('post ownership comes from the authenticated viewer rather than author name', async () => {
 queryImpl = async () => [[{post_id:1,user_id:7,author:'Trùng tên',title:'Của tôi'}, {post_id:2,user_id:8,author:'Trùng tên',title:'Của người khác'}]];
 const { result,error } = await request('/:userId/posts','get');
 assert.equal(error,undefined);
 assert.equal(result.data[0].isOwner,true);
 assert.equal(result.data[1].isOwner,false);
});
