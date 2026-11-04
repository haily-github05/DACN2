// Backend: Phiên đăng nhập có chữ ký để kiểm tra quyền xem bài cá nhân.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
function sessionSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const file = path.join(__dirname, "../../.session-secret");
  try { return fs.readFileSync(file, "utf8").trim(); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    const key = crypto.randomBytes(32).toString("hex");
    try { fs.writeFileSync(file, key, { flag: "wx", mode: 0o600 }); return key; }
    catch (writeError) { if (writeError.code === "EEXIST") return fs.readFileSync(file, "utf8").trim(); throw writeError; }
  }
}
const secret = sessionSecret();
function sign(payload) { return crypto.createHmac("sha256", secret).update(payload).digest("base64url"); }
function createToken(userId) {
  const payload=Buffer.from(JSON.stringify({sub:Number(userId),exp:Date.now()+30*86400000})).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function tokenUser(req) {
  const token=String(req.headers.authorization || "").replace(/^Bearer /, "");
  const [payload,signature,...extra]=token.split(".");
  if(!payload || !signature || extra.length) return null;
  const expected=Buffer.from(sign(payload)), actual=Buffer.from(signature);
  if(expected.length!==actual.length || !crypto.timingSafeEqual(expected,actual)) return null;
  try {
    const data=JSON.parse(Buffer.from(payload,"base64url").toString());
    return Number.isSafeInteger(data.sub) && data.sub>0 && data.exp>Date.now() ? data.sub : null;
  } catch {return null;}
}
function requirePostUser(req,res,next) {
  const userId=tokenUser(req);
  if(!userId) return res.status(401).json({success:false,message:"Vui lòng đăng nhập lại để xem và chia sẻ bài viết."});
  if(userId!==Number(req.params.userId)) return res.status(403).json({success:false,message:"Không có quyền truy cập tài khoản này."});
  next();
}
module.exports={createToken,tokenUser,requirePostUser};
