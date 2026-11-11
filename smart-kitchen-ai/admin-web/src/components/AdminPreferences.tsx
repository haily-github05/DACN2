// Áp dụng tùy chọn quản trị: giao diện sáng/tối, hiển thị chuông thông báo.
// Theo dõi hoạt động trên trình duyệt và tự đăng xuất khi hết thời gian chờ.
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/adminApi";
export type Preferences = {
  theme: "light" | "dark" | "system";
  notifications: boolean;
  idleMinutes: number;
};
export const defaultPreferences: Preferences = {
  theme: "light",
  notifications: true,
  idleMinutes: 60,
};
export function preferencesChanged(preferences: Preferences) {
  window.dispatchEvent(
    new CustomEvent("admin-preferences", { detail: preferences }),
  );
}
export default function AdminPreferences({
  token,
  onTimeout,
  onNotifications,
}: {
  token: string;
  onTimeout: () => void;
  onNotifications: (enabled: boolean) => void;
}) {
  const [prefs, setPrefs] = useState(defaultPreferences);
  const timeout = useRef(onTimeout),
    notify = useRef(onNotifications);
  timeout.current = onTimeout;
  notify.current = onNotifications;
  useEffect(() => {
    const c = new AbortController();
    apiRequest<{ preferences: Preferences }>("/api/admin/settings", token, {
      signal: c.signal,
    })
      .then((data) => {
        if (!c.signal.aborted) setPrefs(data.preferences);
      })
      .catch(() => {});
    const changed = (event: Event) =>
      setPrefs((event as CustomEvent<Preferences>).detail);
    window.addEventListener("admin-preferences", changed);
    return () => {
      c.abort();
      window.removeEventListener("admin-preferences", changed);
    };
  }, [token]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.adminTheme =
        prefs.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : prefs.theme;
    };
    apply();
    notify.current(prefs.notifications);
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      delete document.documentElement.dataset.adminTheme;
    };
  }, [prefs]);
  useEffect(() => {
    if (!prefs.idleMinutes) return;
    let last = Date.now();
    const touch = () => {
      last = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - last >= prefs.idleMinutes * 60000) timeout.current();
    }, 1000);
    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, touch));
    };
  }, [prefs.idleMinutes, token]);
  return null;
}
