const express=require('express');
const db=require('../config/db');
const {requireAdmin}=require('../services/adminService');
const router=express.Router();router.use(requireAdmin);
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const id=value=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<1)throw fail('Mã công thức không hợp lệ.');return n;};
const route=fn=>async(req,res)=>{res.set('Cache-Control','no-store');try{await fn(req,res);}catch(e){console.error('Admin recipes:',e.message);res.status(e.status||(['ER_ROW_IS_REFERENCED_2','ER_NO_REFERENCED_ROW_2'].includes(e.code)?409:503)).json({success:false,message:e.status?e.message:e.code==='ER_NO_REFERENCED_ROW_2'?'Nguyên liệu đã bị xóa. Hãy tải lại danh mục.':e.code==='ER_ROW_IS_REFERENCED_2'?'Công thức đang được sử dụng. Hãy ngừng hoạt động thay vì xóa.':'Không xử lý được công thức. Vui lòng thử lại.'});}};
async function transaction(fn){const conn=await db.getConnection();try{await conn.beginTransaction();const result=await fn(conn);await conn.commit();return result;}catch(e){await conn.rollback();throw e;}finally{conn.release();}}
const map=r=>({id:String(r.recipe_id),name:r.name,description:r.description||'',image:r.image_url||'',category:r.cuisine_type||r.region||'Khác',region:r.region||'',difficulty:r.difficulty||'',prepTime:Number(r.prep_time||0),cookTime:Number(r.cook_time||0),servings:Number(r.default_servings||1),calories:r.calories==null?null:Number(r.calories),cost:r.estimated_cost==null?null:Number(r.estimated_cost),active:!!r.is_active,summary:r.instructions_summary||''});
router.get('/recipes',route(async(req,res)=>{
 const q=String(req.query.q||'').trim(),category=String(req.query.category||''),difficulty=String(req.query.difficulty||''),status=String(req.query.status||''),quick=String(req.query.quick||''),calories=String(req.query.calories||''),page=Number(req.query.page||1);
 if(q.length>100||category.length>50||difficulty.length>20||!['','active','inactive'].includes(status)||!['','1'].includes(quick)||!['','low','medium','high'].includes(calories)||!Number.isSafeInteger(page)||page<1||page>10000)throw fail('Bộ lọc không hợp lệ.');
 const clauses=[],values=[];
 if(q){const like='%'+q.replace(/[!%_]/g,c=>'!'+c)+'%';clauses.push("(r.name LIKE ? ESCAPE '!' OR EXISTS(SELECT 1 FROM recipe_ingredients ri JOIN ingredients i ON i.ingredient_id=ri.ingredient_id WHERE ri.recipe_id=r.recipe_id AND i.name LIKE ? ESCAPE '!'))");values.push(like,like);}
 if(category){clauses.push("COALESCE(NULLIF(r.cuisine_type,''),NULLIF(r.region,''),'Khác')=?");values.push(category);}
 if(difficulty){clauses.push('r.difficulty=?');values.push(difficulty);}
 if(status)clauses.push(status==='active'?'r.is_active=1':'COALESCE(r.is_active,0)=0');
 if(quick)clauses.push('COALESCE(r.prep_time,0)+COALESCE(r.cook_time,0)<15');
 if(calories)clauses.push(calories==='low'?'r.calories<300':calories==='medium'?'r.calories BETWEEN 300 AND 600':'r.calories>600');
 const where=clauses.length?'WHERE '+clauses.join(' AND '):'';
 const [[rows],[counts],[stats],[categories],[difficulties]]=await Promise.all([
 db.query(`SELECT r.*,(SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.recipe_id=r.recipe_id) AS ingredient_count FROM recipes r ${where} ORDER BY r.name,r.recipe_id LIMIT 10 OFFSET ?`,[...values,(page-1)*10]),
 db.query(`SELECT COUNT(*) AS total FROM recipes r ${where}`,values),
 db.query('SELECT COUNT(*) AS total,COALESCE(SUM(is_active=1),0) AS active,COALESCE(SUM(COALESCE(prep_time,0)+COALESCE(cook_time,0)<15),0) AS quick,(SELECT COUNT(*) FROM cooking_history) AS cooked FROM recipes'),
 db.query("SELECT DISTINCT COALESCE(NULLIF(cuisine_type,''),NULLIF(region,''),'Khác') AS name FROM recipes ORDER BY name"),
 db.query("SELECT DISTINCT difficulty AS name FROM recipes WHERE difficulty IS NOT NULL AND difficulty<>'' ORDER BY name")]);
 res.json({success:true,data:{items:rows.map(r=>({...map(r),ingredientCount:Number(r.ingredient_count)})),total:Number(counts[0].total),stats:Object.fromEntries(Object.entries(stats[0]).map(([k,v])=>[k,Number(v)])),categories:categories.map(r=>r.name),difficulties:difficulties.map(r=>r.name)}});
}));
router.get('/recipes/:recipeId',route(async(req,res)=>{
 const recipeId=id(req.params.recipeId);const [rows]=await db.query('SELECT * FROM recipes WHERE recipe_id=?',[recipeId]);if(!rows.length)throw fail('Không tìm thấy công thức.',404);
 const [[ingredients],[steps]]=await Promise.all([db.query('SELECT ri.*,i.name FROM recipe_ingredients ri JOIN ingredients i ON i.ingredient_id=ri.ingredient_id WHERE ri.recipe_id=? ORDER BY ri.recipe_ingredient_id',[recipeId]),db.query('SELECT * FROM recipe_steps WHERE recipe_id=? ORDER BY step_number',[recipeId])]);
 res.json({success:true,data:{...map(rows[0]),ingredients:ingredients.map(r=>({id:String(r.ingredient_id),name:r.name,quantity:Number(r.quantity),unit:r.unit,optional:!!r.is_optional,note:r.note||''})),steps:steps.map(r=>({instruction:r.instruction,duration:r.duration_minutes==null?null:Number(r.duration_minutes),image:r.image_url||''}))}});
}));
function validate(b){
 const text=(v,max,required=false)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw fail('Thông tin công thức không hợp lệ.');return v.trim();};
 const integer=(v,min,max)=>{if(!Number.isInteger(v)||v<min||v>max)throw fail('Thời gian, khẩu phần hoặc calo không hợp lệ.');return v;};
 const image=text(b.image,500);if(image&&!/^https?:\/\//.test(image)&&!/^\/uploads\/[a-zA-Z0-9_./-]+$/.test(image))throw fail('Đường dẫn ảnh không hợp lệ.');
 if(typeof b.active!=='boolean')throw fail('Trạng thái không hợp lệ.');
 const values=[text(b.name,150,true),text(b.description,10000),image||null,text(b.region,50)||null,text(b.category,50)||null,text(b.difficulty,20)||null,integer(b.prepTime,0,10080),integer(b.cookTime,0,10080),integer(b.servings,1,1000),b.calories==null?null:integer(b.calories,0,100000),b.active?1:0];
 if(!Array.isArray(b.ingredients)||!b.ingredients.length||b.ingredients.length>100||!Array.isArray(b.steps)||!b.steps.length||b.steps.length>100)throw fail('Cần từ 1 đến 100 nguyên liệu và bước nấu.');
 const ingredients=b.ingredients.map(i=>{if(typeof i.quantity!=='number'||!Number.isFinite(i.quantity)||i.quantity<=0||i.quantity>99999999)throw fail('Định lượng không hợp lệ.');if(i.optional!==undefined&&typeof i.optional!=='boolean')throw fail('Thông tin nguyên liệu không hợp lệ.');return [id(i.id),i.quantity,text(i.unit,20,true),i.optional?1:0,text(i.note||'',255)||null];});
 if(new Set(ingredients.map(i=>i[0])).size!==ingredients.length)throw fail('Nguyên liệu bị trùng.');
 const steps=b.steps.map(s=>{const image=text(s.image||'',500);if(image&&!/^https?:\/\//.test(image)&&!/^\/uploads\/[a-zA-Z0-9_./-]+$/.test(image))throw fail('Ảnh bước nấu không hợp lệ.');return [text(s.instruction,10000,true),s.duration==null?null:integer(s.duration,0,10080),image||null];});
 return {values,ingredients,steps};
}
async function writeChildren(conn,recipeId,body){
 for(const i of body.ingredients)await conn.query('INSERT INTO recipe_ingredients(recipe_id,ingredient_id,quantity,unit,is_optional,note) VALUES(?,?,?,?,?,?)',[recipeId,...i]);
 for(const [index,s]of body.steps.entries())await conn.query('INSERT INTO recipe_steps(recipe_id,step_number,instruction,duration_minutes,image_url) VALUES(?,?,?,?,?)',[recipeId,index+1,...s]);
}
router.post('/recipes',route(async(req,res)=>{
 const body=validate(req.body||{});const recipeId=await transaction(async conn=>{const [r]=await conn.query('INSERT INTO recipes(name,description,image_url,region,cuisine_type,difficulty,prep_time,cook_time,default_servings,calories,is_active) VALUES(?,?,?,?,?,?,?,?,?,?,?)',body.values);await writeChildren(conn,r.insertId,body);return r.insertId;});res.status(201).json({success:true,data:{id:String(recipeId)}});
}));
router.put('/recipes/:recipeId',route(async(req,res)=>{
 const recipeId=id(req.params.recipeId),body=validate(req.body||{});await transaction(async conn=>{const [rows]=await conn.query('SELECT recipe_id FROM recipes WHERE recipe_id=? FOR UPDATE',[recipeId]);if(!rows.length)throw fail('Không tìm thấy công thức.',404);await conn.query('UPDATE recipes SET name=?,description=?,image_url=?,region=?,cuisine_type=?,difficulty=?,prep_time=?,cook_time=?,default_servings=?,calories=?,is_active=? WHERE recipe_id=?',[...body.values,recipeId]);await conn.query('DELETE FROM recipe_ingredients WHERE recipe_id=?',[recipeId]);await conn.query('DELETE FROM recipe_steps WHERE recipe_id=?',[recipeId]);await writeChildren(conn,recipeId,body);});res.json({success:true,data:{id:String(recipeId)}});
}));
router.patch('/recipes/:recipeId/status',route(async(req,res)=>{const recipeId=id(req.params.recipeId);if(typeof req.body?.active!=='boolean')throw fail('Trạng thái không hợp lệ.');const [r]=await db.query('UPDATE recipes SET is_active=? WHERE recipe_id=?',[req.body.active?1:0,recipeId]);if(!r.affectedRows)throw fail('Không tìm thấy công thức.',404);res.json({success:true,data:{id:String(recipeId)}});}));
router.post('/recipes/:recipeId/copy',route(async(req,res)=>{
 const source=id(req.params.recipeId);const recipeId=await transaction(async conn=>{const [rows]=await conn.query('SELECT * FROM recipes WHERE recipe_id=? FOR UPDATE',[source]);if(!rows.length)throw fail('Không tìm thấy công thức.',404);const r=rows[0];const [result]=await conn.query('INSERT INTO recipes(name,description,image_url,region,cuisine_type,difficulty,prep_time,cook_time,estimated_cost,default_servings,instructions_summary,is_active,calories) VALUES(?,?,?,?,?,?,?,?,?,?,?,0,?)',[(r.name.slice(0,137)+' (bản sao)'),r.description,r.image_url,r.region,r.cuisine_type,r.difficulty,r.prep_time,r.cook_time,r.estimated_cost,r.default_servings,r.instructions_summary,r.calories]);const target=result.insertId;await conn.query('INSERT INTO recipe_ingredients(recipe_id,ingredient_id,quantity,unit,is_optional,note) SELECT ?,ingredient_id,quantity,unit,is_optional,note FROM recipe_ingredients WHERE recipe_id=?',[target,source]);await conn.query('INSERT INTO recipe_steps(recipe_id,step_number,instruction,image_url,duration_minutes) SELECT ?,step_number,instruction,image_url,duration_minutes FROM recipe_steps WHERE recipe_id=?',[target,source]);return target;});res.status(201).json({success:true,data:{id:String(recipeId)}});
}));
router.delete('/recipes/:recipeId',route(async(req,res)=>{const recipeId=id(req.params.recipeId);await transaction(async conn=>{const [rows]=await conn.query('SELECT recipe_id FROM recipes WHERE recipe_id=? FOR UPDATE',[recipeId]);if(!rows.length)throw fail('Không tìm thấy công thức.',404);const [refs]=await conn.query('SELECT (SELECT COUNT(*) FROM cooking_history WHERE recipe_id=?)+(SELECT COUNT(*) FROM meal_plan_items WHERE recipe_id=?)+(SELECT COUNT(*) FROM recipe_favorites WHERE recipe_id=?) AS total',[recipeId,recipeId,recipeId]);if(Number(refs[0].total))throw fail('Công thức đã được lưu, nấu hoặc lên lịch. Hãy ngừng hoạt động thay vì xóa.',409);await conn.query('DELETE FROM recipes WHERE recipe_id=?',[recipeId]);});res.json({success:true,data:null});}));
module.exports=router;
