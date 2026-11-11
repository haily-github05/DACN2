// Chức năng: API và kiểu dữ liệu bài viết cộng đồng.
import { apiRequest } from "./api";
import { getAuthUser } from "./auth";
import { kitchenRequest } from "./kitchenApi";
export type CommunityPost = {
  isOwner?: boolean;
  following?: boolean;
  avatar?: string | null;
  visibility?: "PUBLIC" | "PRIVATE";
  moderationStatus?: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  rejectionReason?: string | null;
  id: string;
  author: string;
  initials: string;
  time: string;
  category: string;
  title: string;
  description: string;
  image: string;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
};
export const getPosts = async (id?: string) => {
  const query = id ? `?id=${encodeURIComponent(id)}` : "";
  return (await getAuthUser())
    ? kitchenRequest<CommunityPost[]>(`posts${query}`)
    : apiRequest<CommunityPost[]>(`/api/kitchen/public-posts${query}`);
};

export async function uploadPostImage(uri: string) {
  const { uploadImage } = await import("./imageUpload");
  return uploadImage(uri, "posts");
}

export const deletePost = (id: string) =>
  kitchenRequest<null>(`posts/${encodeURIComponent(id)}`, "DELETE");

export type PostComment = {
  parentId?: string | null;
  replyCount?: number;
  id: string;
  author: string;
  avatar: string | null;
  initials: string;
  content: string;
  createdAt: string;
  isOwner: boolean;
};
export const getPostComments = async (
  id: string,
  before?: string,
  parentId?: string,
) => {
  const query = new URLSearchParams({
    ...(before ? { before } : {}),
    ...(parentId ? { parentId } : {}),
  }).toString();
  return (await getAuthUser())
    ? kitchenRequest<{ items: PostComment[]; hasMore: boolean }>(
        `posts/${encodeURIComponent(id)}/comments?${query}`,
      )
    : apiRequest<{ items: PostComment[]; hasMore: boolean }>(
        `/api/kitchen/public-posts/${encodeURIComponent(id)}/comments?${query}`,
      );
};
export const addPostComment = (
  id: string,
  content: string,
  parentId?: string,
) =>
  kitchenRequest<PostComment>(
    `posts/${encodeURIComponent(id)}/comments`,
    "POST",
    { content, parentId },
  );
export const deletePostComment = (id: string, commentId: string) =>
  kitchenRequest<{ deletedCount: number }>(
    `posts/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`,
    "DELETE",
  );
export const followPostAuthor = (id: string, active: boolean) =>
  kitchenRequest<{ following: boolean }>(
    `posts/${encodeURIComponent(id)}/follow`,
    "PUT",
    { active },
  );
