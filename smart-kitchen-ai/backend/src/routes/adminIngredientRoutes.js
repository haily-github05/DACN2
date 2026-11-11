const express=require('express');
const multer=require('multer');
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const db=require('../config/db');
const {requireAdmin}=require('../services/adminService');
const router=express.Router();router.use(requireAdmin);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const id=value=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<=0)throw fail('Mã nguyên liệu không hợp lệ.');return n;};
const text=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw fail(`${label} không hợp lệ.`);return value.trim();};
const fields='i.ingredient_id,i.name,i.category,i.default_unit,i.storage_type,i.image_url,i.created_at';
const usageSQL=`(SELECT COUNT(DISTINCT r.recipe_id) FROM recipe_ingredients r WHERE r.ingredient_id=i.ingredient_id) AS recipe_count,
 (SELECT COUNT(*) FROM pantry_items p WHERE p.ingredient_id=i.ingredient_id) AS pantry_count,
 (SELECT COUNT(*) FROM shopping_list_items s WHERE s.ingredient_id=i.ingredient_id) AS shopping_count`;
const item=row=>({id:String(row.ingredient_id),name:row.name,category:row.category?.trim()||'Khác',unit:row.default_unit,storage:row.storage_type||'',image:row.image_url||'',createdAt:row.created_at,usage:{recipes:Number(row.recipe_count||0),pantry:Number(row.pantry_count||0),shopping:Number(row.shopping_count||0)}});
const route=fn=>async(req,res)=>{res.set('Cache-Control','no-store');try{await fn(req,res);}catch(error){console.error('Admin ingredients:',error.message);res.status(error.status||(error.code==='ER_DUP_ENTRY'||error.code==='ER_ROW_IS_REFERENCED_2'?409:503)).json({success:false,message:error.status?error.message:error.code==='ER_DUP_ENTRY'?'Tên nguyên liệu đã tồn tại.':error.code==='ER_ROW_IS_REFERENCED_2'?'Nguyên liệu đang được sử dụng, không thể xóa.':'Không thể xử lý dữ liệu nguyên liệu. Vui lòng thử lại.'});}};
async function transaction(fn){const conn=await db.getConnection();try{await conn.beginTransaction();const result=await fn(conn);await conn.commit();return result;}catch(error){await conn.rollback();throw error;}finally{conn.release();}}
function validate(body){
 const name=text(body.name,100,'Tên nguyên liệu'),category=text(body.category,50,'Danh mục'),unit=text(body.unit,20,'Đơn vị');
 const storage=body.storage===undefined||body.storage===null?'':body.storage,image=body.image===undefined||body.image===null?'':body.image;
 if(typeof storage!=='string'||storage.trim().length>30)throw fail('Kiểu bảo quản tối đa 30 ký tự.');
 if(typeof image!=='string'||image.length>500||(image&&!/^https?:\/\//.test(image)&&!/^\/uploads\/ingredients\/[a-zA-Z0-9_.-]+$/.test(image)))throw fail('Ảnh phải là URL HTTP(S) hoặc ảnh nguyên liệu đã tải lên.');
 return [name,category,unit,storage.trim()||null,image||null];
}
function selection(values){if(!Array.isArray(values)||!values.length||values.length>100)throw fail('Chọn từ 1 đến 100 nguyên liệu.');return [...new Set(values.map(id))].sort((a,b)=>a-b);}
router.get('/ingredients',route(async(req,res)=>{
 const page=req.query.page===undefined?1:Number(req.query.page),size=req.query.pageSize===undefined?10:Number(req.query.pageSize);
 const q=typeof req.query.q==='string'?req.query.q.trim():'',category=typeof req.query.category==='string'?req.query.category:'',unit=typeof req.query.unit==='string'?req.query.unit:'',storage=typeof req.query.storage==='string'?req.query.storage:'';
 if(!Number.isSafeInteger(page)||page<1||page>10000||![10,20,50].includes(size)||q.length>100||category.length>50||unit.length>20||storage.length>30)throw fail('Bộ lọc không hợp lệ.');
 const clauses=[],values=[];
 if(category){clauses.push("COALESCE(NULLIF(TRIM(i.category),''),'Khác')=?");values.push(category);}
 if(unit){clauses.push('i.default_unit=?');values.push(unit);}
 if(storage){clauses.push(storage==='__empty'?"(i.storage_type IS NULL OR TRIM(i.storage_type)='')":'i.storage_type=?');if(storage!=='__empty')values.push(storage);}
 if(q)for(const word of q.replace(/[đĐ]/g,'d').split(/\s+/)){clauses.push("REPLACE(REPLACE(CONVERT(CONCAT_WS(' ',i.name,i.category,CAST(i.ingredient_id AS CHAR)) USING utf8mb4),'đ','d'),'Đ','D') COLLATE utf8mb4_unicode_ci LIKE ? ESCAPE '!'");values.push('%'+word.replace(/[!%_]/g,char=>'!'+char)+'%');}
 const where=clauses.length?'WHERE '+clauses.join(' AND '):'';
 const [[rows],[counts],[stats],[categories],[units],[storages]]=await Promise.all([
  db.query(`SELECT ${fields},${usageSQL} FROM ingredients i ${where} ORDER BY CONVERT(i.name USING utf8mb4) COLLATE utf8mb4_vietnamese_ci ASC,i.ingredient_id ASC LIMIT ? OFFSET ?`,[...values,size,(page-1)*size]),
  db.query(`SELECT COUNT(*) AS total FROM ingredients i ${where}`,values),
  db.query("SELECT COUNT(*) AS total,COUNT(DISTINCT COALESCE(NULLIF(TRIM(category),''),'Khác')) AS categories,COUNT(DISTINCT default_unit) AS units,COUNT(NULLIF(TRIM(storage_type),'')) AS storage FROM ingredients"),
  db.query("SELECT COALESCE(NULLIF(TRIM(category),''),'Khác') AS category_name,COUNT(*) AS count FROM ingredients GROUP BY category_name ORDER BY category_name"),
  db.query('SELECT default_unit AS name,COUNT(*) AS count FROM ingredients GROUP BY default_unit ORDER BY default_unit'),
  db.query("SELECT COALESCE(NULLIF(TRIM(storage_type),''),'Chưa khai báo') AS storage_name,COUNT(*) AS count FROM ingredients GROUP BY storage_name ORDER BY storage_name"),
 ]);
 res.json({success:true,data:{items:rows.map(item),total:Number(counts[0].total),stats:{total:Number(stats[0].total),categories:Number(stats[0].categories),units:Number(stats[0].units),storage:Number(stats[0].storage)},categories:categories.map(r=>({name:r.category_name,count:Number(r.count)})),units:units.map(r=>({name:r.name,count:Number(r.count)})),storages:storages.map(r=>({name:r.storage_name,count:Number(r.count)}))}});
}));
router.get('/ingredients/:ingredientId/recipes',route(async(req,res)=>{
 const ingredientId=id(req.params.ingredientId);
 const [found]=await db.query('SELECT ingredient_id,name FROM ingredients WHERE ingredient_id=?',[ingredientId]);
 if(!found.length)throw fail('Không tìm thấy nguyên liệu.',404);
 const [rows]=await db.query(`SELECT r.recipe_id,r.name,r.description,r.image_url,r.is_active,r.prep_time,r.cook_time,r.default_servings FROM recipes r WHERE EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id=r.recipe_id AND ri.ingredient_id=?) ORDER BY r.name,r.recipe_id`,[ingredientId]);
 const items=[];
 if(rows.length){
  const ids=rows.map(r=>r.recipe_id),marks=ids.map(()=>'?').join(',');
  const [[ingredients],[steps]]=await Promise.all([
   db.query(`SELECT ri.recipe_id,i.name,ri.quantity,ri.unit FROM recipe_ingredients ri JOIN ingredients i ON i.ingredient_id=ri.ingredient_id WHERE ri.recipe_id IN (${marks}) ORDER BY ri.recipe_id,i.name`,ids),
   db.query(`SELECT recipe_id,step_number,instruction FROM recipe_steps WHERE recipe_id IN (${marks}) ORDER BY recipe_id,step_number`,ids),
  ]);
  for(const r of rows)items.push({id:String(r.recipe_id),name:r.name,description:r.description||'',image:r.image_url||'',active:!!r.is_active,minutes:Number(r.prep_time||0)+Number(r.cook_time||0),servings:Number(r.default_servings||1),ingredients:ingredients.filter(i=>String(i.recipe_id)===String(r.recipe_id)).map(i=>({name:i.name,quantity:Number(i.quantity),unit:i.unit})),steps:steps.filter(s=>String(s.recipe_id)===String(r.recipe_id)).map(s=>({number:Number(s.step_number),instruction:s.instruction}))});
 }
 res.json({success:true,data:{items}});
}));
router.post('/ingredients/image',upload.single('image'),route(async(req,res)=>{
 if(!req.file)throw fail('Chọn ảnh để tải lên.');const b=req.file.buffer;
 const extension=b.subarray(0,3).equals(Buffer.from([255,216,255]))?'jpg':b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'?'webp':null;
 if(!extension)throw fail('Ảnh phải là JPEG, PNG hoặc WebP.');
 const folder=path.join(__dirname,'../../uploads/ingredients');await fs.mkdir(folder,{recursive:true});const name=`${randomUUID()}.${extension}`;await fs.writeFile(path.join(folder,name),b,{flag:'wx'});
 res.json({success:true,data:{url:`/uploads/ingredients/${name}`}});
}));
router.post('/ingredients',route(async(req,res)=>{
 const values=validate(req.body||{});const [result]=await db.query('INSERT INTO ingredients(name,category,default_unit,storage_type,image_url,created_at) VALUES(?,?,?,?,?,NOW())',values);
 res.status(201).json({success:true,data:{id:String(result.insertId)}});
}));
router.patch('/ingredients/bulk',route(async(req,res)=>{
 const ids=selection(req.body?.ids),updates=[],values=[];
 if(Object.hasOwn(req.body,'category')){updates.push('category=?');values.push(text(req.body.category,50,'Danh mục'));}
 if(Object.hasOwn(req.body,'storage')){if(typeof req.body.storage!=='string'||req.body.storage.trim().length>30)throw fail('Kiểu bảo quản không hợp lệ.');updates.push('storage_type=?');values.push(req.body.storage.trim()||null);}
 if(!updates.length)throw fail('Chọn danh mục hoặc kiểu bảo quản cần sửa.');
 await transaction(async conn=>{const marks=ids.map(()=>'?').join(',');const [rows]=await conn.query(`SELECT ingredient_id FROM ingredients WHERE ingredient_id IN (${marks}) ORDER BY ingredient_id FOR UPDATE`,ids);if(rows.length!==ids.length)throw fail('Một số nguyên liệu không còn tồn tại. Hãy tải lại.',409);await conn.query(`UPDATE ingredients SET ${updates.join(',')} WHERE ingredient_id IN (${marks})`,[...values,...ids]);});
 res.json({success:true,data:{updated:ids.length}});
}));
async function deleteIngredients(ids){
 await transaction(async conn=>{
  const marks=ids.map(()=>'?').join(',');const [rows]=await conn.query(`SELECT ${fields},${usageSQL} FROM ingredients i WHERE i.ingredient_id IN (${marks}) ORDER BY i.ingredient_id FOR UPDATE`,ids);
  if(rows.length!==ids.length)throw fail('Một số nguyên liệu không còn tồn tại. Hãy tải lại.',409);
  const used=rows.filter(row=>Number(row.recipe_count)+Number(row.pantry_count)+Number(row.shopping_count)>0);
  if(used.length)throw fail(`Không thể xóa: ${used.slice(0,3).map(row=>row.name).join(', ')} đang được dùng trong công thức, kho hoặc danh sách mua sắm.`,409);
  await conn.query(`DELETE FROM ingredients WHERE ingredient_id IN (${marks})`,ids);
 });
}
router.post('/ingredients/bulk-delete',route(async(req,res)=>{const ids=selection(req.body?.ids);await deleteIngredients(ids);res.json({success:true,data:{deleted:ids.length}});}));
// Trang rà ảnh chỉ được đổi image_url, không nhận tên/danh mục/đơn vị.
router.patch('/ingredients/:ingredientId/image',route(async(req,res)=>{
 const ingredientId=id(req.params.ingredientId),body=req.body||{};
 if(Object.keys(body).some(key=>!['image','previousImage'].includes(key))||typeof body.previousImage!=='string'||typeof body.image!=='string'||body.image.length>500||(body.image&&!/^https?:\/\//.test(body.image)&&!/^\/uploads\/ingredients\/[a-zA-Z0-9_.-]+$/.test(body.image)))throw fail('Chỉ được cập nhật ảnh nguyên liệu với đường dẫn hợp lệ.');
 if(body.image.startsWith('/uploads/ingredients/')){
  try{const info=await fs.stat(path.join(__dirname,'../../uploads/ingredients',path.basename(body.image)));if(!info.isFile())throw fail('Ảnh không còn trên máy chủ. Hãy chọn ảnh khác.');}
  catch(error){if(error.code==='ENOENT')throw fail('Ảnh không còn trên máy chủ. Hãy chọn ảnh khác.');throw error;}
 }
 const result=await transaction(async conn=>{
  const [rows]=await conn.query('SELECT ingredient_id,name,image_url FROM ingredients WHERE ingredient_id=? FOR UPDATE',[ingredientId]);
  if(!rows.length)throw fail('Nguyên liệu không còn tồn tại.',404);
  if((rows[0].image_url||'')!==body.previousImage)throw fail('Ảnh đã được thay đổi ở nơi khác. Hãy tải lại trước khi thay ảnh.',409);
  await conn.query('UPDATE ingredients SET image_url=? WHERE ingredient_id=?',[body.image||null,ingredientId]);
  return {id:String(ingredientId),name:rows[0].name,image:body.image};
 });
 res.json({success:true,data:result});
}));
router.put('/ingredients/:ingredientId',route(async(req,res)=>{
 const ingredientId=id(req.params.ingredientId),values=validate(req.body||{});
 await transaction(async conn=>{const [rows]=await conn.query('SELECT ingredient_id FROM ingredients WHERE ingredient_id=? FOR UPDATE',[ingredientId]);if(!rows.length)throw fail('Không tìm thấy nguyên liệu.',404);await conn.query('UPDATE ingredients SET name=?,category=?,default_unit=?,storage_type=?,image_url=? WHERE ingredient_id=?',[...values,ingredientId]);});
 res.json({success:true,data:{id:String(ingredientId)}});
}));
router.delete('/ingredients/:ingredientId',route(async(req,res)=>{await deleteIngredients([id(req.params.ingredientId)]);res.json({success:true,data:null});}));
router.use((error,req,res,next)=>{console.error('Ingredient upload:',error.message);res.status(400).json({success:false,message:error.code==='LIMIT_FILE_SIZE'?'Ảnh tối đa 5 MB.':'Không đọc được ảnh tải lên.'});});
module.exports=router;
