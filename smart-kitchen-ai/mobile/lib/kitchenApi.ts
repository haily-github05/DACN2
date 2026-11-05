// Chức năng: API công thức, thực đơn, mua sắm, cộng đồng và lịch sử nấu ăn.
import { sortRecipesByName } from "./recipeOrder";
import { apiRequest } from "./api";
import { getAuthUser, getCurrentUserId } from "./auth";
export async function kitchenRequest<T>(path: string, method = "GET", body?: unknown) {
  return apiRequest<T>(`/api/kitchen/${await getCurrentUserId()}/${path}`, method, body);
}
export type KitchenRecipe = {
  id: string; name: string; description: string; image: string; minutes: number;
  calories: number | null; defaultServings: number; category: string; region?: string; match: number;
  ingredients: { id: string; name: string; amount: number; unit: string; available: boolean }[];
  preferenceInfo?: { ingredientDataAvailable: boolean; allergyMatches: string[]; dislikedIngredients: string[] };
  steps: { title: string; description: string }[];
};
export const getRecipes = async () => sortRecipesByName(
  await (await getAuthUser() ? kitchenRequest<KitchenRecipe[]>("recipes") : apiRequest<KitchenRecipe[]>("/api/kitchen/public-recipes")), recipe => recipe.name,
);
