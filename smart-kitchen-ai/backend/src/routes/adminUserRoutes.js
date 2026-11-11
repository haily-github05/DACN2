const express=require('express');
const bcrypt=require('bcryptjs');
const db=require('../config/db');
const {requireAdmin}=require('../services/adminService');
const router=express.Router();router.use(requireAdmin);
const roles=['USER','MODERATOR','ADMIN'];
const fields='user_id,full_name,phone,email,avatar_url,role,is_active,locked_reason,last_login_at,created_at';
const validId=value=>Number.isSafeInteger(Number(value))&&Number(value)>0?Number(value):null;
const data=row=>({id:String(row.user_id),name:row.full_name,phone:row.phone||'',email:row.email||'',avatar:row.avatar_url||'',role:row.role,active:Number(row.is_active)===1,lockedReason:row.locked_reason||'',lastLoginAt:row.last_login_at,createdAt:row.created_at});
const route=fn=>async(req,res)=>{res.set('Cache-Control','no-store');try{await fn(req,res);}catch(error){console.error('Admin users:',error.message);res.status(error.status|| (error.code==='ER_DUP_ENTRY'?409:503)).json({success:false,message:error.status?error.message:error.code==='ER_DUP_ENTRY'?'Số điện thoại hoặc email đã được sử dụng.':'Không thể xử lý dữ liệu người dùng. Vui lòng thử lại.'});}};
router.get('/users',route(async(req,res)=>{
 const page=req.query.page===undefined?1:Number(req.query.page),role=req.query.role||'ALL',status=req.query.status||'ALL';
 const q=typeof req.query.q==='string'?req.query.q.trim():'';
 if(!Number.isSafeInteger(page)||page<1||page>10000||!['ALL',...roles].includes(role)||!['ALL','ACTIVE','LOCKED'].includes(status)||q.length>100)return res.status(400).json({success:false,message:'Bộ lọc không hợp lệ.'});
 const conditions=[],values=[];
 if(role!=='ALL'){conditions.push('role=?');values.push(role);}
 if(status!=='ALL'){conditions.push('is_active=?');values.push(status==='ACTIVE'?1:0);}
 if(q){for(const token of q.replace(/[đĐ]/g,'d').split(/\s+/)){conditions.push("REPLACE(REPLACE(CONVERT(CONCAT_WS(' ',full_name,email,phone,CAST(user_id AS CHAR)) USING utf8mb4),'đ','d'),'Đ','D') COLLATE utf8mb4_unicode_ci LIKE ? ESCAPE '!'");values.push('%'+token.replace(/[!%_]/g,char=>'!'+char)+'%');}}
 const where=conditions.length?'WHERE '+conditions.join(' AND '):'';
 const [[rows],[counts],[totals]]=await Promise.all([
  db.query(`SELECT ${fields} FROM users ${where} ORDER BY user_id DESC LIMIT 10 OFFSET ?`,[...values,(page-1)*10]),
  db.query(`SELECT COUNT(*) AS total FROM users ${where}`,values),
  db.query("SELECT COUNT(*) AS total,SUM(is_active=1) AS active,SUM(is_active=0) AS locked,SUM(role='ADMIN') AS admins,SUM(created_at>=DATE_FORMAT(CURDATE(),'%Y-%m-01') AND created_at<=NOW()) AS new_month FROM users"),
 ]);
 res.json({success:true,data:{items:rows.map(data),total:Number(counts[0].total),stats:{total:Number(totals[0].total),active:Number(totals[0].active||0),newMonth:Number(totals[0].new_month||0),locked:Number(totals[0].locked||0),admins:Number(totals[0].admins||0)}}});
}));
router.get('/users/:userId',route(async(req,res)=>{
 const id=validId(req.params.userId);if(!id)return res.status(400).json({success:false,message:'ID không hợp lệ.'});
 const [users]=await db.query(`SELECT ${fields} FROM users WHERE user_id=?`,[id]);
 if(!users.length)return res.status(404).json({success:false,message:'Không tìm thấy người dùng.'});
 const [[stats]]=await db.query(`SELECT
  (SELECT COUNT(*) FROM community_posts WHERE user_id=?) AS posts,
  (SELECT COUNT(*) FROM cooking_history WHERE user_id=?) AS cooked,
  (SELECT COUNT(*) FROM pantry_items WHERE user_id=?) AS pantry,
  (SELECT COUNT(*) FROM community_comments WHERE user_id=?) AS comments`,[id,id,id,id]);
 res.json({success:true,data:{...data(users[0]),stats:{posts:Number(stats.posts),cooked:Number(stats.cooked),pantry:Number(stats.pantry),comments:Number(stats.comments)}}});
}));
router.post('/users',route(async(req,res)=>{
 const {name,phone,email,password,role='USER'}=req.body||{};
 const normalizedPhone=typeof phone==='string'?phone.replace(/\s/g,''):'';
 const normalizedEmail=typeof email==='string'?email.trim():'';
 if(typeof name!=='string'||!name.trim()||name.trim().length>100||!/^(0[35789]\d{8}|[35789]\d{8})$/.test(normalizedPhone)||typeof password!=='string'||password.length<8||password.length>128||!roles.includes(role)||normalizedEmail.length>255||(normalizedEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)))return res.status(400).json({success:false,message:'Nhập tên, số điện thoại hợp lệ, mật khẩu 8–128 ký tự và vai trò hợp lệ.'});
 const hash=await bcrypt.hash(password,10);
 const [result]=await db.query("INSERT INTO users(full_name,phone,email,password_hash,role,is_active,created_at) VALUES(?,?,?,?,?,1,NOW())",[name.trim(),normalizedPhone,normalizedEmail||null,hash,role]);
 res.status(201).json({success:true,data:{id:String(result.insertId)}});
}));
router.patch('/users/:userId',route(async(req,res)=>{
 const id=validId(req.params.userId),body=req.body||{};
 const hasRole=Object.hasOwn(body,'role'),hasActive=Object.hasOwn(body,'active');
 if(!id||(!hasRole&&!hasActive)||(hasRole&&!roles.includes(body.role))||(hasActive&&typeof body.active!=='boolean')||(body.reason!==undefined&&(typeof body.reason!=='string'||body.reason.length>500)))return res.status(400).json({success:false,message:'Vai trò hoặc trạng thái tài khoản không hợp lệ.'});
 if(id===req.admin.id&&((hasRole&&body.role!=='ADMIN')||(hasActive&&!body.active)))return res.status(400).json({success:false,message:'Bạn không thể tự khóa hoặc hạ quyền tài khoản đang đăng nhập.'});
 const conn=await db.getConnection();
 try{
  await conn.beginTransaction();
  // Khóa cùng thứ tự để hai admin không thể đồng thời loại bỏ quản trị viên cuối.
  const [admins]=await conn.query("SELECT user_id FROM users WHERE role='ADMIN' AND is_active=1 ORDER BY user_id FOR UPDATE");
  if(!admins.some(admin=>Number(admin.user_id)===req.admin.id))throw Object.assign(new Error('Quyền quản trị của bạn đã thay đổi.'),{status:403});
  const [rows]=await conn.query('SELECT user_id,role,is_active,locked_reason FROM users WHERE user_id=? FOR UPDATE',[id]);
  if(!rows.length)throw Object.assign(new Error('Không tìm thấy người dùng.'),{status:404});
  const role=hasRole?body.role:rows[0].role,active=hasActive?body.active:Number(rows[0].is_active)===1;
  if(rows[0].role==='ADMIN'&&Number(rows[0].is_active)===1&&(role!=='ADMIN'||!active)&&admins.length<=1)throw Object.assign(new Error('Phải giữ ít nhất một quản trị viên đang hoạt động.'),{status:409});
  await conn.query('UPDATE users SET role=?,is_active=?,locked_reason=? WHERE user_id=?',[role,active?1:0,active?null:(body.reason?.trim()||rows[0].locked_reason||'Khóa bởi quản trị viên'),id]);
  await conn.commit();res.json({success:true,data:{id:String(id),role,active}});
 }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}));
module.exports=router;
