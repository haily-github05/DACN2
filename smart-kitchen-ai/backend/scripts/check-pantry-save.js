// Chẩn đoán: Thử lưu nguyên liệu hợp lệ nhưng rollback để không tạo dữ liệu thử.
const db=require("../src/config/db");
const router=require("../src/routes/kitchenRoutes");
(async()=>{
 const [users]=await db.query("SELECT user_id FROM users ORDER BY user_id LIMIT 1");
 if(!users.length) throw new Error("Chưa có tài khoản thử");
 const original=db.getConnection.bind(db);
 db.getConnection=async()=>{
  const conn=await original();
  return {query:conn.query.bind(conn),beginTransaction:conn.beginTransaction.bind(conn),commit:conn.rollback.bind(conn),rollback:conn.rollback.bind(conn),release:conn.release.bind(conn)};
 };
 const handler=router.stack.find(layer=>layer.route?.path==="/:userId/pantry"&&layer.route.methods.post).route.stack[0].handle;
 const today=new Date().toISOString().slice(0,10);
 let failure;
 await handler({userId:users[0].user_id,body:{name:"Nguyên liệu kiểm tra rollback",category:"Khác",quantity:1,unit:"g",location:"Ngăn mát",purchaseDate:today,expiryDate:today,note:""}}, {json:result=>console.log("SAVE RESULT (ROLLED BACK)",result.success)}, error=>{failure=error;});
 if(failure) throw failure;
})().catch(error=>{console.error(error.code||"ERROR",error.sqlMessage||error.message);process.exitCode=1;}).finally(()=>db.end());
