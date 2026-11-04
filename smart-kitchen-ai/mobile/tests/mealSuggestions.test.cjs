// Kiểm tra: Bữa sáng nhanh và ba món khác nhau trong ngày.
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ts=require("typescript");
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,"../lib/mealSuggestions.ts"),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exportsObject={};
new Function("exports",code)(exportsObject);
const {suggestDay,suggestMeal}=exportsObject;
const recipes=[
 {id:"1",minutes:10,category:"Ăn lành mạnh"},
 {id:"2",minutes:20,category:"Món chính"},
 {id:"3",minutes:30,category:"Món chính"},
 {id:"4",minutes:25,category:"Món canh"},
];
test("each day has three distinct recipes and a quick breakfast",()=>{
 const usage={};
 for(let i=0;i<7;i++){
  const plan=suggestDay(recipes,i,usage);
  assert.equal(new Set(Object.values(plan).map(r=>r.id)).size,3);
  assert.ok(plan.breakfast.minutes<=20);
 }
});
test("lunch prefers a main dish left after breakfast",()=>{
 const plan=suggestDay(recipes);
 assert.equal(plan.lunch.category,"Món chính");
});
test("too few recipes leaves meals empty instead of repeating",()=>{
 const plan=suggestDay(recipes.slice(0,2));
 assert.equal(Object.values(plan).filter(Boolean).length,2);
 assert.equal(plan.dinner,null);
});
test("changing a meal cannot reuse an excluded recipe",()=>{
 assert.equal(suggestMeal(recipes,"breakfast",["1","2","3"]).id,"4");
 assert.equal(suggestMeal(recipes,"dinner",["1","2","3","4"]),null);
});
test("without quick options breakfast picks the shortest known cooking time",()=>{
 assert.equal(suggestDay(recipes.slice(2)).breakfast.id,"4");
});
test("duplicate recipe IDs never fill multiple meals",()=>{
 const plan=suggestDay([recipes[0],recipes[0]]);
 assert.equal(Object.values(plan).filter(Boolean).length,1);
});
test('multi-dish day has two breakfast dishes and main, vegetable, soup for other meals', () => {
 const recipes = [
  {id:'a',name:'Bánh mì trứng',minutes:10}, {id:'b',name:'Cơm gà',minutes:35},
  {id:'c',name:'Cá kho',minutes:35}, {id:'d',name:'Sữa chua trái cây',minutes:10},
  {id:'e',name:'Rau muống xào',minutes:10}, {id:'f',name:'Cải thìa xào',minutes:10},
  {id:'g',name:'Canh bí',minutes:15}, {id:'h',name:'Canh nấm',minutes:15},
 ];
 const day=exportsObject.suggestDayMenu(recipes);
 assert.deepEqual(Object.values(day).map(meal=>meal.length),[2,3,3]);
 assert.equal(day.breakfast[0].id,'a');
 assert(day.lunch.some(r=>r.name.startsWith('Canh')));
 assert(day.dinner.some(r=>r.name.startsWith('Canh')));
 assert.equal(new Set(Object.values(day).flat().map(r=>r.id)).size,8);
});
test('multi-dish suggestions leave missing roles empty without duplicating recipes', () => {
 const day=exportsObject.suggestDayMenu([{id:'a',name:'Cơm gà',minutes:20}]);
 assert.equal(Object.values(day).flat().length,1);
});
