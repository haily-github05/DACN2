import Constants from "expo-constants";

export type StoredPreferences = {
  avatar: string | null;
  diet: string;
  tastes: string[];
  region: string;
  budget: number;
  people: number;
  cookTime: number;
  allergies: string[];
  dislikes: string[];
};

function apiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:3000`;
  throw new Error("Chưa cấu hình EXPO_PUBLIC_API_URL cho backend.");
}

export async function getUserPreferences(userId: number): Promise<StoredPreferences> {
  const response = await fetch(`${apiBaseUrl()}/api/users/${userId}/preferences`);
  const body = await response.text();
  let result: any;
  try { result = JSON.parse(body); }
  catch { throw new Error(`API khẩu vị không trả JSON (HTTP ${response.status}).`); }
  if (!response.ok || result?.success !== true) {
    throw new Error(result?.message || `Không tải được khẩu vị (HTTP ${response.status}).`);
  }
  return result.data as StoredPreferences;
}
