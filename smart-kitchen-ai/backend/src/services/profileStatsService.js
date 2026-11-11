// Backend: Tính số món đã nấu, công thức đã lưu, bài đã chia sẻ và chuỗi ngày vào bếp.
const db = require("../config/db");

function cookingStreak(offsets) {
  const days = [...new Set(offsets.map(Number))].filter(day => day >= 0).sort((a, b) => a - b);
  if (!days.length || days[0] > 1) return 0;
  let streak = 0;
  const start = days[0];
  for (const day of days) {
    if (day !== start + streak) break;
    streak++;
  }
  return streak;
}

async function getProfileStats(userId) {
  const [rows] = await db.query(`SELECT
    (SELECT COUNT(DISTINCT recipe_id) FROM cooking_history WHERE user_id=?) AS cooked,
    ((SELECT COUNT(*) FROM recipe_favorites f JOIN recipes r ON r.recipe_id=f.recipe_id WHERE f.user_id=?)
      + (SELECT COUNT(*) FROM community_reactions s JOIN community_posts p ON p.post_id=s.post_id
          WHERE s.user_id=? AND s.kind='save' AND ((p.visibility='PUBLIC' AND p.moderation_status='APPROVED') OR p.user_id=?))) AS saved,
    (SELECT COUNT(*) FROM community_posts WHERE user_id=? AND visibility='PUBLIC' AND moderation_status='APPROVED') AS shared`, [userId, userId, userId, userId, userId]);
  const [days] = await db.query(`SELECT DISTINCT DATEDIFF(CURDATE(), cooked_at) AS days_ago
    FROM cooking_history WHERE user_id=? AND cooked_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    ORDER BY days_ago`, [userId]);
  return {
    cooked: Number(rows[0].cooked),
    saved: Number(rows[0].saved),
    shared: Number(rows[0].shared),
    streak: cookingStreak(days.map(day => day.days_ago)),
  };
}
module.exports = { getProfileStats, cookingStreak };
