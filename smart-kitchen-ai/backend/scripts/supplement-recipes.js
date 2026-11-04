// Chức năng: bổ sung công thức tham khảo cho 100 món đã nhập (9201–9300).
// Mặc định chạy thử và rollback; dùng --apply để lưu. Không ghi đè công thức có sẵn.
const assert = require('node:assert/strict');
const { recipes } = require('../data/recipes-9201-9300.json');
const db = require('../src/config/db');
async function main() {
  assert.equal(recipes.length, 100);
  assert.equal(new Set(recipes.map(r => r.recipe_id)).size, 100);
  for (const r of recipes) {
    assert(r.recipe_id >= 9201 && r.recipe_id <= 9300);
    assert(r.ingredients.length && r.steps.length >= 2 && r.servings === 1);
    assert.equal(new Set(r.ingredients.map(i => i.name)).size, r.ingredients.length);
    for (const i of r.ingredients) assert(i.name && i.unit && i.quantity > 0);
  }
  const conn = await db.getConnection();
  const counts = { recipes: 0, ingredients: 0, links: 0, steps: 0 };
  try {
    await conn.beginTransaction();
    const [oldRecipes] = await conn.query('SELECT * FROM recipes WHERE recipe_id BETWEEN 9101 AND 9108 ORDER BY recipe_id');
    const [oldLinks] = await conn.query('SELECT * FROM recipe_ingredients WHERE recipe_id BETWEEN 9101 AND 9108 ORDER BY recipe_ingredient_id');
    const [oldSteps] = await conn.query('SELECT * FROM recipe_steps WHERE recipe_id BETWEEN 9101 AND 9108 ORDER BY step_id');
    for (const r of recipes) {
      const [rows] = await conn.query('SELECT * FROM recipes WHERE recipe_id = ? FOR UPDATE', [r.recipe_id]);
      assert.equal(rows.length, 1, `Không tìm thấy món ${r.recipe_id}`);
      assert.equal(rows[0].name, r.name, `Tên món không khớp ${r.recipe_id}`);
      assert.equal(Number(rows[0].default_servings), r.servings, `Khẩu phần không khớp ${r.recipe_id}`);
      const [links] = await conn.query('SELECT recipe_ingredient_id FROM recipe_ingredients WHERE recipe_id = ?', [r.recipe_id]);
      const [steps] = await conn.query('SELECT step_id FROM recipe_steps WHERE recipe_id = ?', [r.recipe_id]);
      // Bỏ qua toàn bộ món đã có dữ liệu, tránh ghép công thức khác vào dữ liệu người dùng.
      if (links.length || steps.length) continue;
      for (const i of r.ingredients) {
        const [existing] = await conn.query('SELECT ingredient_id FROM ingredients WHERE name = ? AND default_unit = ? ORDER BY ingredient_id LIMIT 1', [i.name, i.unit]);
        let ingredientId = existing[0]?.ingredient_id;
        if (!ingredientId) {
          const [insert] = await conn.query('INSERT INTO ingredients (name, category, default_unit) VALUES (?, ?, ?)', [i.name, i.category, i.unit]);
          ingredientId = insert.insertId;
          counts.ingredients++;
        }
        await conn.query('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, is_optional, note) VALUES (?, ?, ?, ?, 0, ?)', [r.recipe_id, ingredientId, i.quantity, i.unit, i.note]);
        counts.links++;
      }
      for (const [index, instruction] of r.steps.entries()) {
        await conn.query('INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES (?, ?, ?)', [r.recipe_id, index + 1, instruction]);
        counts.steps++;
      }
      await conn.query(`UPDATE recipes SET prep_time = ?, cook_time = ?, instructions_summary = ? WHERE recipe_id = ?`, [rows[0].prep_time || r.prep_time, rows[0].cook_time || r.cook_time, rows[0].instructions_summary || 'Công thức tham khảo cho 1 khẩu phần. Thời gian chuẩn bị chưa tính ngâm/ướp; kiểm tra thành phần thực tế và nhãn gia vị khi có dị ứng.', r.recipe_id]);
      counts.recipes++;
    }
    const [afterRecipes] = await conn.query('SELECT * FROM recipes WHERE recipe_id BETWEEN 9101 AND 9108 ORDER BY recipe_id');
    const [afterLinks] = await conn.query('SELECT * FROM recipe_ingredients WHERE recipe_id BETWEEN 9101 AND 9108 ORDER BY recipe_ingredient_id');
    const [afterSteps] = await conn.query('SELECT * FROM recipe_steps WHERE recipe_id BETWEEN 9101 AND 9108 ORDER BY step_id');
    assert.deepEqual(afterRecipes, oldRecipes);
    assert.deepEqual(afterLinks, oldLinks);
    assert.deepEqual(afterSteps, oldSteps);
    const [missing] = await conn.query(`SELECT recipe_id FROM recipes r WHERE recipe_id BETWEEN 9201 AND 9300 AND (NOT EXISTS (SELECT 1 FROM recipe_ingredients i WHERE i.recipe_id = r.recipe_id) OR NOT EXISTS (SELECT 1 FROM recipe_steps s WHERE s.recipe_id = r.recipe_id))`);
    assert.equal(missing.length, 0, 'Vẫn còn món thiếu công thức');
    if (process.argv.includes('--apply')) await conn.commit();
    else await conn.rollback();
    console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'APPLIED' : 'DRY_RUN_ROLLED_BACK', ...counts, originalRecipesUnchanged: true, missingRecipes: missing.length }));
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.end());
