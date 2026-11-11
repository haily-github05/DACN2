// Phân loại danh mục đã rà soát cho bộ công thức hiện có; mặc định rollback.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const db = require('../src/config/db');
const { recipes } = require('../data/recipes-9201-9300.json');

const groups = {
  'Món ăn nhẹ': [9229,9230,9231,9232,9233,9234,9235,9287,9288,9291,9295],
  'Cháo & súp': [9225,9226,9227,9228,9297,9298],
  'Món canh': [9270,9271,9272,9273,9274,9275,9276,9277,9278],
  'Ăn chay': [9219,9279,9280,9281,9282,9284,9285,9286,9296],
  'Ăn lành mạnh': [9289,9290],
  'Tráng miệng': [9299,9300],
};
const overrides = new Map(Object.entries(groups).flatMap(([category, ids]) => ids.map(id => [id, category])));
// Rau có nước mắm (ví dụ cà tím mỡ hành) không tự gắn nhãn ăn chay.
const ingredientFixes = [
  { name: 'Nước dừa', old: 'Rau củ', category: 'Trái cây' },
  { name: 'Nước cốt dừa', old: 'Rau củ', category: 'Gia vị' },
  { name: 'Rượu vang đỏ', old: 'Rau củ', category: 'Gia vị' },
  { name: 'Me', old: 'Rau củ', category: 'Trái cây' },
];
async function main() {
  const apply = process.argv.includes('--apply');
  const conn = await db.getConnection();
  const changes = { recipes: [], ingredients: [] };
  try {
    await conn.beginTransaction();
    for (const recipe of recipes) {
      const [rows] = await conn.query('SELECT recipe_id,name,cuisine_type FROM recipes WHERE recipe_id=? FOR UPDATE', [recipe.recipe_id]);
      assert.equal(rows.length, 1, `Thiếu công thức ${recipe.recipe_id}`);
      assert.equal(rows[0].name, recipe.name, `Tên món không khớp ${recipe.recipe_id}`);
      if (rows[0].cuisine_type?.trim()) continue;
      const category = overrides.get(recipe.recipe_id) || 'Món chính';
      changes.recipes.push({ id: recipe.recipe_id, name: recipe.name, before: rows[0].cuisine_type, after: category });
      await conn.query('UPDATE recipes SET cuisine_type=? WHERE recipe_id=? AND (cuisine_type IS NULL OR TRIM(cuisine_type)=\'\')', [category, recipe.recipe_id]);
    }
    for (const fix of ingredientFixes) {
      const [rows] = await conn.query('SELECT ingredient_id,name,category FROM ingredients WHERE name=? FOR UPDATE', [fix.name]);
      for (const row of rows) {
        if (row.category !== fix.old) continue;
        changes.ingredients.push({ id: row.ingredient_id, name: row.name, before: row.category, after: fix.category });
        await conn.query('UPDATE ingredients SET category=? WHERE ingredient_id=? AND category=?', [fix.category, row.ingredient_id, fix.old]);
      }
    }
    const [missing] = await conn.query("SELECT COUNT(*) AS count FROM recipes WHERE recipe_id BETWEEN 9201 AND 9300 AND (cuisine_type IS NULL OR TRIM(cuisine_type)='')");
    assert.equal(Number(missing[0].count), 0, 'Vẫn còn công thức chưa phân loại');
    const [summary] = await conn.query('SELECT cuisine_type AS category,COUNT(*) AS count FROM recipes GROUP BY cuisine_type ORDER BY count DESC,category');
    let backup = null;
    if (apply) {
      if (changes.recipes.length || changes.ingredients.length) {
        const dir = path.join(__dirname, '../backups');
        fs.mkdirSync(dir, { recursive: true });
        backup = path.join(dir, `catalog-categories-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        fs.writeFileSync(backup, JSON.stringify({ createdAt: new Date().toISOString(), ...changes }, null, 2), { flag: 'wx', mode: 0o600 });
      }
      await conn.commit();
    } else await conn.rollback();
    console.log(JSON.stringify({ mode: apply ? 'APPLIED' : 'DRY_RUN_ROLLED_BACK', recipesUpdated: changes.recipes.length, ingredientsUpdated: changes.ingredients.length, summary, backup }, null, 2));
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.end());
