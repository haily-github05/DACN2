// Hiển thị ảnh đại diện quản trị viên; dùng chữ viết tắt khi ảnh thiếu hoặc lỗi.
import { useState } from "react";
import { imageUrl } from "../lib/adminApi";

export default function AdminAvatar({
  name,
  avatar,
  large = false,
}: {
  name: string;
  avatar?: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = avatar ? imageUrl(avatar) : "";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join("");
  return (
    <span className={`avatar ${large ? "large-avatar" : ""}`}>
      {src && !failed ? (
        <img
          className="admin-avatar-image"
          src={src}
          alt={`Ảnh đại diện ${name}`}
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
      {!large && <i />}
    </span>
  );
}
