// Chức năng: Chọn món theo bữa, không lặp món trong cùng ngày.
export type MealType = "breakfast" | "lunch" | "dinner";
type Candidate = { id: string; minutes: number; category?: string };
const normalized = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
export function suggestMeal<T extends Candidate>(
  recipes: T[],
  type: MealType,
  excluded: string[] = [],
  seed = 0,
  usage: Record<string, number> = {},
): T | null {
  const candidates = [
    ...new Map(recipes.map((recipe) => [recipe.id, recipe])).values(),
  ].filter((recipe) => !excluded.includes(recipe.id));
  if (!candidates.length) return null;
  let preferred = candidates;
  if (type === "breakfast") {
    const quick = candidates.filter(
      (recipe) => recipe.minutes > 0 && recipe.minutes <= 20,
    );
    if (quick.length) preferred = quick;
    else {
      const known = candidates.filter((recipe) => recipe.minutes > 0);
      if (known.length) {
        const fastest = Math.min(...known.map((recipe) => recipe.minutes));
        preferred = known.filter((recipe) => recipe.minutes === fastest);
      }
    }
  } else if (type === "lunch") {
    const mains = candidates.filter((recipe) =>
      normalized(recipe.category || "").includes("mon chinh"),
    );
    if (mains.length) preferred = mains;
    else {
      const longer = candidates.filter((recipe) => recipe.minutes >= 20);
      if (longer.length) preferred = longer;
    }
  }
  const leastUsed = Math.min(
    ...preferred.map((recipe) => usage[recipe.id] || 0),
  );
  const pool = preferred.filter(
    (recipe) => (usage[recipe.id] || 0) === leastUsed,
  );
  return pool[((seed % pool.length) + pool.length) % pool.length];
}
export function suggestDay<T extends Candidate>(
  recipes: T[],
  seed = 0,
  usage: Record<string, number> = {},
) {
  const result: Record<MealType, T | null> = {
    breakfast: null,
    lunch: null,
    dinner: null,
  };
  const used: string[] = [];
  for (const type of ["breakfast", "lunch", "dinner"] as const) {
    const recipe = suggestMeal(recipes, type, used, seed, usage);
    result[type] = recipe;
    if (recipe) {
      used.push(recipe.id);
      usage[recipe.id] = (usage[recipe.id] || 0) + 1;
    }
  }
  return result;
}

// Gợi ý nhiều món: sáng 2 món; trưa/tối gồm món chính, rau/đậu và canh nếu có.
export function suggestDayMenu<T extends Candidate & { name: string }>(
  recipes: T[],
  seed = 0,
  usage: Record<string, number> = {},
) {
  const result: Record<MealType, T[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
  };
  const used: string[] = [];
  const label = (r: T) => normalized(r.name);
  const soup = (r: T) => /^(canh|sup)\b/.test(label(r));
  const side = (r: T) =>
    /^(rau|cai|bong cai|dau que|ca tim|dau hu|nam|salad|goi|bi do hap)\b/.test(
      label(r),
    );
  const dessert = (r: T) => /^(che|sua chua|trai cay)\b/.test(label(r));
  const main = (r: T) => !soup(r) && !side(r) && !dessert(r);
  const pick = (type: MealType, pool: T[]) => {
    const next = suggestMeal(pool, type, used, seed, usage);
    if (next) {
      result[type].push(next);
      used.push(next.id);
      usage[next.id] = (usage[next.id] || 0) + 1;
    }
  };
  for (const type of ["breakfast", "lunch", "dinner"] as const) {
    pick(type, recipes.filter(main));
    if (type === "breakfast") {
      const light = recipes.filter(
        (r) => dessert(r) || (side(r) && r.minutes <= 20),
      );
      pick(type, light);
    } else {
      pick(type, recipes.filter(side));
      pick(type, recipes.filter(soup));
    }
  }
  return result;
}
