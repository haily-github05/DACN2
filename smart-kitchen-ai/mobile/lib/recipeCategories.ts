// Chức năng: Quy tắc lọc danh mục Món Việt, Ăn lành mạnh, Món nhanh và Tráng miệng.
type CategorizedRecipe = {
  category: string;
  region?: string | null;
  minutes: number;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().trim();
}

export function matchesRecipeCategory(recipe: CategorizedRecipe, categoryId: string) {
  const category = normalize(recipe.category);
  const region = normalize(recipe.region || "");
  switch (categoryId) {
    case "all":
      return true;
    case "vietnam":
      return ["mien bac", "mien trung", "mien nam", "viet nam", "vietnam"].includes(region)
        || ["mon viet", "viet nam", "vietnam", "vietnamese"].includes(category);
    case "healthy":
      return ["an lanh manh", "healthy"].includes(category);
    case "quick":
      return recipe.minutes > 0 && recipe.minutes <= 30;
    case "dessert":
      return ["trang mieng", "mon trang mieng", "dessert", "banh ngot"].includes(category);
    default:
      return false;
  }
}
