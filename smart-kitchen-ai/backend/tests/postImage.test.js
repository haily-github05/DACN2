const test=require("node:test");
const assert=require("node:assert/strict");
const dbPath=require.resolve("../src/config/db");
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:async()=>[[{user_id:7}]]}};
const router=require("../src/routes/postImageRoutes");
const handler=router.stack.find(layer=>layer.route).route.stack[1].handle;
async function request(file,userId="7"){
 let status=200,body;
 const res={status:n=>{status=n;return res;},json:value=>{body=value;return res;}};
 await handler({params:{userId},file},res);
 return {status,body};
}
test("cover upload rejects missing images",async()=>assert.equal((await request(undefined)).status,400));
test("cover upload rejects files without a supported image signature",async()=>{
 const result=await request({buffer:Buffer.from("<html>not an image</html>")});
 assert.equal(result.status,400);
 assert.equal(result.body.success,false);
});
test("cover upload rejects invalid user identifiers",async()=>assert.equal((await request({buffer:Buffer.from("image")},"0")).status,400));
