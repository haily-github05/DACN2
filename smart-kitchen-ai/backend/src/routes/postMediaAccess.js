// Backend: Kiểm tra quyền tải ảnh đính kèm bài viết cá nhân.
const db=require("../config/db");
const {tokenUser}=require("../services/sessionService");
module.exports=async function postMediaAccess(req,res,next) {
  try {
    const match=req.path.match(/^\/(?:([0-9]+)_)?[a-f0-9-]+\.(?:jpg|png|webp)$/);
    if(!match) return res.sendStatus(404);
    const imageUrl=`/uploads/posts${req.path}`;
    const [posts]=await db.query("SELECT user_id,visibility FROM community_posts WHERE image_url=?",[imageUrl]);
    if(posts.some(post=>post.visibility==="PUBLIC")) return next();
    const viewer=tokenUser(req);
    if(viewer && (posts.some(post=>Number(post.user_id)===viewer) || Number(match[1])===viewer)) return next();
    return res.sendStatus(404);
  } catch(error) {console.error("Post media:",error.message);res.sendStatus(500);}
};
