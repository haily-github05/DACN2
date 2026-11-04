// Thành phần: Hiển thị ảnh thực phẩm — xử lý URL backend và ảnh thiếu/tải lỗi.
import React, { useEffect, useState } from "react";
import { Image, ImageProps, Platform, StyleProp, View, ViewStyle } from "react-native";
import { ChefHat } from "lucide-react-native";
import { getAuthUser } from "../lib/auth";
import { getApiBaseUrl } from "../lib/api";

type FoodImageProps = Omit<ImageProps, "source"> & { uri?: string | null };

export default function FoodImage({ uri, style, onError, ...props }: FoodImageProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  let resolvedUri = uri?.trim() || "";
  if (resolvedUri.startsWith("/")) {
    try {
      resolvedUri = `${getApiBaseUrl()}${resolvedUri}`;
    } catch {
      resolvedUri = "";
    }
  }

  let protectedMedia = false;
  try { protectedMedia = resolvedUri.startsWith(`${getApiBaseUrl()}/uploads/posts/`); } catch { /* Local images need no backend. */ }
  const [session, setSession] = useState<{uri: string; token?: string; webUri?: string} | null>(null);
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    if (protectedMedia) {
      getAuthUser().then(async user => {
        if (Platform.OS === "web") {
          const response = await fetch(resolvedUri, { headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {} });
          if (!response.ok) throw new Error("Image unavailable");
          objectUrl = URL.createObjectURL(await response.blob());
          if (!active) { URL.revokeObjectURL(objectUrl); return; }
        }
        if (active) setSession({ uri: resolvedUri, token: user?.token, webUri: objectUrl });
      }).catch(() => { if (active) setFailedUri(resolvedUri); });
    }
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [protectedMedia, resolvedUri]);

  if (!resolvedUri || failedUri === resolvedUri || (protectedMedia && session?.uri !== resolvedUri)) {
    return (
      <View
        style={[style as StyleProp<ViewStyle>, { alignItems: "center", justifyContent: "center", backgroundColor: "#FEF1EB" }]}
        accessible
        accessibilityLabel="Chưa có ảnh thực phẩm"
      >
        <ChefHat size={30} color="#A23A00" />
      </View>
    );
  }

  return (
    <Image
      {...props}
      style={style}
      source={{ uri: session?.uri === resolvedUri && session.webUri ? session.webUri : resolvedUri, ...(protectedMedia && Platform.OS !== "web" && session?.token ? { headers: { Authorization: `Bearer ${session.token}` } } : {}) }}
      onError={event => {
        setFailedUri(resolvedUri);
        onError?.(event);
      }}
    />
  );
}
