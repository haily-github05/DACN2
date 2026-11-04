// Kiểm tra: Hoạt động theo tài khoản, lịch sử món khác nhau và quyền xem bài đã lưu.
const test = require("node:test");
const assert = require("node:assert/strict");
const calls=[];
const dbPath=require.resolve("../src/config/db");
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:async(sql,values)=>{
 calls.push({sql,values});
 if(sql.includes("cooking_history")) return [[1,2,3].map(id=>({recipe_id:10,name:"Trứng",calories:180,history_id:id,servings:2,rating:id===1?5:null,note:id===1?"Ít muối":"",plan_item_id:null,cooked_at:"2026-11-04",prep_time:5,cook_time:10}))];
 if(sql.includes("recipe_favorites")) return [[{recipe_id:20,name:"Salad",calories:null}]];
 if(sql.includes("community_reactions")) return [[{post_id:30,title:"Bài đã lưu",visibility:"PUBLIC"}]];
 return [[{post_id:40,title:"Nhật ký riêng",visibility:"PRIVATE"}]];
}}};
const {getActivity}=require("../src/services/activityService");
test("activity queries only the requested owner and respects saved post visibility",async()=>{
 const result=await getActivity(7);
 assert.deepEqual(calls.map(call=>call.values),[[7],[7],[7,7],[7]]);
 assert.match(calls[0].sql,/h\.history_id,h\.servings,h\.rating,h\.note/);
 assert.match(calls[2].sql,/s\.kind='save' AND \(p\.visibility='PUBLIC' OR p\.user_id=\?\)/);
 assert.match(calls[3].sql,/WHERE p\.user_id=\?/);
 assert.equal(result.cooked[0].id,"10");
 assert.equal(result.cooked[0].cookCount,3);
 assert.equal(result.cooked[0].history.length,3);
 assert.equal(result.cooked[0].history[0].rating,5);
 assert.equal(result.cooked[0].history[0].note,"Ít muối");
 assert.equal(result.cooked[0].history[1].rating,null);
 assert.equal(result.cooked[0].minutes,15);
 assert.equal(result.savedRecipes[0].calories,null);
 assert.equal(result.savedPosts[0].kind,"post");
 assert.equal(result.shared[0].visibility,"PRIVATE");
});
