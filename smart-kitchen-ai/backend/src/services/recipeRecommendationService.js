// Backend: Lọc gợi ý món theo dị ứng và xếp ưu tiên theo nguyên liệu không thích.
const db = require("../config/db");

function normalize(value) {
  return String(value).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ").trim();
}
function parseChoices(value) {
  if (Array.isArray(value)) return value.map(String);
  if (value == null || value === "") return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch { /* Legacy plain-text preferences remain restrictions. */ }
  return [String(value)];
}
// Preserve Vietnamese accents in ingredient matching: cá must not match cà rốt.
const ingredientText = value => String(value).toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const contains = (value, term) => ` ${ingredientText(value)} `.includes(` ${ingredientText(term)} `);
// Conservative aliases for the choices offered by onboarding-preferences.
// These describe declared ingredients only, not cross-contact or recipe completeness.
const allergyGroups = [
  { choices: ["Tôm, hải sản", "Hải sản", "SEAFOOD"], terms: ["tôm", "cua", "ghẹ", "cá", "mực", "sò", "ốc", "nghêu", "hến", "hàu", "sứa", "bạch tuộc", "nước mắm", "mắm", "hải sản"] },
  { choices: ["Đậu phộng / Lạc", "Đậu phộng", "Lạc", "PEANUT"], terms: ["đậu phộng", "lạc", "bơ đậu phộng", "dầu lạc"] },
  { choices: ["Sữa & Lactose", "Sữa", "MILK"], terms: ["sữa", "lactose", "phô mai", "pho mai", "bơ", "kem", "whey", "casein"] },
  { choices: ["Trứng", "EGG"], terms: ["trứng", "mayonnaise", "mayonaise"] },
  { choices: ["Gluten"], terms: ["gluten", "lúa mì", "bột mì", "bánh mì", "mì", "mì ý", "lúa mạch", "nước tương", "xì dầu"] },
  { choices: ["Đậu nành", "SOY"], terms: ["đậu nành", "đậu tương", "đậu hũ", "đậu phụ", "tàu hũ", "nước tương", "xì dầu", "tương hột", "miso"] },
];
function allergyTerms(choice) {
  return allergyGroups.find(group => group.choices.some(label => normalize(label) === normalize(choice)))?.terms || [choice];
}
function dislikeTerms(choice) {
  const aliases = { "toi song": ["tỏi"], "kho qua": ["khổ qua", "mướp đắng"], "rau mui": ["rau mùi", "ngò rí", "ngò"] };
  return aliases[normalize(choice)] || [choice];
}
function rankRecipes(recipes, ingredients, preferences) {
  const allergies = parseChoices(preferences.allergies);
  const dislikes = parseChoices(preferences.disliked_ingredients);
  return recipes.map(recipe => {
    const items = ingredients.filter(i => String(i.recipe_id) === String(recipe.recipe_id));
    const descriptions = items.map(i => `${i.name || ""} ${i.note || ""}`);
    const allergyMatches = allergies.filter(choice => descriptions.some(value => allergyTerms(choice).some(term => contains(value, term))));
    const dislikedIngredients = dislikes.filter(choice => items.some(i => String(i.ingredient_id) === choice)
      || descriptions.some(value => dislikeTerms(choice).some(term => contains(value, term))));
    return { ...recipe, preferenceInfo: {
      ingredientDataAvailable: items.length > 0,
      allergyMatches,
      dislikedIngredients,
    } };
  }).filter(recipe => recipe.preferenceInfo.allergyMatches.length === 0
    && (allergies.length === 0 || recipe.preferenceInfo.ingredientDataAvailable))
    .sort((a, b) => a.preferenceInfo.dislikedIngredients.length - b.preferenceInfo.dislikedIngredients.length);
}
async function getRecommendations(userId, recipes, ingredients) {
  const [users] = await db.query("SELECT allergies, disliked_ingredients FROM users WHERE user_id = ?", [userId]);
  if (!users.length) throw Object.assign(new Error("Không tìm thấy người dùng"), {status:404});
  if (!ingredients) {
    [ingredients] = await db.query("SELECT ri.recipe_id, ri.ingredient_id, ri.note, i.name FROM recipe_ingredients ri JOIN ingredients i ON i.ingredient_id = ri.ingredient_id");
  }
  return rankRecipes(recipes, ingredients, users[0]);
}
module.exports = { rankRecipes, getRecommendations };
