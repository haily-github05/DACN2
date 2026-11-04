// Kiểm tra: Thông báo được tạo từ dữ liệu thật và giới hạn theo tài khoản.
const test=require("node:test");
const assert=require("node:assert/strict");
const dbPath=require.resolve("../src/config/db");
const calls=[];
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:async(sql,params)=>{
 calls.push({sql,params});
 if(sql.includes("FROM pantry_items")) return [[
  {id:1,name:"Cà rốt",quantity:"200",unit:"g",expiry_date:"2026-11-05",event_date:"2026-11-02",days_left:1},
  {id:2,name:"Sữa",quantity:"1",unit:"hộp",expiry_date:"2026-11-03",event_date:"2026-10-31",days_left:-1},
 ]];
 if(sql.includes("FROM meal_plan_items")) return [[]];
 if(sql.includes("FROM community_posts")) return [[{post_id:3,title:"Salad nhà làm",likes:2,image_url:"/uploads/posts/image.jpg"}]];
 return [[{shopping_list_id:4,shopping_item_id:8,name:"Trứng"},{shopping_list_id:4,shopping_item_id:9,name:"Tỏi"}]];
}}};
const {getNotifications}=require("../src/services/notificationService");
test("notification sources always use the requested owner and actionable records",async()=>{
 const result=await getNotifications(7);
 assert.deepEqual(calls.map(call=>call.params),[[7],[7],[7],[7]]);
 assert.match(calls[0].sql,/p.quantity>0/);
 assert.match(calls[2].sql,/r.user_id<>p.user_id/);
 assert.match(calls[3].sql,/s.is_purchased=1/);
 const soon=result.find(n=>n.id.startsWith("pantry:1:"));
 const expired=result.find(n=>n.id.startsWith("pantry:2:"));
 assert.equal(soon.urgent,true);
 assert.equal(soon.secondaryRoute,"/recipes");
 assert.equal(expired.expired,true);
 assert.equal(expired.secondaryRoute,null);
 assert.deepEqual(soon.params,{id:"1"});
 assert.equal(result.filter(n=>n.category==="shopping").length,1);
 assert.match(result.find(n=>n.category==="social").body,/2/);
 assert.equal(result.some(n=>n.category==="meal"),false);
});
