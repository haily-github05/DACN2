const express = require('express');
const cors = require('cors');
const db = require('./src/config/db');
require('dotenv').config();

// --- 1. GỌI FILE ĐỊNH TUYẾN ĐĂNG KÝ ---
const authRoutes = require('./src/routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Backend is reachable' });
});

// API lấy món ăn cũ (Giữ nguyên)
app.get('/api/recipes', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT recipe_id, name, description, estimated_cost FROM recipes");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});

// --- 2. CẤU HÌNH ĐƯỜNG DẪN API CHÍNH CHO ĐĂNG NHẬP/ĐĂNG KÝ ---
app.use('/api/auth', authRoutes);
// 

app.put("/api/users/:userId/preferences", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const {
      avatar,
      diet,
      tastes,
      region,
      budget,
      people,
      cookTime,
      allergies,
      dislikes,
    } = req.body;

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID người dùng không hợp lệ",
      });
    }

    if (
      typeof diet !== "string" ||
      typeof region !== "string" ||
      !Array.isArray(tastes) ||
      !Array.isArray(allergies) ||
      !Array.isArray(dislikes) ||
      ![budget, people, cookTime].every(
        (value) => typeof value === "number" && Number.isFinite(value)
      ) ||
      budget < 0 ||
      !Number.isInteger(people) ||
      people < 1 ||
      !Number.isInteger(cookTime) ||
      cookTime < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu khẩu vị không hợp lệ",
      });
    }

    const [result] = await db.query(
      `UPDATE users SET
        avatar_url = ?,
        diet_type = ?,
        taste_preference = ?,
        region_preference = ?,
        budget_per_day = ?,
        default_servings = ?,
        max_cooking_time = ?,
        allergies = ?,
        disliked_ingredients = ?
       WHERE user_id = ?`,
      [
        avatar?.startsWith("http") ? avatar : null,
        diet,
        JSON.stringify(tastes),
        region,
        budget,
        people,
        cookTime,
        JSON.stringify(allergies),
        JSON.stringify(dislikes),
        userId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    return res.json({
      success: true,
      message: "Đã lưu khẩu vị cá nhân vào MySQL",
    });
  } catch (error) {
    console.error("❌ LỖI LƯU KHẨU VỊ MYSQL:");
    console.error("Mã lỗi:", error.code);
    console.error("Thông báo:", error.sqlMessage || error.message);
    console.error("SQL:", error.sql);

    return res.status(500).json({
      success: false,
      message: "Không thể lưu khẩu vị vào MySQL",
      ...(process.env.NODE_ENV !== "production" && {
        error: error.sqlMessage || error.message,
        code: error.code,
      }),
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server Backend AI Food đang chạy tại: http://localhost:${PORT}`);
});
