
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./src/config/db");

require("dotenv").config();

// Import routes
const authRoutes = require("./src/routes/authRoutes");
const homeRoutes = require("./src/routes/homeRoutes");
const profileRoutes = require("./src/routes/profileRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Cho phép truy cập ảnh đã upload
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// API kiểm tra backend
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is reachable",
  });
});

// API đăng nhập và đăng ký
app.use("/api/auth", authRoutes);

// API lấy thông tin và chỉnh sửa hồ sơ
app.use("/api/profile", profileRoutes);

// API trang chủ
app.use("/api/home", homeRoutes);

// API lấy danh sách món ăn
app.get("/api/recipes", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT recipe_id, name, description, estimated_cost
       FROM recipes`
    );

    res.json(rows);
  } catch (error) {
    console.error("Lỗi lấy món ăn:", error);

    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
});

// API lấy sở thích ăn uống đã lưu từ MySQL
app.get("/api/users/:userId/preferences", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID người dùng không hợp lệ",
      });
    }

    const [rows] = await db.query(
      `SELECT
        diet_type,
        taste_preference,
        region_preference,
        budget_per_day,
        default_servings,
        max_cooking_time,
        allergies,
        disliked_ingredients
      FROM users
      WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    const user = rows[0];

    const parseArray = (value) => {
      if (Array.isArray(value)) return value;
      if (!value) return [];

      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    return res.json({
      success: true,
      data: {
        diet: user.diet_type ?? "",
        tastes: parseArray(user.taste_preference),
        region: user.region_preference ?? "",
        budget: Number(user.budget_per_day ?? 0),
        people: Number(user.default_servings ?? 1),
        cookTime: Number(user.max_cooking_time ?? 30),
        allergies: parseArray(user.allergies),
        dislikes: parseArray(user.disliked_ingredients),
      },
    });
  } catch (error) {
    console.error("LỖI LẤY SỞ THÍCH:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy sở thích ăn uống từ MySQL",
    });
  }
});

// API lưu thiết lập khẩu vị
app.put("/api/users/:userId/preferences", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const {
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
        (value) =>
          typeof value === "number" &&
          Number.isFinite(value)
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

    // Không cập nhật avatar_url ở đây.
    // Avatar được quản lý riêng bởi API Profile.
    const [result] = await db.query(
      `UPDATE users SET
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
    console.error("LỖI LƯU KHẨU VỊ MYSQL:", error);

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

// ============================================
// API KHO THỰC PHẨM - LẤY DỮ LIỆU THEO USER
// ============================================

app.get("/api/pantry/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID người dùng không hợp lệ",
      });
    }

    const [rows] = await db.query(
      `SELECT
        p.pantry_item_id AS id,
        p.user_id,
        i.ingredient_id,
        i.name,
        i.category,
        p.quantity,
        p.unit,
        p.storage_location AS location,
        p.purchase_date,
        p.expiry_date,
        i.image_url,
        DATEDIFF(p.expiry_date, CURDATE()) AS daysLeft
      FROM pantry_items p
      INNER JOIN ingredients i
        ON p.ingredient_id = i.ingredient_id
      WHERE p.user_id = ?
      ORDER BY p.expiry_date ASC, p.pantry_item_id ASC`,
      [userId]
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("LỖI LẤY KHO THỰC PHẨM:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải kho thực phẩm",
      ...(process.env.NODE_ENV !== "production" && {
        error: error.sqlMessage || error.message,
        code: error.code,
      }),
    });
  }
});

// ============================================
// XỬ LÝ API KHÔNG TỒN TẠI
// PHẢI ĐẶT SAU TẤT CẢ CÁC API
// ============================================

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy API: ${req.method} ${req.originalUrl}`,
  });
});

// Khởi động backend
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🚀 Server Backend AI Food đang chạy tại: http://localhost:${PORT}`
  );
});
