const express=require('express');
const db=require('../config/db');
const {requireAdmin}=require('../services/adminService');
const router=express.Router();
router.use(requireAdmin);
const validId=value=>Number.isSafeInteger(Number(value))&&Number(value)>0?Number(value):null;
const route=fn=>async(req,res)=>{res.set('Cache-Control','no-store');try{await fn(req,res);}catch(error){console.error('Admin posts:',error.message);res.status(503).json({success:false,message:'Không thể xử lý dữ liệu bài viết. Vui lòng thử lại.'});}};
const postData=row=>({id:String(row.post_id),title:row.title,description:row.description,category:row.category,image:row.image_url||'',author:row.author,userId:String(row.user_id),createdAt:row.created_at,status:row.moderation_status,rejectionReason:row.rejection_reason||null,reviewedBy:row.reviewed_by==null?null:String(row.reviewed_by),reviewedAt:row.reviewed_at||null});
router.get('/posts',route(async(req,res)=>{
 const status=req.query.status||'PENDING',page=req.query.page===undefined?1:Number(req.query.page),pageSize=req.query.pageSize===undefined?20:Number(req.query.pageSize);
 const query=typeof req.query.q==='string'?req.query.q.trim():'';
 const category=typeof req.query.category==='string'?req.query.category:'';
 const days=req.query.days===undefined?'ALL':String(req.query.days);
 if(!['PENDING','APPROVED','REJECTED','HIDDEN','ALL'].includes(status)||!Number.isSafeInteger(page)||page<1||page>10000||![10,20,50].includes(pageSize)||query.length>150||category.length>50||!['ALL','7','30','90'].includes(days))return res.status(400).json({success:false,message:'Bộ lọc hoặc trang không hợp lệ.'});
 const conditions=["p.visibility='PUBLIC'"],values=[];
 if(status!=='ALL'){conditions.push('p.moderation_status=?');values.push(status);}
 if(days!=='ALL'){conditions.push('p.created_at>=DATE_SUB(CURDATE(),INTERVAL ? DAY) AND p.created_at<DATE_ADD(CURDATE(),INTERVAL 1 DAY)');values.push(Number(days)-1);}
 if(category){conditions.push('p.category=?');values.push(category);}
 if(query){
  const tokens=query.replace(/[đĐ]/g,'d').split(/\s+/);
  for(const token of tokens){conditions.push("REPLACE(REPLACE(CONVERT(CONCAT_WS(' ',p.title,p.description,u.full_name,p.category,CAST(p.post_id AS CHAR)) USING utf8mb4),'đ','d'),'Đ','D') COLLATE utf8mb4_unicode_ci LIKE ? ESCAPE '!'");values.push('%'+token.replace(/[!%_]/g,char=>'!'+char)+'%');}
 }
 const where=conditions.join(' AND ');
 const [[rows],[count],[stats],[categories]]=await Promise.all([
  db.query(`SELECT p.*,u.full_name AS author FROM community_posts p JOIN users u ON u.user_id=p.user_id WHERE ${where} ORDER BY p.post_id DESC LIMIT ? OFFSET ?`,[...values,pageSize+1,(page-1)*pageSize]),
  db.query(`SELECT COUNT(*) AS total FROM community_posts p JOIN users u ON u.user_id=p.user_id WHERE ${where}`,values),
  db.query("SELECT COUNT(*) AS total,SUM(p.moderation_status='PENDING') AS pending,SUM(p.moderation_status='REJECTED') AS rejected FROM community_posts p JOIN users u ON u.user_id=p.user_id WHERE p.visibility='PUBLIC'"),
  db.query("SELECT DISTINCT p.category FROM community_posts p JOIN users u ON u.user_id=p.user_id WHERE p.visibility='PUBLIC' ORDER BY p.category"),
 ]);
 res.json({success:true,data:{items:rows.slice(0,pageSize).map(postData),hasMore:rows.length>pageSize,total:Number(count[0].total),stats:{total:Number(stats[0].total),pending:Number(stats[0].pending||0),rejected:Number(stats[0].rejected||0)},categories:[...new Set([...require('../config/postCategories').postCategories,...categories.map(row=>row.category)])]}});
}));
router.get('/posts/:postId',route(async(req,res)=>{
 const postId=validId(req.params.postId);if(!postId)return res.status(400).json({success:false,message:'ID không hợp lệ.'});
 const [rows]=await db.query("SELECT p.*,u.full_name AS author FROM community_posts p JOIN users u ON u.user_id=p.user_id WHERE p.post_id=? AND p.visibility='PUBLIC'",[postId]);
 if(!rows.length)return res.status(404).json({success:false,message:'Bài viết không còn tồn tại hoặc là bài cá nhân.'});
 res.json({success:true,data:postData(rows[0])});
}));
router.get('/posts/:postId/engagement',route(async(req,res)=>{
 const postId=validId(req.params.postId),type=req.query.type||'comments',page=Number(req.query.page||1);
 if(!postId||!['likes','saves','comments'].includes(type)||!Number.isSafeInteger(page)||page<1||page>10000)return res.status(400).json({success:false,message:'Bộ lọc tương tác không hợp lệ.'});
 const [posts]=await db.query("SELECT post_id FROM community_posts WHERE post_id=? AND visibility='PUBLIC'",[postId]);
 if(!posts.length)return res.status(404).json({success:false,message:'Bài viết không còn tồn tại hoặc là bài cá nhân.'});
 const [counts]=await db.query("SELECT (SELECT COUNT(*) FROM community_reactions WHERE post_id=? AND kind='like') AS likes,(SELECT COUNT(*) FROM community_reactions WHERE post_id=? AND kind='save') AS saves,(SELECT COUNT(*) FROM community_comments WHERE post_id=?) AS comments",[postId,postId,postId]);
 let items;
 if(type==='comments'){
  const [rows]=await db.query('SELECT c.comment_id,c.user_id,c.content,c.created_at,c.parent_comment_id,u.full_name AS author,parent.content AS parent_content FROM community_comments c JOIN users u ON u.user_id=c.user_id LEFT JOIN community_comments parent ON parent.comment_id=c.parent_comment_id AND parent.post_id=c.post_id WHERE c.post_id=? ORDER BY c.created_at DESC,c.comment_id DESC LIMIT 20 OFFSET ?',[postId,(page-1)*20]);
  items=rows.map(r=>({id:String(r.comment_id),userId:String(r.user_id),author:r.author,content:r.content,createdAt:r.created_at,parentId:r.parent_comment_id==null?null:String(r.parent_comment_id),parentContent:r.parent_content||''}));
 }else{
  const [rows]=await db.query('SELECT r.user_id,u.full_name AS author FROM community_reactions r JOIN users u ON u.user_id=r.user_id WHERE r.post_id=? AND r.kind=? ORDER BY u.full_name,r.user_id LIMIT 20 OFFSET ?',[postId,type==='likes'?'like':'save',(page-1)*20]);
  items=rows.map(r=>({id:String(r.user_id),userId:String(r.user_id),author:r.author}));
 }
 res.json({success:true,data:{counts:{likes:Number(counts[0].likes),saves:Number(counts[0].saves),comments:Number(counts[0].comments)},items}});
}));
router.patch('/posts/:postId/moderation',route(async(req,res)=>{
 const postId=validId(req.params.postId),{status,reason}=req.body;
 if(!postId||!['APPROVED','REJECTED'].includes(status)||(status==='REJECTED'&&(typeof reason!=='string'||!reason.trim()||reason.trim().length>1000)))return res.status(400).json({success:false,message:'Chọn duyệt hoặc từ chối. Từ chối cần lý do tối đa 1.000 ký tự.'});
 const [result]=await db.query("UPDATE community_posts SET moderation_status=?,rejection_reason=?,reviewed_by=?,reviewed_at=NOW() WHERE post_id=? AND visibility='PUBLIC' AND moderation_status='PENDING'",[status,status==='REJECTED'?reason.trim():null,req.admin.id,postId]);
 if(!result.affectedRows)return res.status(409).json({success:false,message:'Bài đã được xử lý hoặc không còn chờ duyệt. Hãy tải lại.'});
 res.json({success:true,data:{id:String(postId),status}});
}));
router.patch('/posts/:postId/visibility',route(async(req,res)=>{
 const postId=validId(req.params.postId),hidden=req.body?.hidden;
 if(!postId||typeof hidden!=='boolean')return res.status(400).json({success:false,message:'ID hoặc trạng thái ẩn không hợp lệ.'});
 const status=hidden?'HIDDEN':'APPROVED',previous=hidden?'APPROVED':'HIDDEN';
 const [result]=await db.query("UPDATE community_posts SET moderation_status=?,reviewed_by=?,reviewed_at=NOW() WHERE post_id=? AND visibility='PUBLIC' AND moderation_status=?",[status,req.admin.id,postId,previous]);
 if(!result.affectedRows)return res.status(409).json({success:false,message:'Bài không còn ở trạng thái có thể ẩn/hiện. Hãy tải lại danh sách.'});
 res.json({success:true,data:{id:String(postId),status}});
}));
router.delete('/posts/:postId',route(async(req,res)=>{
 const postId=validId(req.params.postId);if(!postId)return res.status(400).json({success:false,message:'ID không hợp lệ.'});
 const [result]=await db.query("DELETE FROM community_posts WHERE post_id=? AND visibility='PUBLIC'",[postId]);
 if(!result.affectedRows)return res.status(404).json({success:false,message:'Bài không còn tồn tại hoặc là bài cá nhân.'});
 res.json({success:true,data:null});
}));
router.get('/notifications',route(async(req,res)=>{
 const [[counts],[rows]]=await Promise.all([
  db.query("SELECT COUNT(*) AS pending,SUM(r.post_id IS NULL) AS unread FROM community_posts p LEFT JOIN admin_post_reads r ON r.post_id=p.post_id AND r.admin_id=? WHERE p.visibility='PUBLIC' AND p.moderation_status='PENDING'",[req.admin.id]),
  db.query("SELECT p.post_id,p.title,p.created_at,u.full_name AS author,r.read_at FROM community_posts p JOIN users u ON u.user_id=p.user_id LEFT JOIN admin_post_reads r ON r.post_id=p.post_id AND r.admin_id=? WHERE p.visibility='PUBLIC' AND p.moderation_status='PENDING' ORDER BY (r.post_id IS NULL) DESC,p.post_id DESC LIMIT 20",[req.admin.id]),
 ]);
 res.json({success:true,data:{pending:Number(counts[0].pending),unread:Number(counts[0].unread||0),items:rows.map(row=>({id:String(row.post_id),title:row.title,author:row.author,createdAt:row.created_at,read:!!row.read_at}))}});
}));
router.get('/notifications/history',route(async(req,res)=>{
 const page=Number(req.query.page||1);if(!Number.isSafeInteger(page)||page<1||page>10000)return res.status(400).json({success:false,message:'Trang không hợp lệ.'});
 const [[counts],[rows]]=await Promise.all([
  db.query("SELECT COUNT(*) AS total FROM community_posts WHERE visibility='PUBLIC'"),
  db.query("SELECT p.post_id,p.title,p.created_at,p.moderation_status,p.reviewed_at,p.rejection_reason,u.full_name AS author,a.full_name AS reviewer,r.read_at FROM community_posts p JOIN users u ON u.user_id=p.user_id LEFT JOIN users a ON a.user_id=p.reviewed_by LEFT JOIN admin_post_reads r ON r.post_id=p.post_id AND r.admin_id=? WHERE p.visibility='PUBLIC' ORDER BY COALESCE(p.reviewed_at,p.created_at) DESC,p.post_id DESC LIMIT 20 OFFSET ?",[req.admin.id,(page-1)*20]),
 ]);
 res.json({success:true,data:{total:Number(counts[0].total),items:rows.map(row=>({id:String(row.post_id),title:row.title,author:row.author,createdAt:row.created_at,status:row.moderation_status,reviewedAt:row.reviewed_at,reviewer:row.reviewer||'',reason:row.rejection_reason||'',read:!!row.read_at}))}});
}));
router.put('/notifications/read-all',route(async(req,res)=>{
 await db.query("INSERT IGNORE INTO admin_post_reads(admin_id,post_id) SELECT ?,post_id FROM community_posts WHERE visibility='PUBLIC' AND moderation_status='PENDING'",[req.admin.id]);
 res.json({success:true,data:null});
}));
router.put('/notifications/:postId/read',route(async(req,res)=>{
 const postId=validId(req.params.postId);if(!postId)return res.status(400).json({success:false,message:'ID không hợp lệ.'});
 await db.query("INSERT IGNORE INTO admin_post_reads(admin_id,post_id) SELECT ?,post_id FROM community_posts WHERE post_id=? AND visibility='PUBLIC' AND moderation_status='PENDING'",[req.admin.id,postId]);
 res.json({success:true,data:null});
}));
module.exports=router;
