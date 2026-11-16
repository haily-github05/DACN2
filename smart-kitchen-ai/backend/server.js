// Backend: Khởi động Express, đăng ký API và phục vụ ảnh trong thư mục uploads.

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./src/config/db");
const buildChatSystemInstruction=require("./src/services/chatPrompt");
const {requestGeminiReply}=require("./src/services/geminiChatService");
const {recordAIActivity}=require("./src/services/aiActivityService");

require("dotenv").config();
require("./src/services/aiTelemetrySecret").getAITelemetrySecret();

// Import routes
const authRoutes = require("./src/routes/authRoutes");
const homeRoutes = require("./src/routes/homeRoutes");
const profileRoutes = require("./src/routes/profileRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(require("./src/services/accountStatusService").checkAccountStatus);

app.use("/uploads/posts", require("./src/routes/postMediaAccess"));

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
app.use("/api/ai", require("./src/routes/aiTelemetryRoutes"));
app.use("/api/admin", require("./src/routes/adminRoutes"));
app.use("/api/admin", require("./src/routes/adminAIRoutes"));
app.use("/api/admin", require("./src/routes/adminContentModerationRoutes"));
app.use("/api/admin", require("./src/routes/adminPostRoutes"));
app.use("/api/admin", require("./src/routes/adminUserRoutes"));
app.use("/api/admin", require("./src/routes/adminIngredientRoutes"));
app.use("/api/admin", require("./src/routes/adminRecipeRoutes"));
app.use("/api/admin", require("./src/routes/adminSettingsRoutes"));

// API lấy thông tin và chỉnh sửa hồ sơ
app.use("/api/profile", profileRoutes);

// API trang chủ
app.use("/api/home", homeRoutes);

app.use("/api/kitchen", require("./src/routes/postImageRoutes"));
app.use("/api/kitchen", require("./src/routes/ingredientImageRoutes"));
app.use("/api/kitchen", require("./src/routes/kitchenRoutes"));

// API lấy danh sách món ăn
app.get("/api/recipes", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT recipe_id, name, description, estimated_cost, calories
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
        COALESCE(p.image_url, i.image_url) AS image_url,
        p.note, p.created_at,
        DATE_FORMAT(p.purchase_date, '%Y-%m-%d') AS purchase_date,
        DATE_FORMAT(p.expiry_date, '%Y-%m-%d') AS expiry_date,
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

// 
app.post("/api/pantry/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  const items = req.body?.items;

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: "ID người dùng không hợp lệ" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "Danh sách nguyên liệu đang trống" });
  }

  const invalidItem = items.some((item) =>
    !item || typeof item.name !== "string" || !item.name.trim() ||
    !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 ||
    typeof item.unit !== "string" || !item.unit.trim()
  );
  if (invalidItem) {
    return res.status(400).json({ success: false, message: "Tên, số lượng hoặc đơn vị nguyên liệu không hợp lệ" });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    // GHI CHÚ: Ghi nhận tên CSDL đang được API sử dụng để đối chiếu với CSDL đang mở trong phpMyAdmin.
    const [[databaseInfo]] = await connection.query("SELECT DATABASE() AS databaseName");
    const saved = [];

    for (const item of items) {
      const metadata = ingredientMetadata(item.name);
      const [existingIngredients] = await connection.query(
        "SELECT ingredient_id, default_unit, storage_type FROM ingredients WHERE name = ? LIMIT 1 FOR UPDATE",
        [metadata.name]
      );

      let ingredientId;
      let storageLocation;
      if (existingIngredients.length > 0) {
        ingredientId = existingIngredients[0].ingredient_id;
        storageLocation = existingIngredients[0].storage_type || metadata.storageType;
      } else {
        const [insertedIngredient] = await connection.query(
          `INSERT INTO ingredients (name, category, default_unit, storage_type, image_url, created_at)
           VALUES (?, ?, ?, ?, NULL, NOW())`,
          [metadata.name, metadata.category, metadata.defaultUnit, metadata.storageType]
        );
        ingredientId = insertedIngredient.insertId;
        storageLocation = metadata.storageType;
      }

      const [insertedPantryItem] = await connection.query(
        `INSERT INTO pantry_items
          (user_id, ingredient_id, quantity, unit, storage_location, purchase_date, expiry_date)
         VALUES (?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY))`,
        [userId, ingredientId, Number(item.quantity), item.unit.trim(), storageLocation]
      );

      saved.push({ pantry_item_id: insertedPantryItem.insertId, ingredient_id: ingredientId, name: metadata.name });
    }

    await connection.commit();
    return res.status(201).json({
      success: true,
      message: "Đã lưu nguyên liệu vào kho",
      savedCount: saved.length,
      database: databaseInfo?.databaseName || null,
      data: saved,
    });
  } catch (error) {
if (connection) await connection.rollback();
    console.error("LỖI LƯU NGUYÊN LIỆU VÀO KHO:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lưu nguyên liệu vào kho",
      ...(process.env.NODE_ENV !== "production" && {
        error: error.sqlMessage || error.message,
        code: error.code,
      }),
    });
  } finally {
    if (connection) connection.release();
  }
});
//
function ingredientMetadata(rawName) {
  const plainName = String(rawName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();

  const knownFoods = [
    [/\btomato(es)?\b/, "Cà chua", "Rau củ", "g", "Ngăn mát"],
    [/\bcarrot(s)?\b/, "Cà rốt", "Rau củ", "g", "Ngăn mát"],
    [/\bbroccoli\b/, "Bông cải xanh", "Rau củ", "g", "Ngăn mát"],
    [/\bbell pepper(s)?\b|\bsweet pepper(s)?\b/, "Ớt chuông", "Rau củ", "g", "Ngăn mát"],
    [/\bradish(es)?\b/, "Củ cải", "Rau củ", "g", "Ngăn mát"],
    [/\bchayote\b/, "Su su", "Rau củ", "g", "Ngăn mát"],
    [/\blettuce\b/, "Xà lách", "Rau củ", "g", "Ngăn mát"],
    [/\bspinach\b/, "Rau bina", "Rau củ", "g", "Ngăn mát"],
    [/\bcucumber(s)?\b/, "Dưa leo", "Rau củ", "g", "Ngăn mát"],
    [/\bpotato(es)?\b/, "Khoai tây", "Rau củ", "g", "Nhiệt độ phòng"],
    [/\bonion(s)?\b/, "Hành tây", "Rau củ", "g", "Nhiệt độ phòng"],
    [/\bgarlic\b/, "Tỏi", "Gia vị", "g", "Nhiệt độ phòng"],
    [/\bapple(s)?\b/, "Táo", "Trái cây", "quả", "Ngăn mát"],
    [/\bbanana(s)?\b/, "Chuối", "Trái cây", "quả", "Nhiệt độ phòng"],
  ];

  const matched = knownFoods.find(([pattern]) => pattern.test(plainName));
  if (matched) {
    return { name: matched[1], category: matched[2], defaultUnit: matched[3], storageType: matched[4] };
  }

  return {
    name: String(rawName).trim().replace(/[_-]+/g, " "),
    category: "Rau củ",
    defaultUnit: "g",
    storageType: "Ngăn mát",
  };
}
//
// Gemini chat endpoint. Keep the Gemini API key on the backend; never send it to the mobile app.
app.post("/api/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const userId = require("./src/services/sessionService").tokenUser(req);
  if(!userId)return res.status(401).json({success:false,message:"Vui lòng đăng nhập để trò chuyện với AI."});
  if(req.body?.userId!=null&&Number(req.body.userId)!==userId)return res.status(403).json({success:false,message:"Không có quyền truy cập tài khoản này."});
  const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!message || message.length > 1000) {
    return res.status(400).json({ success: false, message: "Câu hỏi không hợp lệ hoặc dài quá 1000 ký tự." });
  }
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: "Không xác định được tài khoản đang đăng nhập." });
  }
  if (!process.env.GEMINI_API_KEY) {
    await recordAIActivity({type:"CHAT",status:"FAILURE",model:process.env.GEMINI_MODEL||"gemini-flash-latest",errorCode:"MISSING_API_KEY",userId});
    return res.status(503).json({ success: false, message: "Backend chưa có GEMINI_API_KEY trong file .env." });
  }

  let kitchenContext = "Chưa truy xuất được dữ liệu kho hoặc hồ sơ người dùng; hãy hỏi thêm trước khi giả định nguyên liệu, dị ứng hay sở thích.";
  try {
    // Dữ liệu ứng dụng giúp cá nhân hóa, nhưng lỗi DB không nên chặn chat thông thường.
    const [[pantry], [preferences], [recipes]] = await Promise.all([
      db.query(
        `SELECT i.name, p.quantity, p.unit, p.storage_location, DATE_FORMAT(p.expiry_date, '%Y-%m-%d') AS expiry_date
         FROM pantry_items p
         INNER JOIN ingredients i ON p.ingredient_id = i.ingredient_id
         WHERE p.user_id = ?
         ORDER BY p.expiry_date ASC, p.pantry_item_id ASC
         LIMIT 100`,
        [userId]
      ),
      db.query(
        `SELECT diet_type, allergies, disliked_ingredients
         FROM users WHERE user_id = ? LIMIT 1`,
        [userId]
      ),
      db.query(
        `SELECT recipe_id, name, description, estimated_cost
         FROM recipes WHERE is_active=1 ORDER BY recipe_id DESC LIMIT 50`
      ),
    ]);
    kitchenContext = JSON.stringify({ pantry, preferences: preferences[0] || null, recipes });
  } catch (error) {
    console.error("Không tải được dữ liệu cá nhân cho chat:", error.message);
  }

  try {
    const history = rawHistory
      .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
      .slice(-12)
      .map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.content.slice(0, 2000) }],
      }));

    const systemInstruction = buildChatSystemInstruction(kitchenContext);


    const aiStartedAt = Date.now();
    const reply = await requestGeminiReply({
      apiKey:process.env.GEMINI_API_KEY,
      primaryModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
      fallbackModel: process.env.GEMINI_FALLBACK_MODEL || "",
      history,
      systemInstruction,
      message,
    });

    if (!reply) {
await recordAIActivity({type:"CHAT",status:"FAILURE",model:process.env.GEMINI_MODEL||"gemini-flash-latest",durationMs:Date.now()-aiStartedAt,errorCode:"EMPTY_RESPONSE",userId});
return res.status(502).json({ success: false, message: "Gemini không trả về nội dung. Hãy thử gửi lại câu hỏi." });
    }
    await recordAIActivity({type:"CHAT",status:"SUCCESS",model:process.env.GEMINI_MODEL||"gemini-flash-latest",durationMs:Date.now()-aiStartedAt,userId});
    return res.json({ success: true, reply });
  } catch (error) {
    await recordAIActivity({type:"CHAT",status:"FAILURE",model:process.env.GEMINI_MODEL||"gemini-flash-latest",errorCode:error.status||error.name||"REQUEST_FAILED",userId});
    console.error("Gemini chat:",error.name,error.status||'');
    return res.status(error.status||502).json({success:false,message:error.name==='TimeoutError'?'AI phản hồi quá lâu. Vui lòng thử lại.':error.status?error.message:'Chưa kết nối được Gemini. Vui lòng kiểm tra cấu hình backend.'});
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

// Khởi động backend; chỉ thông báo thành công khi đã chiếm được cổng.
const server = app.listen(PORT, "0.0.0.0");
server.on("listening", () => {
  console.log(`🚀 Server Backend AI Food đang chạy tại: http://localhost:${PORT}`);
});
server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `Cổng ${PORT} đang được backend khác sử dụng. Hãy dừng tiến trình cũ rồi chạy lại.`
      : `Không thể khởi động backend: ${error.message}`
  );
  process.exitCode = 1;
  db.end().catch((dbError) => console.error("Không thể đóng kết nối MySQL:", dbError.message));
});
