// Chức năng: API dữ liệu cho Trang chủ.

import { sortRecipesByName } from "./recipeOrder";
import { getRecipes } from "./kitchenApi";
import { getAuthUser, getCurrentUserId } from "./auth";
import Constants from "expo-constants";
export type HomeRecipe = {
  recipe_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  region: string | null;
  prep_time: number | null;
  cook_time: number | null;
  estimated_cost: number | null;
};

export type HomeData = {
  user: HomeUser;
  pantry: {
    total: number;
    expiringSoon: number;
  };
  recipes: HomeRecipe[];
};
export type HomeUser = {
  user_id: number;
  full_name: string;
  avatar_url: string | null;
};
export async function getHomeData(): Promise<HomeData> {
  if (!(await getAuthUser())) {
    const recipes = await getRecipes();
    return {
      user: { user_id: 0, full_name: "Bạn", avatar_url: null },
      pantry: { total: 0, expiringSoon: 0 },
      recipes: recipes
        .slice(0, 10)
        .map((r) => ({
          recipe_id: Number(r.id),
          name: r.name,
          description: r.description,
          image_url: r.image,
          region: r.region || null,
          prep_time: 0,
          cook_time: r.minutes,
          estimated_cost: null,
        })),
    };
  }
  const userId = await getCurrentUserId();

  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const hostUri = Constants.expoConfig?.hostUri;

  const baseUrl = configuredUrl
    ? configuredUrl.replace(/\/+$/, "")
    : hostUri
      ? `http://${hostUri.split(":")[0]}:3000`
      : null;

  if (!baseUrl) {
    throw new Error("Chưa cấu hình địa chỉ backend");
  }

  const response = await fetch(`${baseUrl}/api/home/${userId}`);

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Không thể tải Home");
  }

  const data: HomeData = result.data;
  return {
    ...data,
    recipes: sortRecipesByName(data.recipes, (recipe) => recipe.name),
  };
}
