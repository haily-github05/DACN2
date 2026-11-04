// Chức năng: API và kiểu dữ liệu bài viết cộng đồng.
import { kitchenRequest } from "./kitchenApi";
export type CommunityPost = {
  isOwner?: boolean;
  avatar?: string | null;
  visibility?: "PUBLIC" | "PRIVATE";
  id: string; author: string; initials: string; time: string; category: string;
  title: string; description: string; image: string; likes: number; comments: number;
  liked: boolean; saved: boolean;
};
export const getPosts = (id?: string) => kitchenRequest<CommunityPost[]>(id ? `posts?id=${encodeURIComponent(id)}` : "posts");

export async function uploadPostImage(uri: string) {
  const { uploadImage } = await import("./imageUpload");
  return uploadImage(uri, "posts");
}

export const deletePost = (id: string) => kitchenRequest<null>(`posts/${encodeURIComponent(id)}`, "DELETE");
