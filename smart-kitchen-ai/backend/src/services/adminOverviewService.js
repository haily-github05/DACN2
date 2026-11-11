const db = require('../config/db');

async function getOverview(days) {
  const windowDays = days - 1;
  const [[counts], [calendar], [userDays], [cookingDays], [groups], [recipes], [events]] = await Promise.all([
    db.query(`SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM recipes WHERE is_active=1) AS recipes,
      (SELECT COUNT(*) FROM ingredients) AS ingredients,
      (SELECT COUNT(*) FROM community_posts) AS posts,
      (SELECT COUNT(*) FROM community_comments) AS comments,
      (SELECT COUNT(*) FROM cooking_history) AS cooked,
      (SELECT COUNT(*) FROM users WHERE created_at>=DATE_SUB(CURDATE(), INTERVAL ? DAY) AND created_at<DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS new_users,
      (SELECT COUNT(*) FROM recipes WHERE is_active=1 AND created_at>=DATE_SUB(CURDATE(), INTERVAL ? DAY) AND created_at<DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS new_recipes,
      (SELECT COUNT(*) FROM ingredients WHERE created_at>=DATE_SUB(CURDATE(), INTERVAL ? DAY) AND created_at<DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS new_ingredients,
      (SELECT COUNT(*) FROM community_posts WHERE created_at>=DATE_SUB(CURDATE(), INTERVAL ? DAY) AND created_at<DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS new_posts,
      (SELECT COUNT(*) FROM community_comments WHERE created_at>=DATE_SUB(CURDATE(), INTERVAL ? DAY) AND created_at<DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS new_comments,
      (SELECT COUNT(*) FROM cooking_history WHERE cooked_at>=DATE_SUB(CURDATE(), INTERVAL ? DAY) AND cooked_at<DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS new_cooked`, Array(6).fill(windowDays)),
    db.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today"),
    db.query(`SELECT DATE_FORMAT(created_at,'%Y-%m-%d') AS day, COUNT(*) AS count FROM users
      WHERE created_at>=DATE_SUB(CURDATE(), INTERVAL ? DAY) AND created_at<DATE_ADD(CURDATE(), INTERVAL 1 DAY) GROUP BY day`, [windowDays]),
    db.query(`SELECT DATE_FORMAT(cooked_at,'%Y-%m-%d') AS day, COUNT(*) AS count FROM cooking_history
      WHERE cooked_at>=DATE_SUB(CURDATE(), INTERVAL ? DAY) AND cooked_at<DATE_ADD(CURDATE(), INTERVAL 1 DAY) GROUP BY day`, [windowDays]),
    db.query(`SELECT COALESCE(NULLIF(TRIM(cuisine_type),''),NULLIF(TRIM(region),''),'Chưa phân loại') AS category_name, COUNT(*) AS count
      FROM recipes WHERE is_active=1 GROUP BY category_name ORDER BY count DESC, category_name LIMIT 5`),
    db.query(`SELECT recipe_id,name,description,image_url,cuisine_type,region,is_active,created_at,
      (SELECT COUNT(*) FROM recipe_ingredients i WHERE i.recipe_id=r.recipe_id) AS ingredient_count
      FROM recipes r ORDER BY created_at DESC,recipe_id DESC LIMIT 100`),
    db.query(`SELECT * FROM (
      (SELECT CONCAT('user-',user_id) AS id,'user' AS type,full_name AS title,'Đăng ký tài khoản' AS body,created_at AS time
        FROM users ORDER BY created_at DESC,user_id DESC LIMIT 10)
      UNION ALL
      (SELECT CONCAT('recipe-',recipe_id),'recipe',name,'Thêm công thức vào hệ thống',created_at
        FROM recipes ORDER BY created_at DESC,recipe_id DESC LIMIT 10)
      UNION ALL
      (SELECT CONCAT('post-',post_id),'post',title,'Chia sẻ bài viết công khai',created_at
        FROM community_posts WHERE visibility='PUBLIC' AND moderation_status='APPROVED' ORDER BY created_at DESC,post_id DESC LIMIT 10)
      UNION ALL
      (SELECT CONCAT('cooking-',h.history_id),'cooking',r.name,'Hoàn thành nấu ăn',h.cooked_at
        FROM cooking_history h JOIN recipes r ON r.recipe_id=h.recipe_id ORDER BY h.cooked_at DESC,h.history_id DESC LIMIT 10)
      ) activity ORDER BY time DESC,id DESC LIMIT 10`),
  ]);
  const c = counts[0];
  const userMap = new Map(userDays.map(row => [row.day, Number(row.count)]));
  const cookingMap = new Map(cookingDays.map(row => [row.day, Number(row.count)]));
  const today = calendar[0].today;
  const trends = Array.from({ length: days }, (_, index) => {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - windowDays + index);
    const day = date.toISOString().slice(0, 10);
    return { day, users: userMap.get(day) || 0, cooked: cookingMap.get(day) || 0 };
  });
  const totalRecipes = Number(c.recipes);
  return {
    days, today,
    stats: [
      { key: 'users', label: 'Tổng người dùng', value: Number(c.users), added: Number(c.new_users) },
      { key: 'recipes', label: 'Công thức hoạt động', value: totalRecipes, added: Number(c.new_recipes) },
      { key: 'ingredients', label: 'Danh mục nguyên liệu', value: Number(c.ingredients), added: Number(c.new_ingredients) },
      { key: 'community', label: 'Bài viết & Bình luận', value: Number(c.posts) + Number(c.comments), added: Number(c.new_posts) + Number(c.new_comments) },
      { key: 'cooked', label: 'Lượt hoàn thành nấu', value: Number(c.cooked), added: Number(c.new_cooked) },
    ],
    trends,
    categories: groups.map(row => ({ name: row.category_name, count: Number(row.count), percent: totalRecipes ? Math.round(Number(row.count) / totalRecipes * 1000) / 10 : 0 })),
    recipes: recipes.map(row => ({ id: String(row.recipe_id), name: row.name, description: row.description || '', image: row.image_url || '', category: row.cuisine_type || row.region || 'Chưa phân loại', active: Number(row.is_active) === 1, createdAt: row.created_at, ingredientCount: Number(row.ingredient_count) })),
    events: events.map(row => ({ ...row, id: String(row.id) })),
    ai: { configured: false, message: 'Chưa cấu hình' },
  };
}
module.exports = { getOverview };
