// Kiểm tra: Từ khóa tiếng Việt và tìm trên nhiều trường dữ liệu.
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ts=require("typescript");
const source=fs.readFileSync(path.join(__dirname,"../lib/search.ts"),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exportsObject={};
new Function("exports",code)(exportsObject);
const {matchesSearch,normalizeSearch}=exportsObject;
test("Vietnamese accents and letter case do not prevent matching",()=>{
 assert.equal(matchesSearch("DAU HU","Đậu hũ sốt cà chua"),true);
 assert.equal(matchesSearch("thit bo","Thịt bò Fuji"),true);
 assert.equal(matchesSearch("SỮA","Sữa tươi"),true);
});
test("spaces and punctuation are normalized",()=>{
 assert.equal(normalizeSearch("  BÒ — XÀO  "),"bo xao");
 assert.equal(matchesSearch("  ga   nam  ","Ức gà","Nấm đùi gà"),true);
});
test("all keywords may match across recipe name and ingredients",()=>{
 assert.equal(matchesSearch("trung ca rot","Trứng cuộn rau củ","Trứng gà","Cà rốt"),true);
 assert.equal(matchesSearch("trung ca hoi","Trứng cuộn rau củ","Cà rốt"),false);
});
test("post title, author and hashtags can be searched",()=>{
 assert.equal(matchesSearch("salad","Salad cuối tuần","Minh Anh"),true);
 assert.equal(matchesSearch("minh anh","Salad cuối tuần","Minh Ánh"),true);
 assert.equal(matchesSearch("#BepNha","Salad cuối tuần","#BếpNhà"),true);
});
test("empty queries match all and missing fields do not crash",()=>{
 assert.equal(matchesSearch("   ",undefined,null),true);
 assert.equal(matchesSearch("bo",undefined,null),false);
});
