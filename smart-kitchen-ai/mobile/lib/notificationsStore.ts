// Chức năng: Thông báo thật và trạng thái đã đọc lưu theo tài khoản trên thiết bị.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUserId } from "./auth";
import { kitchenRequest } from "./kitchenApi";
export type NotificationCategory = "pantry" | "meal" | "social" | "shopping";
export type AppNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  occurredAt: string | null;
  route: string;
  params: Record<string, string>;
  action: string;
  urgent?: boolean;
  expired?: boolean;
  image?: string;
  secondaryRoute?: string | null;
  secondaryParams?: Record<string, string>;
  secondaryAction?: string;
  read: boolean;
  detectedAt: string;
};
type LocalState = { read: string[]; seen: Record<string, string> };
type Snapshot = {
  userId: number | null;
  items: AppNotification[];
  loading: boolean;
  error: string;
  unread: number;
};
let snapshot: Snapshot = {
  userId: null,
  items: [],
  loading: false,
  error: "",
  unread: 0,
};
let owner: number | null = null;
let local: LocalState = { read: [], seen: {} };
let pending: { userId: number; promise: Promise<void> } | null = null;
let writes = Promise.resolve();
const listeners = new Set<() => void>();
function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}
export const subscribeNotifications = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getNotificationsSnapshot = () => snapshot;
export async function refreshNotifications() {
  let userId: number;
  try {
    userId = await getCurrentUserId();
  } catch {
    owner = null;
    publish({
      userId: null,
      items: [],
      loading: false,
      error: "Vui lòng đăng nhập để xem thông báo.",
      unread: 0,
    });
    return;
  }
  if (pending?.userId === userId) return pending.promise;
  if (owner !== userId) {
    owner = userId;
    local = { read: [], seen: {} };
    publish({ userId, items: [], loading: false, error: "", unread: 0 });
  }
  const promise = (async () => {
    publish({ ...snapshot, loading: true, error: "" });
    try {
      const [rows, raw] = await Promise.all([
        kitchenRequest<Omit<AppNotification, "read" | "detectedAt">[]>(
          "notifications",
        ),
        AsyncStorage.getItem("notification-state-v1:" + userId),
      ]);
      if (owner !== userId) return;
      let stored: LocalState = { read: [], seen: {} };
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (
            Array.isArray(parsed.read) &&
            parsed.seen &&
            typeof parsed.seen === "object"
          )
            stored = parsed;
        } catch {
          /* Recover from invalid local state. */
        }
      }
      const now = new Date().toISOString();
      const read = new Set([...stored.read, ...local.read]);
      const seen = { ...stored.seen, ...local.seen };
      const items = rows.map((row) => ({
        ...row,
        read: read.has(row.id),
        detectedAt: seen[row.id] || now,
      }));
      for (const item of items) seen[item.id] = item.detectedAt;
      local = {
        read: [...read].slice(-1000),
        seen: Object.fromEntries(Object.entries(seen).slice(-1000)),
      };
      publish({
        userId,
        items,
        loading: false,
        error: "",
        unread: items.filter((item) => !item.read).length,
      });
      const content = JSON.stringify(local);
      writes = writes
        .catch(() => {})
        .then(() =>
          AsyncStorage.setItem("notification-state-v1:" + userId, content),
        );
      await writes;
    } catch (error) {
      if (owner === userId)
        publish({
          ...snapshot,
          loading: false,
          error:
            error instanceof Error ? error.message : "Không thể tải thông báo.",
        });
    }
  })();
  pending = { userId, promise };
  try {
    await promise;
  } finally {
    if (pending?.promise === promise) pending = null;
  }
}
export async function markNotificationsRead(ids: string[]) {
  if (owner === null) return;
  const read = new Set([...local.read, ...ids]);
  local = { ...local, read: [...read].slice(-1000) };
  const items = snapshot.items.map((item) => ({
    ...item,
    read: read.has(item.id),
  }));
  publish({
    ...snapshot,
    items,
    unread: items.filter((item) => !item.read).length,
  });
  const userId = owner,
    content = JSON.stringify(local);
  writes = writes
    .catch(() => {})
    .then(() =>
      AsyncStorage.setItem("notification-state-v1:" + userId, content),
    );
  await writes;
}
