// Hook: Tải và cập nhật món yêu thích khi mở lại các màn hình.
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { getAuthUser } from "../lib/auth";
import { kitchenRequest } from "../lib/kitchenApi";
export function useRecipeFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    getAuthUser().then(user => user ? kitchenRequest<string[]>("favorites") : []).then(data => { if (active) setFavorites(data); }).catch(error => Alert.alert("Không thể tải món yêu thích", error.message));
    return () => { active = false; };
  }, []));
  const toggleFavorite = async (id: string) => {
    if (busy) return;
    if (!await getAuthUser()) { Alert.alert("Vui lòng đăng nhập", "Vui lòng đăng nhập để sử dụng chức năng lưu món yêu thích."); return; }
    setBusy(true);
    const saved = !favorites.includes(id);
    try {
      await kitchenRequest(`favorites/${id}`, "PUT", { saved });
      setFavorites(prev => saved ? [...prev, id] : prev.filter(x => x !== id));
    } catch (error) { Alert.alert("Không thể lưu", error instanceof Error ? error.message : "Vui lòng thử lại"); }
    finally { setBusy(false); }
  };
  return { favorites, toggleFavorite };
}
