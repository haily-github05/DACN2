const db = require('../config/db');
const specifications = {
  recipes: { table: 'recipes', id: 'recipe_id', fields: ['name', 'description', 'cuisine_type', 'region'], select: 'recipe_id AS id,name,description,image_url AS image,cuisine_type AS category,region,is_active AS active' },
  ingredients: { table: 'ingredients', id: 'ingredient_id', fields: ['name', 'category'], select: 'ingredient_id AS id,name,category,default_unit AS unit,image_url AS image' },
  users: { table: 'users', id: 'user_id', fields: ['full_name', 'phone', 'email'], select: 'user_id AS id,full_name AS name,phone,email' },
};
async function searchAdmin(query, type, page) {
  const tokens = query.replace(/[đĐ]/g, 'd').split(/\s+/);
  const groups = {};
  await Promise.all(Object.entries(specifications).filter(([key]) => type === 'all' || type === key).map(async ([key, spec]) => {
    const haystack = `REPLACE(REPLACE(CONVERT(CONCAT_WS(' ',CAST(${spec.id} AS CHAR),${spec.fields.join(',')}) USING utf8mb4),'đ','d'),'Đ','D') COLLATE utf8mb4_unicode_ci`;
    const where = tokens.map(() => `${haystack} LIKE ? ESCAPE '!'`).join(' AND ');
    const values = tokens.map(token => `%${token.replace(/[!%_]/g, char => `!${char}`)}%`);
    const [rows] = await db.query(`SELECT ${spec.select} FROM ${spec.table} WHERE ${where} ORDER BY ${spec.id} DESC LIMIT 21 OFFSET ?`, [...values, (page - 1) * 20]);
    groups[key] = { items: rows.slice(0, 20).map(row => ({ ...row, id: String(row.id) })), hasMore: rows.length > 20 };
  }));
  return { query, page, groups };
}
module.exports = { searchAdmin };
