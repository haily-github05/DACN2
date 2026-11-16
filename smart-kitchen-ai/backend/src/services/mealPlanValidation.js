// AI chọn ID; tên món và dinh dưỡng luôn lấy từ database.
const meals = ['breakfast', 'lunch', 'dinner'];
const failure = (message, status = 502) => Object.assign(new Error(message), {status});
function hydratePlan(output, dates, recipes, people = 2) {
  if (!Array.isArray(output?.days) || output.days.length !== dates.length) throw failure('AI trả về thiếu ngày. Vui lòng tạo lại.');
  const catalog = new Map(recipes.map(r => [String(r.recipe_id), r]));
  const plan = {};
  for (const day of output.days) {
    if (!dates.includes(day.date) || plan[day.date]) throw failure('Ngày trong thực đơn AI không hợp lệ.');
    const used = new Set();
    plan[day.date] = {};
    for (const meal of meals) {
      if (!Array.isArray(day[meal]) || day[meal].length > 6) throw failure('Bữa ăn AI không hợp lệ.');
      plan[day.date][meal] = day[meal].map(id => {
        const recipe = catalog.get(String(id));
        if (!recipe || used.has(String(id))) throw failure('AI chọn món không hợp lệ hoặc trùng trong ngày. Vui lòng tạo lại.');
        used.add(String(id));
        return {servings:people, id:String(recipe.recipe_id), name:recipe.name, minutes:Number(recipe.prep_time || 0) + Number(recipe.cook_time || 0), calories:recipe.calories == null ? null : Number(recipe.calories)};
      });
    }
    if (!used.size) throw failure('AI trả về ngày không có món ăn. Vui lòng tạo lại.');
  }
  return plan;
}
module.exports = {hydratePlan};
