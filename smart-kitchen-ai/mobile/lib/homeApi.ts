
import { getCurrentUserId } from "./auth";
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

  const response = await fetch(
    `${baseUrl}/api/home/${userId}`
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || "Không thể tải Home"
    );
  }

  return result.data;
}
