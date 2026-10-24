
import Constants from "expo-constants";

export type ProfileUser = {
  user_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

// Lấy địa chỉ backend
function getApiBaseUrl(): string {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    const metroHost = hostUri.split(":")[0];
    return `http://${metroHost}:3000`;
  }

  throw new Error(
    "Không xác định được backend. Hãy cấu hình EXPO_PUBLIC_API_URL."
  );
}

// Xử lý phản hồi API, tránh lỗi JSON Parse
async function parseResponse(response: Response) {
  const text = await response.text();

  let result: any;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(
      `Backend không trả về JSON (HTTP ${response.status}). ` +
      "Kiểm tra đường dẫn API và backend."
    );
  }

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ||
        `Yêu cầu thất bại (HTTP ${response.status})`
    );
  }

  return result;
}

// Chuyển đường dẫn ảnh MySQL thành URL đầy đủ
export function avatarSource(
  avatarUrl: string | null | undefined
): string | null {
  if (!avatarUrl) return null;

  if (
    avatarUrl.startsWith("http://") ||
    avatarUrl.startsWith("https://")
  ) {
    return avatarUrl;
  }

  if (avatarUrl.startsWith("/")) {
    return `${getApiBaseUrl()}${avatarUrl}`;
  }

  return null;
}

// GET: Lấy thông tin tài khoản theo user_id
export async function getProfile(
  userId: number
): Promise<ProfileUser> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/profile/${userId}`
  );

  const result = await parseResponse(response);

  return result.data as ProfileUser;
}

// PUT: Cập nhật họ tên, email, số điện thoại
export async function updateProfile(
  userId: number,
  data: {
    full_name: string;
    email: string | null;
    phone: string | null;
  }
): Promise<ProfileUser> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/profile/${userId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  const result = await parseResponse(response);

  return result.data as ProfileUser;
}

// POST: Upload ảnh đại diện lên backend
export async function updateAvatar(
  userId: number,
  imageUri: string
): Promise<string> {
  const formData = new FormData();

  const extension =
    imageUri.split("?")[0].split(".").pop()?.toLowerCase();

  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";

  formData.append("avatar", {
    uri: imageUri,
    name: `avatar_${userId}.${extension === "png" || extension === "webp" ? extension : "jpg"}`,
    type: mimeType,
  } as any);

  const response = await fetch(
    `${getApiBaseUrl()}/api/profile/${userId}/avatar`,
    {
      method: "POST",
      body: formData,
    }
  );

  const result = await parseResponse(response);

  if (!result.avatar_url) {
    throw new Error(
      "Backend chưa trả về đường dẫn ảnh đại diện."
    );
  }

  return result.avatar_url as string;
}
