// Backend: Kiểm tra quyền tải ảnh đính kèm bài viết cá nhân.
const db=require("../config/db");
const {tokenUser}=require("../services/sessionService");
module.exports=async function postMediaAccess(req,res,next) {
  try {
    res.set?.("Cache-Control","private, no-store");
    const match=req.path.match(/^\/(?:([0-9]+)_)?[a-f0-9-]+\.(?:jpg|png|webp)$/);
    if(!match) return res.sendStatus(404);
    const imageUrl=`/uploads/posts${req.path}`;
    const [posts]=await db.query("SELECT user_id,visibility,moderation_status FROM community_posts WHERE image_url=?",[imageUrl]);
    if(posts.some(post=>post.visibility==="PUBLIC" && post.moderation_status==="APPROVED")) return next();
    const viewer=tokenUser(req);
    if(viewer) {
      const [users]=await db.query("SELECT role,is_active FROM users WHERE user_id=?",[viewer]);
      if(Number(users[0]?.is_active)!==1)return res.sendStatus(404);
      if(posts.some(post=>Number(post.user_id)===viewer)||Number(match[1])===viewer)return next();
      if(users[0].role==="ADMIN"&&posts.some(post=>post.visibility==="PUBLIC"))return next();
    }
    return res.sendStatus(404);
  } catch(error) {console.error("Post media:",error.message);res.sendStatus(500);}
};
