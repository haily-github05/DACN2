const { requirePostUser } = require("../services/sessionService");
// Backend: Tải ảnh bìa bài viết cộng đồng, kiểm tra định dạng và giới hạn dung lượng.
const express = require("express");
const multer = require("multer");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const db = require("../config/db");
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.use("/:userId/posts", requirePostUser);
router.post("/:userId/posts/image", upload.single("image"), async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isSafeInteger(userId) || userId <= 0 || !req.file) return res.status(400).json({ success: false, message: "Thiếu tài khoản hoặc ảnh" });
    const [users] = await db.query("SELECT user_id FROM users WHERE user_id=?", [userId]);
    if (!users.length) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản" });
    const b = req.file.buffer;
    const extension = b.subarray(0,3).equals(Buffer.from([255,216,255])) ? "jpg"
      : b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png"
      : b.toString("ascii",0,4)==="RIFF" && b.toString("ascii",8,12)==="WEBP" ? "webp" : null;
    if (!extension) return res.status(400).json({ success: false, message: "Chọn ảnh JPEG, PNG hoặc WebP" });
    const folder = path.join(__dirname, "../../uploads/posts");
    await fs.mkdir(folder, { recursive:true });
    const filename = `${userId}_${randomUUID()}.${extension}`;
    await fs.writeFile(path.join(folder,filename),b);
    res.json({ success:true, data:{ url:`/uploads/posts/${filename}` } });
  } catch (error) {
    console.error("Post image:",error.message);
    res.status(500).json({ success:false,message:"Không thể tải ảnh lên máy chủ" });
  }
});
router.use((error,req,res,next)=>res.status(400).json({success:false,message:error.code==="LIMIT_FILE_SIZE" ? "Ảnh tối đa 5 MB" : "Không thể đọc ảnh tải lên"}));
module.exports=router;
