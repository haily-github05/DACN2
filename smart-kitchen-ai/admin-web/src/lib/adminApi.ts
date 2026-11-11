export type AdminSession = {
  token: string;
  id: number;
  name: string;
  avatar?: string;
};
export type Recipe = {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  active: boolean;
  createdAt: string | null;
  ingredientCount: number;
};
export type Overview = {
  days: number;
  today: string;
  stats: { key: string; label: string; value: number; added: number }[];
  trends: { day: string; users: number; cooked: number }[];
  categories: { name: string; count: number; percent: number }[];
  recipes: Recipe[];
  events: {
    id: string;
    type: string;
    title: string;
    body: string;
    time: string | null;
  }[];
  ai: { configured: boolean; message: string };
};
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export function imageUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return path.startsWith("/uploads/") ? `${apiBase}${path}` : "";
}
export async function apiRequest<T>(
  path: string,
  token = "",
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, 15000);
  options.signal?.addEventListener("abort", abort);
  if (options.signal?.aborted) abort();
  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success)
      throw new ApiError(
        body?.message || "Không thể tải dữ liệu từ backend.",
        response.status,
      );
    return body.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw error;
    throw new Error(
      "Không kết nối được backend hoặc yêu cầu đã hết thời gian. Kiểm tra máy chủ và thử lại.",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
export const getOverview = (token: string, days: string, signal: AbortSignal) =>
  apiRequest<Overview>(`/api/admin/overview?days=${days}`, token, { signal });
export function readSession(): AdminSession | null {
  try {
    const session = JSON.parse(
      sessionStorage.getItem("smart-kitchen-admin") || "null",
    );
    return session &&
      typeof session.token === "string" &&
      typeof session.name === "string" &&
      Number.isSafeInteger(session.id)
      ? session
      : null;
  } catch {
    return null;
  }
}
export function saveSession(session: AdminSession | null) {
  try {
    if (session)
      sessionStorage.setItem("smart-kitchen-admin", JSON.stringify(session));
    else sessionStorage.removeItem("smart-kitchen-admin");
  } catch {
    /* Phiên vẫn hoạt động trong bộ nhớ khi trình duyệt chặn storage. */
  }
}
export function formatDate(value: string | null) {
  if (!value) return "Chưa có thời gian";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa có thời gian"
    : date.toLocaleString("vi-VN");
}

export type SearchItem = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  region?: string;
  image?: string;
  unit?: string;
  phone?: string | null;
  email?: string | null;
};
export type SearchResults = {
  query: string;
  page: number;
  groups: Partial<
    Record<
      "recipes" | "ingredients" | "users",
      { items: SearchItem[]; hasMore: boolean }
    >
  >;
};

export type AdminPost = {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  author: string;
  userId: string;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
};
export type AdminNotificationsData = {
  pending: number;
  unread: number;
  items: {
    id: string;
    title: string;
    author: string;
    createdAt: string;
    read: boolean;
  }[];
};

export type ManagedUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  active: boolean;
  lockedReason: string;
  lastLoginAt: string | null;
  createdAt: string | null;
};
export type UserDetails = ManagedUser & {
  stats: { posts: number; cooked: number; pantry: number; comments: number };
};
export type UserList = {
  items: ManagedUser[];
  total: number;
  stats: {
    total: number;
    active: number;
    locked: number;
    admins: number;
    newMonth: number;
  };
};

export type CatalogIngredient = {
  id: string;
  name: string;
  category: string;
  unit: string;
  storage: string;
  image: string;
  createdAt: string | null;
  usage: { recipes: number; pantry: number; shopping: number };
};
export type IngredientCatalog = {
  items: CatalogIngredient[];
  total: number;
  stats: { total: number; categories: number; units: number; storage: number };
  categories: { name: string; count: number }[];
  units: { name: string; count: number }[];
  storages: { name: string; count: number }[];
};
