const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
// THAY bằng đúng module kết nối mysql2/promise của dự án bạn
const db = require("../config/db");
const router = express.Router();
const dir = path.join(__dirname, "../../uploads/avatars");
fs.mkdirSync(dir, { recursive: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const validId = x => Number.isSafeInteger(Number(x)) && Number(x) > 0 ? Number(x) : null;

// TODO bảo mật: gắn middleware xác thực và kiểm tra userId thuộc phiên đăng nhập.
router.get("/:userId", async (req, res) => {
    try {
        const id = validId(req.params.userId);
        if (!id) return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        const [rows] = await db.query("SELECT user_id, full_name, email, phone, avatar_url FROM users WHERE user_id = ?", [id]);
        if (!rows.length) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản" });
        res.json({ success: true, data: rows[0] });
    } catch (e) { console.error(e); res.status(500).json({ success: false, message: "Lỗi tải hồ sơ" }); }
});

router.put("/:userId", async (req, res) => {
    try {
        const id = validId(req.params.userId);
        if (!id) return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        const fullName = String(req.body.full_name ?? "").trim();
        const email = String(req.body.email ?? "").trim() || null;
        const phone = String(req.body.phone ?? "").trim() || null;
        if (!fullName) return res.status(400).json({ success: false, message: "Tên không được để trống" });
        const [r] = await db.query("UPDATE users SET full_name=?, email=?, phone=? WHERE user_id=?", [fullName, email, phone, id]);
        if (!r.affectedRows) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản" });
        const [rows] = await db.query("SELECT user_id, full_name, email, phone, avatar_url FROM users WHERE user_id=?", [id]);
        res.json({ success: true, data: rows[0] });
    } catch (e) {
        console.error(e);
        res.status(e.code === "ER_DUP_ENTRY" ? 409 : 500).json({ success: false, message: e.code === "ER_DUP_ENTRY" ? "Email hoặc SĐT đã được sử dụng" : "Lỗi lưu hồ sơ" });
    }
});

router.post("/:userId/avatar", upload.single("avatar"), async (req, res) => {
    console.log("=== AVATAR UPLOAD ===");
    console.log("User ID:", req.params.userId);
    console.log("File:", req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
    } : "KHÔNG NHẬN ĐƯỢC FILE");
    let filepath;
    try {
        const id = validId(req.params.userId);
        if (!id || !req.file) return res.status(400).json({ success: false, message: "Thiếu ID hoặc ảnh" });
        const [users] = await db.query("SELECT user_id FROM users WHERE user_id=?", [id]);
        if (!users.length) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản" });
        const b = req.file.buffer;
        const jpg = b.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
        const png = b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const webp = b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
        if (!jpg && !png && !webp) return res.status(400).json({ success: false, message: "Ảnh không hợp lệ" });
        const name = `${crypto.randomUUID()}.${jpg ? "jpg" : png ? "png" : "webp"}`;
        filepath = path.join(dir, name);
        await fs.promises.writeFile(filepath, b);
        const avatar_url = `/uploads/avatars/${name}`;
        await db.query("UPDATE users SET avatar_url=? WHERE user_id=?", [avatar_url, id]);
        console.log("Đã lưu avatar:", avatar_url);
        res.json({ success: true, avatar_url });
    } catch (e) {
        if (filepath) await fs.promises.unlink(filepath).catch(() => { });
        console.error(e); res.status(500).json({ success: false, message: "Lỗi tải ảnh" });
    }
});
module.exports = router;
