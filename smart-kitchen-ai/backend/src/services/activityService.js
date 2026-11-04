// Backend: Danh sách món đã nấu, công thức/bài đã lưu và bài do tài khoản đăng.
const db = require("../config/db");
const recipeCard = row => ({
  id: String(row.recipe_id), kind: "recipe", title: row.name, image: row.image_url || "",
  minutes: Number(row.prep_time || 0) + Number(row.cook_time || 0),
  calories: row.calories == null ? null : Number(row.calories),
  cookedAt: row.cooked_at || null, cookCount: Number(row.cook_count || 0),
});
const postCard = row => ({
  id: String(row.post_id), kind: "post", title: row.title, image: row.image_url || "",
  author: row.full_name, visibility: row.visibility, createdAt: row.created_at,
});
async function getActivity(userId) {
  const [[cooked], [savedRecipes], [savedPosts], [shared]] = await Promise.all([
    db.query(`SELECT r.recipe_id, r.name, r.image_url, r.prep_time, r.cook_time, r.calories,
      h.history_id,h.servings,h.rating,h.note,h.plan_item_id,h.cooked_at
      FROM cooking_history h JOIN recipes r ON r.recipe_id=h.recipe_id WHERE h.user_id=?
      ORDER BY h.cooked_at DESC,h.history_id DESC`, [userId]),
    db.query(`SELECT r.recipe_id, r.name, r.image_url, r.prep_time, r.cook_time, r.calories
      FROM recipe_favorites f JOIN recipes r ON r.recipe_id=f.recipe_id
      WHERE f.user_id=? ORDER BY r.name, r.recipe_id`, [userId]),
    db.query(`SELECT p.post_id,p.title,p.image_url,p.visibility,p.created_at,u.full_name
      FROM community_reactions s JOIN community_posts p ON p.post_id=s.post_id
      JOIN users u ON u.user_id=p.user_id
      WHERE s.user_id=? AND s.kind='save' AND (p.visibility='PUBLIC' OR p.user_id=?)
      ORDER BY p.created_at DESC,p.post_id DESC`, [userId,userId]),
    db.query(`SELECT p.post_id,p.title,p.image_url,p.visibility,p.created_at,u.full_name
      FROM community_posts p JOIN users u ON u.user_id=p.user_id
      WHERE p.user_id=? ORDER BY p.created_at DESC,p.post_id DESC`, [userId]),
  ]);
  const byRecipe = new Map();
  for(const row of cooked) {
    const key=String(row.recipe_id);
    if(!byRecipe.has(key)) byRecipe.set(key,{...recipeCard(row),cookCount:0,history:[]});
    const card=byRecipe.get(key);
    card.cookCount++;
    card.history.push({id:String(row.history_id),servings:Number(row.servings),rating:row.rating==null ? null : Number(row.rating),note:row.note||"",planItemId:row.plan_item_id==null ? null : String(row.plan_item_id),cookedAt:row.cooked_at});
  }
  return { cooked:[...byRecipe.values()], savedRecipes:savedRecipes.map(recipeCard), savedPosts:savedPosts.map(postCard), shared:shared.map(postCard) };
}
module.exports = { getActivity };
