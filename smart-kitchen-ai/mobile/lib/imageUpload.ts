// Chức năng: Tải ảnh từ điện thoại hoặc web lên backend bằng multipart.
import { Platform } from "react-native";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { getApiBaseUrl } from "./api";
import { getAuthUser, getCurrentUserId } from "./auth";
export async function uploadImage(uri: string, resource: "pantry" | "posts") {
  const user = await getAuthUser();
  const data = new FormData();
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    data.append("image", blob, "ingredient.jpg");
  } else {
    // Expo SDK 58 fetch cần File/Blob thật, không hỗ trợ object { uri }.
    const file = new File(uri);
    data.append("image", file, file.name);
  }
  const response = await fetch(
    `${getApiBaseUrl()}/api/kitchen/${await getCurrentUserId()}/${resource}/image`,
    {
      method: "POST",
      body: data,
      headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
    },
  );
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.data?.url)
    throw new Error(
      result?.message || "Không thể tải ảnh nguyên liệu lên máy chủ.",
    );
  return result.data.url as string;
}
