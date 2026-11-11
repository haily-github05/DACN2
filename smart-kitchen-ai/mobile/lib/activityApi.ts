// Chức năng: API danh sách hoạt động cá nhân theo tài khoản đã xác thực.
import { sortRecipesByName } from "./recipeOrder";
import { kitchenRequest } from "./kitchenApi";
export type ActivityItem = {
  id: string;
  kind: "recipe" | "post";
  title: string;
  image: string;
  minutes?: number;
  calories?: number | null;
  cookCount?: number;
  history?: {
    id: string;
    servings: number;
    rating: number | null;
    note: string;
    planItemId: string | null;
    cookedAt: string;
  }[];
  cookedAt?: string | null;
  author?: string;
  visibility?: "PUBLIC" | "PRIVATE";
  moderationStatus?: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  rejectionReason?: string | null;
  createdAt?: string;
};
export type ActivityData = {
  cooked: ActivityItem[];
  savedRecipes: ActivityItem[];
  savedPosts: ActivityItem[];
  shared: ActivityItem[];
};
export const getActivity = async () => {
  const data = await kitchenRequest<ActivityData>("activity");
  return {
    ...data,
    cooked: sortRecipesByName(data.cooked, (recipe) => recipe.title),
    savedRecipes: sortRecipesByName(
      data.savedRecipes,
      (recipe) => recipe.title,
    ),
  };
};
