const db=require('../config/db');
const {tokenUser}=require('./sessionService');
// Áp dụng cho token đã cấp và các API cũ định danh bằng userId trên URL.
async function checkAccountStatus(req,res,next){
 if(req.path.startsWith('/api/auth/')||!req.path.startsWith('/api/'))return next();
 const viewer=tokenUser(req);
 const match=req.path.match(/^\/api\/(?:kitchen|profile|home|users|pantry)\/([^/]+)(?:\/|$)/);
 let target=null;try{target=match?Number(decodeURIComponent(match[1])):null;}catch{}
 const ids=[...new Set([viewer,target].filter(id=>Number.isSafeInteger(id)&&id>0))];
 if(!ids.length)return next();
 try{
  const [users]=await db.query(`SELECT user_id,is_active FROM users WHERE user_id IN (${ids.map(()=>'?').join(',')})`,ids);
  if(viewer&&!users.some(user=>Number(user.user_id)===viewer))return res.status(401).json({success:false,message:'Tài khoản không còn tồn tại.'});
  if(users.some(user=>Number(user.is_active)!==1))return res.status(403).json({success:false,message:'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.'});
  next();
 }catch(error){console.error('Account status:',error.message);res.status(503).json({success:false,message:'Không thể kiểm tra trạng thái tài khoản.'});}
}
module.exports={checkAccountStatus};
