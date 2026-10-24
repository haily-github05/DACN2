const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// SỬA import này cho khớp file kết nối MySQL hiện tại
const db = require("../config/db");

const uploadDir = path.join(
  __dirname,
  "../../uploads/avatars"
);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const filename =
      `avatar_${req.params.userId}_${Date.now()}.jpg`;

    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return cb(new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP"));
    }
    cb(null, true);
  },
});

router.post("/:userId/avatar", upload.single("avatar"), async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "user_id không hợp lệ",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Chưa chọn ảnh",
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const [result] = await db.query(
      "UPDATE users SET avatar_url = ? WHERE user_id = ?",
      [avatarUrl, userId]
    );

    if (result.affectedRows === 0) {
      fs.unlinkSync(req.file.path);

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    return res.json({
      success: true,
      avatar_url: avatarUrl,
    });
  } catch (error) {
    console.error("Upload avatar:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lưu ảnh đại diện",
    });
  }
});

module.exports = router;