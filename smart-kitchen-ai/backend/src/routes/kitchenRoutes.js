const { requirePostUser } = require("../services/sessionService");
// Backend: API công thức, kho, mua sắm, thực đơn, cộng đồng và lưu món đã nấu.
const { getRecommendations } = require("../services/recipeRecommendationService");
const express = require("express");
const db = require("../config/db");
const router = express.Router();
router.use("/:userId/posts", requirePostUser);
router.use("/:userId/activity", requirePostUser);
router.use("/:userId/notifications", requirePostUser);
router.use("/:userId/ingredients", requirePostUser);
const fail = (message) => Object.assign(new Error(message), { status: 400 });
const id = (value) => { const n = Number(value); if (!Number.isSafeInteger(n) || n <= 0) throw fail("ID không hợp lệ"); return n; };
const text = (value, max) => { if (typeof value !== "string" || !value.trim() || value.length > max) throw fail("Thông tin không hợp lệ"); return value.trim(); };
const amount = (value) => { const n = Number(value); if (!Number.isFinite(n) || n <= 0 || n > 99999999) throw fail("Số lượng không hợp lệ"); return n; };
const date = (value) => { if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) throw fail("Ngày không hợp lệ"); return value; };
const route = (fn) => async (req, res, next) => { try { await fn(req, res); } catch (err) { next(err); } };
async function transaction(fn) {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const data = await fn(conn); await conn.commit(); return data; }
  catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}
