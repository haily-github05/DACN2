// Kiểm tra: Phiên đăng nhập và quyền truy cập ảnh bài viết cá nhân.
const test=require("node:test");
const assert=require("node:assert/strict");
const {createToken,tokenUser,requirePostUser}=require("../src/services/sessionService");
function request(user,token){return {params:{userId:String(user)},headers:token ? {authorization:`Bearer ${token}`} : {}};}
test("a signed session identifies its owner; forged tokens are rejected",()=>{
 const token=createToken(7);
 assert.equal(tokenUser(request(7,token)),7);
 assert.equal(tokenUser(request(7,token+"x")),null);
});
test("posts reject missing sessions and changing userId in the URL",()=>{
 let status;
 const res={status:n=>{status=n;return res;},json:()=>{}};
 requirePostUser(request(7),res,()=>assert.fail("must not continue"));
 assert.equal(status,401);
 requirePostUser(request(8,createToken(7)),res,()=>assert.fail("must not continue"));
 assert.equal(status,403);
 let passed=false;
 requirePostUser(request(7,createToken(7)),res,()=>{passed=true;});
 assert.equal(passed,true);
});
const dbPath=require.resolve("../src/config/db");
let rows=[];let viewerRole="USER";let viewerActive=1;
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:async(sql)=>sql.startsWith("SELECT role")?[[{role:viewerRole,is_active:viewerActive}]]:[rows]}};
const media=require("../src/routes/postMediaAccess");
async function image(user,records){
 rows=records;let status,allowed=false;
 const req={path:"/7_123abc-1234.jpg",headers:user ? {authorization:`Bearer ${createToken(user)}`} : {}};
 await media(req,{sendStatus:n=>{status=n;}},()=>{allowed=true;});
 return {status,allowed};
}
test("private post images are available only to their owner",async()=>{
 assert.equal((await image(7,[{user_id:7,visibility:"PRIVATE"}])).allowed,true);
 assert.equal((await image(8,[{user_id:7,visibility:"PRIVATE"}])).status,404);
 assert.equal((await image(null,[{user_id:7,visibility:"PRIVATE"}])).status,404);
});
test("public images are readable and unpublished uploads remain owner-only",async()=>{
 assert.equal((await image(null,[{user_id:7,visibility:"PUBLIC",moderation_status:"APPROVED"}])).allowed,true);
 assert.equal((await image(7,[])).allowed,true);
 assert.equal((await image(8,[])).status,404);
});

for(const moderation_status of ['PENDING','REJECTED','HIDDEN'])test(`${moderation_status} images are restricted to owner and admin`,async()=>{
 const records=[{user_id:7,visibility:'PUBLIC',moderation_status}];
 assert.equal((await image(null,records)).status,404);
 assert.equal((await image(8,records)).status,404);
 assert.equal((await image(7,records)).allowed,true);
 viewerRole='ADMIN';
 try{assert.equal((await image(8,records)).allowed,true);assert.equal((await image(8,[{user_id:7,visibility:'PRIVATE',moderation_status}])).status,404);}finally{viewerRole='USER';}
});

test('locked sessions cannot load owner-only or admin-only post images',async()=>{
 viewerActive=0;
 try{assert.equal((await image(7,[{user_id:7,visibility:'PRIVATE'}])).status,404);viewerRole='ADMIN';assert.equal((await image(8,[{user_id:7,visibility:'PUBLIC',moderation_status:'PENDING'}])).status,404);}finally{viewerActive=1;viewerRole='USER';}
});
