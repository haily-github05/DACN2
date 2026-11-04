const fs = require("node:fs");
const path = require("node:path");
const db = require("../src/config/db");
(async () => {
  const [columns] = await db.query("SHOW COLUMNS FROM pantry_items LIKE 'note'");
  if (!columns.length) await db.query(fs.readFileSync(path.join(__dirname, "../migrations/20261104_pantry_note.sql"), "utf8"));
  const [calorieColumns] = await db.query("SHOW COLUMNS FROM recipes LIKE 'calories'");
  if (!calorieColumns.length) await db.query(fs.readFileSync(path.join(__dirname, "../migrations/20261104_recipe_calories.sql"), "utf8"));
  const sql = fs.readFileSync(path.join(__dirname, "../migrations/20261104_community.sql"), "utf8");
  for (const statement of sql.split(";").filter(s => s.trim())) await db.query(statement);
  const [visibilityColumns] = await db.query("SHOW COLUMNS FROM community_posts LIKE 'visibility'");
  if (!visibilityColumns.length) await db.query(fs.readFileSync(path.join(__dirname, "../migrations/20261104_post_visibility.sql"), "utf8"));
  console.log("Đã cập nhật cấu trúc dữ liệu.");
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.end());
