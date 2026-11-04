const test = require("node:test");
const assert = require("node:assert/strict");
const { rankRecipes } = require("../src/services/recipeRecommendationService");
const recipes = [{recipe_id:1}, {recipe_id:2}, {recipe_id:3}];
const items = [
  {recipe_id:1,ingredient_id:10,name:"Trứng gà"},
  {recipe_id:2,ingredient_id:20,name:"Hành lá"},
  {recipe_id:3,ingredient_id:30,name:"Cà rốt"},
];
test("emoji and JSON allergy choices exclude recipes even with optional ingredients",()=>{
  assert.deepEqual(rankRecipes(recipes,items,{allergies:'["🥚 Trứng"]'}).map(r=>r.recipe_id),[2,3]);
});
test("disliked ingredients lower rank without removing the recipe",()=>{
  const result=rankRecipes(recipes,items,{disliked_ingredients:["🌿 Hành lá"]});
  assert.deepEqual(result.map(r=>r.recipe_id),[1,3,2]);
  assert.deepEqual(result[2].preferenceInfo.dislikedIngredients,["🌿 Hành lá"]);
});
test("ingredient IDs are supported for dislikes",()=>{
  assert.deepEqual(rankRecipes(recipes,items,{disliked_ingredients:[10]}).map(r=>r.recipe_id),[2,3,1]);
});
test("soy allergy matches tofu and declared soy sauce",()=>{
  const result=rankRecipes(recipes,[{recipe_id:1,name:"Đậu hũ"},{recipe_id:2,name:"Nước tương"},{recipe_id:3,name:"Cà rốt"}],{allergies:["🫘 Đậu nành"]});
  assert.deepEqual(result.map(r=>r.recipe_id),[3]);
});
test("recipes without ingredient data are excluded with an allergy",()=>{
  assert.equal(rankRecipes(recipes,[],{allergies:["Trứng"]}).length,0);
  assert.equal(rankRecipes(recipes,[],{allergies:[]}).length,3);
});
test("word boundaries do not confuse cá with cà rốt",()=>{
  assert.equal(rankRecipes([{recipe_id:3}],items,{allergies:["Tôm, hải sản"]}).length,1);
});
test("plain-text legacy allergies remain restrictions",()=>{
  assert.deepEqual(rankRecipes(recipes,items,{allergies:"Trứng"}).map(r=>r.recipe_id),[2,3]);
});
test("raw garlic dislike conservatively matches declared garlic",()=>{
  assert.deepEqual(rankRecipes(recipes,[{recipe_id:1,name:"Tỏi"},{recipe_id:2,name:"Gạo"},{recipe_id:3,name:"Nấm đùi gà"}],{disliked_ingredients:["🧄 Tỏi sống","🍄 Nấm"]}).map(r=>r.recipe_id),[2,1,3]);
});
