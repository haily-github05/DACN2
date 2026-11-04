// Hook: Đồng bộ thông báo khi mở màn hình và chia sẻ số chưa đọc với header.
import {useCallback,useSyncExternalStore} from "react";
import {useFocusEffect} from "expo-router";
import {getNotificationsSnapshot,subscribeNotifications,refreshNotifications} from "../lib/notificationsStore";
export function useNotifications(enabled = true) {
  const state=useSyncExternalStore(subscribeNotifications,getNotificationsSnapshot,getNotificationsSnapshot);
  useFocusEffect(useCallback(()=>{if(enabled) void refreshNotifications();},[enabled]));
  return state;
}
