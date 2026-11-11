// Hiển thị số lượt thích, bình luận và lượt lưu của một bài đăng.
// Xem danh sách người tương tác, nội dung bình luận/trả lời và phân trang.
import { useEffect, useRef, useState } from "react";
import { Bookmark, Heart, MessageCircle, RefreshCw } from "lucide-react";
import { ApiError, apiRequest, formatDate } from "../lib/adminApi";
type Kind = "likes" | "comments" | "saves";
type Engagement = {
  counts: Record<Kind, number>;
  items: {
    id: string;
    userId: string;
    author: string;
    content?: string;
    createdAt?: string;
    parentId?: string | null;
    parentContent?: string;
  }[];
};
export default function PostEngagement({
  postId,
  token,
  onUnauthorized,
}: {
  postId: string;
  token: string;
  onUnauthorized: (message: string) => void;
}) {
  const [kind, setKind] = useState<Kind>("comments"),
    [page, setPage] = useState(1),
    [reload, setReload] = useState(0),
    [data, setData] = useState<Engagement | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    apiRequest<Engagement>(
      `/api/admin/posts/${postId}/engagement?type=${kind}&page=${page}`,
      token,
      { signal: c.signal },
    )
      .then((value) => {
        if (c.signal.aborted) return;
        const max = Math.max(1, Math.ceil(value.counts[kind] / 20));
        if (page > max) setPage(max);
        else setData(value);
      })
      .catch((err) => {
        if (c.signal.aborted) return;
        if (err instanceof ApiError && [401, 403].includes(err.status))
          unauthorized.current(err.message);
        else
          setError(
            err instanceof Error ? err.message : "Không tải được tương tác.",
          );
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [postId, token, kind, page, reload]);
  const labels: Record<Kind, string> = {
    likes: "Lượt thích",
    comments: "Bình luận",
    saves: "Lượt lưu",
  };
  return (
    <section className="post-engagement">
      <header>
        <h3>Tương tác bài đăng</h3>
        <button
          className="icon-button"
          aria-label="Làm mới tương tác"
          disabled={loading}
          onClick={() => setReload((n) => n + 1)}
        >
          <RefreshCw size={15} />
        </button>
      </header>
      <div className="post-engagement-tabs">
        {(
          [
            { key: "likes", icon: Heart },
            { key: "comments", icon: MessageCircle },
            { key: "saves", icon: Bookmark },
          ] as const
        ).map(({ key, icon: Icon }) => (
          <button
            key={key}
            aria-pressed={kind === key}
            className={kind === key ? "active" : ""}
            onClick={() => {
              setKind(key);
              setPage(1);
            }}
          >
            <Icon size={16} />
            <strong>
              {data ? data.counts[key].toLocaleString("vi-VN") : "—"}
            </strong>
            <span>{labels[key]}</span>
          </button>
        ))}
      </div>
      {error && (
        <p className="data-error" role="alert">
          {error}
          <button
            className="text-button"
            onClick={() => setReload((n) => n + 1)}
          >
            Thử lại
          </button>
        </p>
      )}
      {loading ? (
        <p role="status">Đang tải tương tác…</p>
      ) : (
        !error &&
        data && (
          <>
            <div className="post-engagement-items">
              {data.items.map((item) => (
                <article key={item.id}>
                  <span className="engagement-initials">
                    {item.author
                      .trim()
                      .split(/\s+/)
                      .slice(-2)
                      .map((s) => s[0])
                      .join("")}
                  </span>
                  <div>
                    <strong>{item.author}</strong>
                    <small>
                      Người dùng #{item.userId}
                      {item.createdAt ? ` · ${formatDate(item.createdAt)}` : ""}
                    </small>
                    {item.parentId && (
                      <blockquote>
                        Trả lời bình luận #{item.parentId}
                        {item.parentContent ? `: ${item.parentContent}` : ""}
                      </blockquote>
                    )}
                    {item.content !== undefined && <p>{item.content}</p>}
                  </div>
                </article>
              ))}
              {!data.items.length && (
                <p>
                  {kind === "comments"
                    ? "Chưa có bình luận."
                    : kind === "likes"
                      ? "Chưa có người thích bài viết."
                      : "Chưa có người lưu bài viết."}
                </p>
              )}
            </div>
            {data.counts[kind] > 20 && (
              <div className="notification-history-pages">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((n) => n - 1)}
                >
                  Trước
                </button>
                <span>
                  {page} / {Math.max(1, Math.ceil(data.counts[kind] / 20))}
                </span>
                <button
                  disabled={page >= Math.ceil(data.counts[kind] / 20)}
                  onClick={() => setPage((n) => n + 1)}
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )
      )}
      <small className="post-engagement-note">
        Bình luận bao gồm cả trả lời. Hệ thống chưa ghi nhận lượt xem và lượt
        chia sẻ.
      </small>
    </section>
  );
}