async function ingredient(conn, item) {
  if(item.ingredientId) {
    const [catalog]=await conn.query("SELECT ingredient_id FROM ingredients WHERE ingredient_id=?",[id(item.ingredientId)]);
    if(!catalog.length) throw fail("Nguyên liệu không còn trong danh mục");
    return catalog[0].ingredient_id;
  }
  const name = text(item.name, 100), unit = text(item.unit, 20);
  // Tên là duy nhất trong danh mục; đơn vị của từng lần mua được lưu ở pantry_items.
  const lookup = "SELECT ingredient_id FROM ingredients WHERE name = ? LIMIT 1";
  const [rows] = await conn.query(lookup, [name]);
  if (rows.length) return rows[0].ingredient_id;
  try {
    const [result] = await conn.query("INSERT INTO ingredients (name, category, default_unit) VALUES (?, ?, ?)", [name, text(item.category || "Khác", 50), unit]);
    return result.insertId;
  } catch (error) {
    if (error.code !== "ER_DUP_ENTRY") throw error;
    // Một yêu cầu khác có thể vừa tạo cùng tên; đọc bản ghi đã commit mới nhất.
    const [existing] = await conn.query(`${lookup} FOR UPDATE`, [name]);
    if (!existing.length) throw error;
    return existing[0].ingredient_id;
  }
}
// All user resources are scoped using the same user identifier as the existing profile API.
router.param("userId", (req, res, next, value) => { try { req.userId = id(value); next(); } catch (err) { next(err); } });
for (const method of ["post", "put"]) {
  router[method](method === "post" ? "/:userId/pantry" : "/:userId/pantry/:itemId", route(async (req, res) => {
    const item = req.body;
    const quantity = amount(item.quantity), unit = text(item.unit, 20);
    const purchased = date(item.purchaseDate), expiry = date(item.expiryDate);
    if (expiry < purchased) throw fail("Hạn sử dụng phải sau ngày mua");
    const location = text(item.location, 30);
    const image=item.image;
    if(image!==undefined && image!==null && (typeof image!=="string" || image.length>500 || (image && !/^https?:\/\//.test(image) && !/^\/uploads\/(?:pantry|ingredients)\/[a-zA-Z0-9_.-]+$/.test(image)))) throw fail("Ảnh nguyên liệu không hợp lệ");
    const imageValue=image || null;
    if (typeof item.note !== "string" || item.note.length > 2000) throw fail("Ghi chú không hợp lệ");
    const data = await transaction(async conn => {
      if (method === "put") {
        const [rows] = await conn.query("SELECT pantry_item_id FROM pantry_items WHERE pantry_item_id = ? AND user_id = ? FOR UPDATE", [id(req.params.itemId), req.userId]);
        if (!rows.length) throw Object.assign(new Error("Không tìm thấy nguyên liệu"), { status: 404 });
      }
      if (method === "post" && item.mergeExisting === true) {
        // Khóa theo tài khoản để hai lần thêm đồng thời không cùng tạo đợt mới.
        const [users] = await conn.query("SELECT user_id FROM users WHERE user_id=? FOR UPDATE", [req.userId]);
        if (!users.length) throw fail("Không tìm thấy người dùng");
      }
      const ingredientId = await ingredient(conn, item);
      const values = [ingredientId, quantity, unit, location, purchased, expiry, item.note];
      if (method === "post") {
        if (item.mergeExisting === true) {
          const [matches] = await conn.query(`SELECT pantry_item_id, quantity FROM pantry_items
            WHERE user_id=? AND ingredient_id=? AND unit=? AND storage_location=?
              AND purchase_date=? AND expiry_date=? AND COALESCE(note, '')=?
            ORDER BY pantry_item_id LIMIT 1 FOR UPDATE`, [req.userId, ingredientId, unit, location, purchased, expiry, item.note]);
          if (matches.length) {
            amount(Number(matches[0].quantity) + quantity);
            await conn.query(`UPDATE pantry_items SET quantity=quantity+?,
              image_url=COALESCE(?, image_url), updated_at=NOW()
              WHERE pantry_item_id=? AND user_id=?`, [quantity, imageValue, matches[0].pantry_item_id, req.userId]);
            return { id: matches[0].pantry_item_id, merged: true };
          }
        }
        const [r] = await conn.query("INSERT INTO pantry_items (ingredient_id, quantity, unit, storage_location, purchase_date, expiry_date, note, user_id, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [...values, req.userId, imageValue]);
        return { id: r.insertId };
      }
      await conn.query("UPDATE pantry_items SET ingredient_id=?, quantity=?, unit=?, storage_location=?, purchase_date=?, expiry_date=?, note=?, image_url=CASE WHEN ? THEN ? ELSE image_url END, updated_at=NOW() WHERE pantry_item_id=? AND user_id=?", [...values, image!==undefined, imageValue, id(req.params.itemId), req.userId]);
      return { id: Number(req.params.itemId) };
    });
    res.json({ success: true, data });
  }));
}
router.delete("/:userId/pantry/:itemId", route(async (req, res) => {
  const [r] = await db.query("DELETE FROM pantry_items WHERE user_id=? AND pantry_item_id=?", [req.userId, id(req.params.itemId)]);
  if (!r.affectedRows) return res.status(404).json({ success: false, message: "Không tìm thấy nguyên liệu" });
  res.json({ success: true, data: null });
}));
router.get("/:userId/ingredients",route(async(req,res)=>{
  const [rows]=await db.query("SELECT i.ingredient_id,i.name,i.category,i.default_unit,i.image_url, (SELECT COUNT(*) FROM pantry_items p WHERE p.ingredient_id=i.ingredient_id AND p.user_id=? AND p.quantity>0) AS pantry_count FROM ingredients i ORDER BY i.name,i.ingredient_id",[req.userId]);
  res.json({success:true,data:rows.map(i=>({id:String(i.ingredient_id),name:i.name,category:i.category||"Khác",unit:i.default_unit,image:i.image_url||"",inPantry:Number(i.pantry_count)>0}))});
}));
async function recipeList(req, res) {
  const [recipes] = await db.query("SELECT * FROM recipes WHERE is_active = 1 ORDER BY recipe_id DESC");
  const [ingredients] = await db.query(`SELECT ri.*, i.name, COALESCE((SELECT SUM(p.quantity) FROM pantry_items p WHERE p.user_id=? AND p.ingredient_id=ri.ingredient_id AND p.unit=ri.unit AND (p.expiry_date IS NULL OR p.expiry_date >= CURDATE())),0) AS available_quantity FROM recipe_ingredients ri JOIN ingredients i ON i.ingredient_id=ri.ingredient_id`, [req.userId || 0]);
  const [steps] = await db.query("SELECT * FROM recipe_steps ORDER BY step_number");
  const recommended = req.userId ? await getRecommendations(req.userId, recipes, ingredients) : recipes;
  res.json({ success: true, data: recommended.map(r => {
    const items = ingredients.filter(i => i.recipe_id === r.recipe_id).map(i => ({ id: String(i.ingredient_id), name: i.name, amount: Number(i.quantity), unit: i.unit, available: Number(i.available_quantity) >= Number(i.quantity) }));
    return { preferenceInfo: r.preferenceInfo, id: String(r.recipe_id), name: r.name, description: r.description || "", image: r.image_url || "", minutes: Number(r.prep_time || 0) + Number(r.cook_time || 0), calories: r.calories == null ? null : Number(r.calories), defaultServings: Number(r.default_servings || 1), category: r.cuisine_type || r.region || "Khác", region: r.region || "", match: items.length ? Math.round(items.filter(i=>i.available).length / items.length * 100) : 0, ingredients: items, steps: steps.filter(s => s.recipe_id === r.recipe_id).map(s => ({ title: `Bước ${s.step_number}`, description: s.instruction })) };
  }) });
}
router.get("/public-recipes", route(recipeList));
router.get("/:userId/recipes", route(recipeList));
router.get("/public-ingredients", route(async (req,res)=>{
 const [rows]=await db.query("SELECT ingredient_id,name,category,default_unit,image_url FROM ingredients ORDER BY name");
 res.json({success:true,data:rows.map(i=>({id:String(i.ingredient_id),name:i.name,category:i.category||"Khác",unit:i.default_unit,image:i.image_url||"",inPantry:false}))});
}));

router.get("/:userId/shopping", route(async (req, res) => {
  const [rows] = await db.query(`SELECT s.shopping_item_id AS id, i.name, i.category, s.quantity_to_buy, s.unit, s.is_purchased, s.note FROM shopping_list_items s JOIN shopping_lists l ON l.shopping_list_id=s.shopping_list_id JOIN ingredients i ON i.ingredient_id=s.ingredient_id WHERE l.user_id=? AND l.status='ACTIVE' ORDER BY s.shopping_item_id`, [req.userId]);
  res.json({ success: true, data: rows.map(r=>({ id:String(r.id), name:r.name, category:r.category || "Khác", quantity:`${Number(r.quantity_to_buy)} ${r.unit}`, checked:!!r.is_purchased, reason:r.note || "" })) });
}));
router.post("/:userId/shopping", route(async (req, res) => {
  const item=req.body, match=String(item.quantity).trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) throw fail("Nhập số lượng kèm đơn vị, ví dụ 300 g");
  const quantity=amount(match[1].replace(",", ".")), unit=text(match[2] || "phần",20);
  const data=await transaction(async conn=>{
    const ingredientId=await ingredient(conn,{ ...item, unit });
    const [users]=await conn.query("SELECT user_id FROM users WHERE user_id=? FOR UPDATE",[req.userId]);
    if (!users.length) throw fail("Không tìm thấy người dùng");
    const [lists]=await conn.query("SELECT shopping_list_id FROM shopping_lists WHERE user_id=? AND status='ACTIVE' ORDER BY shopping_list_id LIMIT 1",[req.userId]);
    let listId=lists[0]?.shopping_list_id;
    if (!listId) { const [r]=await conn.query("INSERT INTO shopping_lists (user_id,list_name) VALUES (?,?)",[req.userId,"Danh sách mua sắm"]); listId=r.insertId; }
    const [r]=await conn.query("INSERT INTO shopping_list_items (shopping_list_id,ingredient_id,required_quantity,quantity_to_buy,unit,note) VALUES (?,?,?,?,?,?)",[listId,ingredientId,quantity,quantity,unit,text(item.reason || "Thêm thủ công",255)]);
    return { ...item, id:String(r.insertId), quantity:`${quantity} ${unit}`, checked:false };
  });
  res.json({ success:true, data });
}));
router.patch("/:userId/shopping/:itemId", route(async (req,res)=>{
  if (typeof req.body.checked !== "boolean") throw fail("Trạng thái không hợp lệ");
  await db.query("UPDATE shopping_list_items s JOIN shopping_lists l ON l.shopping_list_id=s.shopping_list_id SET s.is_purchased=? WHERE l.user_id=? AND s.shopping_item_id=?",[req.body.checked,req.userId,id(req.params.itemId)]);
  res.json({success:true,data:null});
}));
router.delete("/:userId/shopping/:itemId",route(async(req,res)=>{
  await db.query("DELETE s FROM shopping_list_items s JOIN shopping_lists l ON l.shopping_list_id=s.shopping_list_id WHERE l.user_id=? AND s.shopping_item_id=?",[req.userId,id(req.params.itemId)]);
  res.json({success:true,data:null});
}));
router.get("/:userId/plans",route(async(req,res)=>{
  const [rows]=await db.query(`SELECT DATE_FORMAT(i.meal_date,'%Y-%m-%d') AS day, LOWER(i.meal_type) AS type, r.recipe_id, r.name, r.prep_time, r.cook_time, r.calories FROM meal_plan_items i JOIN meal_plans p ON p.meal_plan_id=i.meal_plan_id JOIN recipes r ON r.recipe_id=i.recipe_id WHERE p.user_id=? ORDER BY i.plan_item_id`,[req.userId]);
  const data={};
  const permitted = await getRecommendations(req.userId, rows);
  for(const r of permitted) { data[r.day] ||= {breakfast:[],lunch:[],dinner:[]}; data[r.day][r.type].push({id:String(r.recipe_id),name:r.name,minutes:Number(r.prep_time||0)+Number(r.cook_time||0),calories:r.calories == null ? null : Number(r.calories)}); }
  res.json({success:true,data});
}));
router.put("/:userId/plans",route(async(req,res)=>{
  const days=Object.entries(req.body);
  if (!days.length || days.length>7) throw fail("Chỉ lưu tối đa một tuần mỗi lần");
  const mealItems = value => value == null ? [] : Array.isArray(value) ? value : [value];
  for (const [day,plan] of days) {
    date(day);
    if (!plan || typeof plan!=="object" || Array.isArray(plan)) throw fail("Thực đơn không hợp lệ");
    for (const type of ["breakfast","lunch","dinner"]) {
      const items = mealItems(plan[type]);
      if (items.length > 6) throw fail("Mỗi buổi tối đa 6 món");
      const ids = items.map(item => id(item?.id));
      if (new Set(ids).size !== ids.length) throw fail("Món ăn bị trùng trong cùng buổi");
    }
  }
  const [availableRecipes] = await db.query("SELECT recipe_id FROM recipes WHERE is_active=1");
  const allowed = new Set((await getRecommendations(req.userId, availableRecipes)).map(r => String(r.recipe_id)));
  for (const [,plan] of days) for (const type of ["breakfast","lunch","dinner"]) {
    for (const item of mealItems(plan[type])) if (!allowed.has(String(item.id))) throw fail("Món ăn không phù hợp với thiết lập dị ứng hiện tại hoặc chưa đủ dữ liệu nguyên liệu. Hãy tải lại gợi ý.");
  }
  await transaction(async conn=>{
    const [users]=await conn.query("SELECT user_id FROM users WHERE user_id=? FOR UPDATE",[req.userId]);
    if(!users.length) throw fail("Không tìm thấy người dùng");
    const sorted=days.map(([d])=>d).sort();
    const [p]=await conn.query("INSERT INTO meal_plans (user_id,plan_name,start_date,end_date) VALUES (?,?,?,?)",[req.userId,"Thực đơn",sorted[0],sorted[sorted.length-1]]);
    for(const [day,plan] of days) {
      await conn.query("DELETE i FROM meal_plan_items i JOIN meal_plans p ON p.meal_plan_id=i.meal_plan_id WHERE p.user_id=? AND i.meal_date=?",[req.userId,day]);
      for(const type of ["breakfast","lunch","dinner"]) for (const item of mealItems(plan[type])) await conn.query("INSERT INTO meal_plan_items (meal_plan_id,meal_date,meal_type,recipe_id) VALUES (?,?,?,?)",[p.insertId,day,type.toUpperCase(),id(item.id)]);
    }
  });
  res.json({success:true,data:null});
}));
router.post("/:userId/shopping/transfer", route(async(req,res)=>{
  const data=await transaction(async conn=>{
    const [rows]=await conn.query("SELECT s.* FROM shopping_list_items s JOIN shopping_lists l ON l.shopping_list_id=s.shopping_list_id WHERE l.user_id=? AND l.status='ACTIVE' AND s.is_purchased=1 FOR UPDATE",[req.userId]);
    for(const item of rows) {
      await conn.query("INSERT INTO pantry_items (user_id,ingredient_id,quantity,unit,storage_location,purchase_date) VALUES (?,?,?,?,?,CURDATE())",[req.userId,item.ingredient_id,item.quantity_to_buy,item.unit,"Ngăn mát"]);
      await conn.query("DELETE FROM shopping_list_items WHERE shopping_item_id=?",[item.shopping_item_id]);
    }
    return {count:rows.length};
  });
  res.json({success:true,data});
}));
router.get("/:userId/favorites",route(async(req,res)=>{
  const [rows]=await db.query("SELECT recipe_id FROM recipe_favorites WHERE user_id=?",[req.userId]);
  res.json({success:true,data:rows.map(r=>String(r.recipe_id))});
}));
router.put("/:userId/favorites/:recipeId",route(async(req,res)=>{
  if(typeof req.body.saved!=="boolean") throw fail("Trạng thái không hợp lệ");
  const recipeId=id(req.params.recipeId);
  if(req.body.saved) await db.query("INSERT IGNORE INTO recipe_favorites (user_id,recipe_id) SELECT ?,recipe_id FROM recipes WHERE recipe_id=?",[req.userId,recipeId]);
  else await db.query("DELETE FROM recipe_favorites WHERE user_id=? AND recipe_id=?",[req.userId,recipeId]);
  res.json({success:true,data:null});
}));
router.get("/:userId/notifications",route(async(req,res)=>{
  res.json({success:true,data:await require("../services/notificationService").getNotifications(req.userId)});
}));
router.get("/:userId/activity",route(async(req,res)=>{
  const data=await require("../services/activityService").getActivity(req.userId);
  res.json({success:true,data});
}));
async function listPosts(req,res) {
  const viewer=req.userId || 0;
  const postId=req.query.id === undefined ? null : id(req.query.id);
  const [rows]=await db.query(`SELECT p.*, u.full_name AS author, u.avatar_url AS author_avatar,
    (SELECT COUNT(*) FROM community_reactions r WHERE r.post_id=p.post_id AND r.kind='like') AS likes,
    EXISTS(SELECT 1 FROM community_reactions r WHERE r.post_id=p.post_id AND r.user_id=? AND r.kind='like') AS liked,
    EXISTS(SELECT 1 FROM community_reactions r WHERE r.post_id=p.post_id AND r.user_id=? AND r.kind='save') AS saved,
    (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.post_id) AS comments,
    EXISTS(SELECT 1 FROM user_follows f WHERE f.follower_id=? AND f.followed_id=p.user_id) AS following
    FROM community_posts p JOIN users u ON u.user_id=p.user_id WHERE (p.visibility='PUBLIC' OR p.user_id=?) ${postId ? "AND p.post_id=?" : ""} ORDER BY p.post_id DESC LIMIT 100`,[viewer,viewer,viewer,viewer,...(postId ? [postId] : [])]);
  res.json({success:true,data:rows.map(r=>({id:String(r.post_id),isOwner:Number(r.user_id)===req.userId,author:r.author,avatar:r.author_avatar||null,initials:r.author.split(/\s+/).map(s=>s[0]).slice(-2).join(""),title:r.title,description:r.description,visibility:r.visibility,category:r.category,image:r.image_url||"",time:r.created_at,likes:Number(r.likes),comments:Number(r.comments||0),following:!!r.following,liked:!!r.liked,saved:!!r.saved}))});
}
router.get("/public-posts",route(listPosts));
router.get("/:userId/posts",route(listPosts));

router.post("/:userId/posts",route(async(req,res)=>{
  const p=req.body, title=text(p.title,150),description=text(p.description,10000),category=text(p.category,50);
  const image=p.image || "";
  const visibility=p.visibility ?? "PUBLIC";
  if(!["PUBLIC","PRIVATE"].includes(visibility)) throw fail("Chế độ hiển thị không hợp lệ");
  if(typeof image!=="string" || image.length>500 || (image && !/^https?:\/\//.test(image) && !/^\/uploads\/posts\/(?:[0-9]+_)?[a-f0-9-]+\.(jpg|png|webp)$/.test(image))) throw fail("Đường dẫn ảnh không hợp lệ");
  if(image.startsWith("/uploads/posts/")) {
    const owner=image.match(/^\/uploads\/posts\/([0-9]+)_/);
    if(owner && Number(owner[1])!==req.userId) throw Object.assign(new Error("Không có quyền dùng ảnh này"),{status:403});
    if(!owner) {
      const [owned]=await db.query("SELECT post_id FROM community_posts WHERE image_url=? AND user_id=? LIMIT 1",[image,req.userId]);
      if(!owned.length) throw fail("Vui lòng chọn lại ảnh bìa để tải lên cho tài khoản của bạn");
    }
  }
  const [r]=await db.query("INSERT INTO community_posts (user_id,title,description,category,image_url,visibility) VALUES (?,?,?,?,?,?)",[req.userId,title,description,category,image,visibility]);
  res.json({success:true,data:{id:String(r.insertId)}});
}));
router.delete("/:userId/posts/:postId",route(async(req,res)=>{
  const [result] = await db.query("DELETE FROM community_posts WHERE post_id=? AND user_id=?", [id(req.params.postId), req.userId]);
  if (!result.affectedRows) throw Object.assign(new Error("Không tìm thấy bài viết của bạn"), {status:404});
  // community_reactions được xoá theo khóa ngoại ON DELETE CASCADE.
  res.json({success:true,data:null});
}));
router.put("/:userId/posts/:postId/reactions",route(async(req,res)=>{
  const {kind,active}=req.body;
  if(!["like","save"].includes(kind)||typeof active!=="boolean") throw fail("Tương tác không hợp lệ");
  const [posts]=await db.query("SELECT post_id FROM community_posts WHERE post_id=? AND (visibility='PUBLIC' OR user_id=?)",[id(req.params.postId),req.userId]);
  if(!posts.length) return res.status(404).json({success:false,message:"Không tìm thấy bài viết"});
  if(active) await db.query("INSERT IGNORE INTO community_reactions (user_id,post_id,kind) VALUES (?,?,?)",[req.userId,id(req.params.postId),kind]);
  else await db.query("DELETE FROM community_reactions WHERE user_id=? AND post_id=? AND kind=?",[req.userId,id(req.params.postId),kind]);
  res.json({success:true,data:null});
}));
// Kiểm tra quyền xem bài cho mọi thao tác bình luận/theo dõi.
async function visiblePost(userId, postId) {
  userId ||= 0;
  const [rows] = await db.query("SELECT post_id,user_id FROM community_posts WHERE post_id=? AND (visibility='PUBLIC' OR user_id=?)", [id(postId), userId]);
  if (!rows.length) throw Object.assign(new Error("Không tìm thấy bài viết"), {status:404});
  return rows[0];
}
const commentData = (r, viewer) => ({ id:String(r.comment_id), parentId:r.parent_comment_id == null ? null : String(r.parent_comment_id), replyCount:Number(r.reply_count||0), author:r.author, avatar:r.avatar_url||null, initials:r.author.split(/\s+/).map(s=>s[0]).slice(-2).join(""), content:r.content, createdAt:r.created_at, isOwner:Number(r.user_id)===viewer });
async function listComments(req,res) {
  await visiblePost(req.userId, req.params.postId);
  const before = req.query.before === undefined ? null : id(req.query.before);
  const parentId = req.query.parentId === undefined ? null : id(req.query.parentId);
  const [rows] = await db.query(`SELECT c.*,u.full_name AS author,u.avatar_url,
    (SELECT COUNT(*) FROM community_comments reply WHERE reply.parent_comment_id=c.comment_id) AS reply_count
    FROM community_comments c JOIN users u ON u.user_id=c.user_id
    WHERE c.post_id=? AND ${parentId ? 'c.parent_comment_id=?' : 'c.parent_comment_id IS NULL'}
    ${before ? 'AND c.comment_id<?' : ''} ORDER BY c.comment_id DESC LIMIT 21`, [id(req.params.postId), ...(parentId ? [parentId] : []), ...(before ? [before] : [])]);
  res.json({success:true,data:{items:rows.slice(0,20).map(r=>commentData(r,req.userId)),hasMore:rows.length>20}});
}
router.get("/public-posts/:postId/comments",route(listComments));
router.get("/:userId/posts/:postId/comments",route(listComments));

router.post("/:userId/posts/:postId/comments",route(async(req,res)=>{
  const content = text(req.body.content,2000), postId = id(req.params.postId);
  if (req.body.parentId != null) {
    await visiblePost(req.userId, postId);
    const parentId = id(req.body.parentId);
    const [parents] = await db.query("SELECT comment_id,parent_comment_id FROM community_comments WHERE comment_id=? AND post_id=?",[parentId,postId]);
    if (!parents.length) throw Object.assign(new Error("Bình luận đã bị xoá hoặc không thuộc bài viết này"),{status:404});
    const rootId = parents[0].parent_comment_id || parents[0].comment_id;
    const [insert] = await db.query("INSERT INTO community_comments (post_id,user_id,content,parent_comment_id) SELECT p.post_id,?,?,c.comment_id FROM community_posts p JOIN community_comments c ON c.post_id=p.post_id WHERE p.post_id=? AND c.comment_id=? AND (p.visibility='PUBLIC' OR p.user_id=?)",[req.userId,content,postId,rootId,req.userId]);
    if (!insert.affectedRows) throw Object.assign(new Error("Bình luận không còn tồn tại"),{status:404});
    const [rows] = await db.query("SELECT c.*,u.full_name AS author,u.avatar_url FROM community_comments c JOIN users u ON u.user_id=c.user_id WHERE c.comment_id=?",[insert.insertId]);
    return res.json({success:true,data:commentData(rows[0],req.userId)});
  }
  const [result] = await db.query("INSERT INTO community_comments (post_id,user_id,content) SELECT post_id,?,? FROM community_posts WHERE post_id=? AND (visibility='PUBLIC' OR user_id=?)",[req.userId,content,postId,req.userId]);
  if (!result.affectedRows) throw Object.assign(new Error("Không tìm thấy bài viết"),{status:404});
  const [rows] = await db.query("SELECT c.*,u.full_name AS author,u.avatar_url FROM community_comments c JOIN users u ON u.user_id=c.user_id WHERE c.comment_id=?",[result.insertId]);
  res.json({success:true,data:commentData(rows[0],req.userId)});
}));
router.delete("/:userId/posts/:postId/comments/:commentId",route(async(req,res)=>{
  await visiblePost(req.userId,req.params.postId);
  const data = await transaction(async conn => {
    const commentId=id(req.params.commentId), postId=id(req.params.postId);
    const [owned] = await conn.query("SELECT comment_id FROM community_comments WHERE comment_id=? AND post_id=? AND user_id=? FOR UPDATE",[commentId,postId,req.userId]);
    if (!owned.length) throw Object.assign(new Error("Không tìm thấy bình luận của bạn"),{status:404});
    const [[children]] = await conn.query("SELECT COUNT(*) AS count FROM community_comments WHERE parent_comment_id=?",[commentId]);
    await conn.query("DELETE FROM community_comments WHERE comment_id=? AND post_id=? AND user_id=?",[commentId,postId,req.userId]);
    return {deletedCount:1+Number(children.count)};
  });
  res.json({success:true,data});
}));
router.put("/:userId/posts/:postId/follow",route(async(req,res)=>{
  if (typeof req.body.active!=="boolean") throw fail("Trạng thái theo dõi không hợp lệ");
  const post=await visiblePost(req.userId,req.params.postId);
  if (Number(post.user_id)===req.userId) throw fail("Bạn không thể theo dõi chính mình");
  if (req.body.active) await db.query("INSERT IGNORE INTO user_follows (follower_id,followed_id) VALUES (?,?)",[req.userId,post.user_id]);
  else await db.query("DELETE FROM user_follows WHERE follower_id=? AND followed_id=?",[req.userId,post.user_id]);
  res.json({success:true,data:{following:req.body.active}});
}));
router.post("/:userId/cooking",route(async(req,res)=>{
  const recipeId=id(req.body.recipeId), servings=id(req.body.servings);
  if(servings>100) throw fail("Khẩu phần không hợp lệ");
  const rating=req.body.rating ?? null;
  const note=req.body.note ?? "";
  if(rating!==null && (!Number.isInteger(rating) || rating<1 || rating>5)) throw fail("Đánh giá từ 1 đến 5 sao");
  if(typeof note!=="string" || note.length>2000) throw fail("Ghi chú tối đa 2000 ký tự");
  const [r]=await db.query("INSERT INTO cooking_history (user_id,recipe_id,servings,rating,note) SELECT ?,recipe_id,?,?,? FROM recipes WHERE recipe_id=?",[req.userId,servings,rating,note.trim()||null,recipeId]);
  if(!r.affectedRows) throw fail("Không tìm thấy công thức");
  res.json({success:true,data:{id:r.insertId}});
}));
router.post("/:userId/pantry/batch",route(async(req,res)=>{
  const items=req.body.items;
  if(!Array.isArray(items)||!items.length||items.length>100) throw fail("Danh sách nguyên liệu không hợp lệ");
  for(const i of items) { text(i.name,100); text(i.unit,20); amount(i.quantity); }
  await transaction(async conn=>{
    for(const i of items) {
      const ingredientId=await ingredient(conn,{...i,category:"Khác"});
      await conn.query("INSERT INTO pantry_items (user_id,ingredient_id,quantity,unit,storage_location,purchase_date) VALUES (?,?,?,?,?,CURDATE())",[req.userId,ingredientId,amount(i.quantity),text(i.unit,20),"Ngăn mát"]);
    }
  });
  res.json({success:true,data:{count:items.length}});
}));
router.use((err,req,res,next)=>{
  console.error("Kitchen API:",err.message);
  res.status(err.status || 500).json({success:false,message:err.status ? err.message : "Không thể xử lý dữ liệu MySQL. Vui lòng thử lại."});
});
module.exports=router;
