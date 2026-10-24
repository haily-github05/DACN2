
const express = require("express");
const router = express.Router();

// Chỉnh đường dẫn này nếu file kết nối database của bạn nằm ở vị trí khác
const db = require("../config/db");

// GET /api/home/:userId
router.get("/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "user_id không hợp lệ",
      });
    }

    // 1. Lấy tên và avatar của người dùng
    const [users] = await db.query(
      `SELECT user_id, full_name, avatar_url
       FROM users
       WHERE user_id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // 2. Thống kê kho thực phẩm của người dùng
    const [pantryRows] = await db.query(
      `SELECT
         COUNT(*) AS total,
         COALESCE(
           SUM(
             CASE
               WHEN expiry_date BETWEEN CURDATE()
                 AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
               THEN 1
               ELSE 0
             END
           ),
           0
         ) AS expiringSoon
       FROM pantry_items
       WHERE user_id = ?
         AND quantity > 0`,
      [userId]
    );

    // 3. Lấy danh sách món ăn gợi ý
    const [recipes] = await db.query(
      `SELECT
         recipe_id,
         name,
         description,
         image_url,
         region,
         prep_time,
         cook_time,
         estimated_cost
       FROM recipes
       ORDER BY recipe_id DESC
       LIMIT 10`
    );

    const pantry = pantryRows[0] || {};

    // 4. Trả dữ liệu về Home
    return res.json({
      success: true,
      data: {
        user: {
          user_id: users[0].user_id,
          full_name: users[0].full_name,
          avatar_url: users[0].avatar_url,
        },
        pantry: {
          total: Number(pantry.total || 0),
          expiringSoon: Number(pantry.expiringSoon || 0),
        },
        recipes,
      },
    });
  } catch (error) {
    console.error("GET /api/home/:userId error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải dữ liệu trang chủ",
    });
  }
});

module.exports = router;
