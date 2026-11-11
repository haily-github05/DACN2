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
 if(sql.includes("FROM community_comments c")) return [[
  {comment_id:10,post_id:3,title:"Salad nhà làm",content:"Món ngon quá",actor:"An",post_author:7,parent_author:null,created_at:"2026-11-05T10:00:00"},
  {comment_id:11,post_id:9,title:"Canh rau",content:"Cảm ơn bạn",actor:"Bình",post_author:8,parent_author:7,created_at:"2026-11-05T11:00:00"},
 ]];
 if(sql.includes("reviewed_at IS NOT NULL")) return [[
  {post_id:8,title:"Bài bị từ chối",moderation_status:"REJECTED",rejection_reason:"Nội dung không phù hợp",reviewed_at:"2026-11-11T08:00:00Z"},
  {post_id:9,title:"Bài đã duyệt",moderation_status:"APPROVED",reviewed_at:"2026-11-11T09:00:00Z"}
 ]];
 if(sql.includes("FROM community_posts")) return [[{post_id:3,title:"Salad nhà làm",likes:2,image_url:"/uploads/posts/image.jpg"}]];
 return [[{shopping_list_id:4,shopping_item_id:8,name:"Trứng"},{shopping_list_id:4,shopping_item_id:9,name:"Tỏi"}]];
}}};
const {getNotifications}=require("../src/services/notificationService");
test("notification sources always use the requested owner and actionable records",async()=>{
 const result=await getNotifications(7);
 assert.deepEqual(calls.map(call=>call.params),[[7],[7],[7],[7],[7,7,7,7],[7]]);
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

test("social notifications link to owned posts and replies without duplicate events",async()=>{
 const result=await getNotifications(7);
 const comment=result.find(n=>n.id==='comment:10');
 const reply=result.find(n=>n.id==='comment:11');
 assert.match(comment.title,/bình luận bài viết của bạn/);
 assert.match(reply.title,/trả lời bình luận của bạn/);
 assert.deepEqual(reply.params,{id:'9'});
 assert.equal(reply.route,'/post-detail');
 assert.equal(result.filter(n=>n.id==='comment:11').length,1);
 const sql=calls.find(c=>c.sql.includes('FROM community_comments c')).sql;
 assert.match(sql,/c.user_id<>\?/);
 assert.match(sql,/p.user_id=\? OR parent.user_id=\?/);
 assert.match(sql,/p.visibility='PUBLIC' AND p.moderation_status='APPROVED'\) OR p.user_id=\?/);
});

test('moderation results notify only the owner with the rejection reason and stable identifiers',async()=>{
 const rows=await getNotifications(7);
 const rejected=rows.find(row=>row.id.startsWith('moderation:8:REJECTED:'));
 assert(rejected);assert.match(rejected.body,/không được đăng lên cộng đồng/);assert.match(rejected.body,/Nội dung không phù hợp/);assert.equal(rejected.action,'Xem lý do từ chối');assert.deepEqual(rejected.params,{id:'8'});
 assert(rows.some(row=>row.id.startsWith('moderation:9:APPROVED:')));
 const again=await getNotifications(7);assert.equal(again.find(row=>row.id.startsWith('moderation:8:')).id,rejected.id);
 const sql=calls.find(call=>call.sql.includes('reviewed_at IS NOT NULL'));assert.deepEqual(sql.params,[7]);assert.match(sql.sql,/WHERE user_id=\?/);
});
