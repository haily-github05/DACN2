// Hiển thị ảnh bìa bài đăng, gửi token khi tải ảnh nội bộ cần xác thực.
// Quản lý URL ảnh tạm và trạng thái ảnh không tải được.
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { imageUrl } from "../lib/adminApi";
export default function PostCover({
  path,
  token,
  compact = false,
}: {
  path: string;
  token: string;
  compact?: boolean;
}) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const url = imageUrl(path);
    if (!url) return;
    if (/^https?:\/\//.test(path)) {
      setSrc(path);
      return;
    }
    const controller = new AbortController();
    let objectUrl = "";
    fetch(url, {
      headers: path.startsWith("/uploads/posts/")
        ? { Authorization: `Bearer ${token}` }
        : {},
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Không tải được ảnh.");
        return response.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, token]);
  return src ? (
    <img
      className={compact ? "community-thumbnail" : "detail-image"}
      src={src}
      alt="Ảnh bài viết"
      onError={() => {
        setSrc("");
        setFailed(true);
      }}
    />
  ) : compact ? (
    <span className="community-thumbnail thumbnail-fallback">
      <BookOpen size={19} />
    </span>
  ) : path ? (
    <p>{failed ? "Không tải được ảnh đính kèm." : "Đang tải ảnh…"}</p>
  ) : null;
}
