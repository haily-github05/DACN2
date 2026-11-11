// Chức năng: API kho thực phẩm và tiện ích kiểm tra ngày, hạn sử dụng.
import { apiRequest } from "./api";
import { getAuthUser, getCurrentUserId } from "./auth";
export const INGREDIENTS_KEY = "smart-kitchen-manual-ingredients-v1";
export type Ingredient = {
  id: string;
  ingredientId?: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  purchaseDate: string;
  expiryDate: string;
  note: string;
  createdAt: string;
  image?: string;
};
type PantryRow = {
  id: number;
  ingredient_id?: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  purchase_date: string | null;
  expiry_date: string | null;
  note?: string;
  image_url?: string;
  created_at?: string;
};
export async function getIngredients(): Promise<Ingredient[]> {
  const rows = await apiRequest<PantryRow[]>(
    `/api/pantry/${await getCurrentUserId()}`,
  );
  return rows.map((row) => ({
    id: String(row.id),
    ingredientId:
      row.ingredient_id == null ? undefined : String(row.ingredient_id),
    name: row.name,
    category: row.category || "Khác",
    quantity: Number(row.quantity),
    unit: row.unit,
    location: row.location || "",
    purchaseDate: row.purchase_date?.slice(0, 10) || "",
    expiryDate: row.expiry_date?.slice(0, 10) || "",
    note: row.note || "",
    image: row.image_url,
    createdAt: row.created_at || "",
  }));
}
export async function findIngredient(id: string) {
  return (await getIngredients()).find((item) => item.id === id) ?? null;
}
export async function addIngredient(
  item: Ingredient & { ingredientId?: string; mergeExisting?: boolean },
) {
  return apiRequest<{ id: number; merged?: boolean }>(
    `/api/kitchen/${await getCurrentUserId()}/pantry`,
    "POST",
    item,
  );
}
export async function updateIngredient(item: Ingredient) {
  return apiRequest(
    `/api/kitchen/${await getCurrentUserId()}/pantry/${item.id}`,
    "PUT",
    item,
  );
}
export async function deleteIngredient(id: string) {
  return apiRequest(
    `/api/kitchen/${await getCurrentUserId()}/pantry/${id}`,
    "DELETE",
  );
}
export function daysUntil(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const today = new Date();
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = iso.split("-").map(Number);
  return Math.ceil((Date.UTC(y, m - 1, d) - now) / 86400000);
}
export function dateIsValid(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export type CatalogIngredient = {
  id: string;
  name: string;
  category: string;
  unit: string;
  image: string;
  inPantry: boolean;
};
export async function getIngredientCatalog(): Promise<CatalogIngredient[]> {
  return (await getAuthUser())
    ? apiRequest(`/api/kitchen/${await getCurrentUserId()}/ingredients`)
    : apiRequest("/api/kitchen/public-ingredients");
}
