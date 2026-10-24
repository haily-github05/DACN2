
import Constants from "expo-constants";

type AuthInput = {
  phone: string;
  password: string;
};

type RegisterInput = AuthInput & {
  full_name: string;
};

export type AuthUser = {
  user_id: number;
  full_name: string;
  phone: string;
};

function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    const metroHost = hostUri.split(":")[0];
    return `http://${metroHost}:3000`;
  }

  throw new Error(
    "Không xác định được địa chỉ backend. Hãy cấu hình EXPO_PUBLIC_API_URL."
  );
}

async function requestApi<T>(
  endpoint: string,
  body: object
): Promise<T> {
  const baseUrl = getApiBaseUrl();

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `Không kết nối được backend tại ${baseUrl}. ` +
      "Hãy kiểm tra backend đang chạy và iPhone cùng Wi-Fi với Mac."
    );
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message ||
      `Yêu cầu thất bại (HTTP ${response.status}).`
    );
  }

  if (!result) {
    throw new Error("Backend không trả về dữ liệu JSON hợp lệ.");
  }

  return result as T;
}

export async function registerWithApi(input: RegisterInput) {
  return requestApi<unknown>("/api/auth/register", input);
}

export async function loginWithApi(
  input: AuthInput
): Promise<AuthUser> {
  const result = await requestApi<{
    success: boolean;
    data: AuthUser;
    message?: string;
  }>("/api/auth/login", input);

  if (!result.data) {
    throw new Error(
      "Backend đăng nhập thành công nhưng không trả về thông tin người dùng."
    );
  }

  return result.data;
}

export type UserPreferences = {
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

export async function saveUserPreferences(
  userId: number,
  preferences: UserPreferences
) {
  const baseUrl = getApiBaseUrl();

  const response = await fetch(
    `${baseUrl}/api/users/${userId}/preferences`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferences),
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message || "Không thể lưu khẩu vị vào MySQL"
    );
  }

  return result;
}
//home 
export type HomeRecipe = {
  recipe_id: number;
  name: string;
  description: string | null;
  estimated_cost: number | string | null;
};

export async function getHomeRecipes(): Promise<HomeRecipe[]> {
  const baseUrl = getApiBaseUrl();

  const response = await fetch(`${baseUrl}/api/recipes`);

  if (!response.ok) {
    throw new Error(`Không thể tải món ăn (${response.status})`);
  }

  const result = await response.json();

  if (!Array.isArray(result)) {
    throw new Error("Dữ liệu món ăn từ backend không hợp lệ");
  }

  return result;
}
