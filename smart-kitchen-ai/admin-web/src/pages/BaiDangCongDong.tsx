// Trang Quản lý bài đăng cộng đồng: lọc bài theo trạng thái, danh mục và ngày đăng.
// Xem nội dung/tương tác; duyệt, từ chối kèm lý do, ẩn/hiện hoặc xóa bài.
import PostEngagement from "../components/PostEngagement";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileText,
  Hourglass,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import Modal from "../components/Modal";
import PostCover from "../components/PostCover";
import { ApiError, apiRequest, formatDate } from "../lib/adminApi";
import type { AdminPost } from "../lib/adminApi";

const labels = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  HIDDEN: "Đã ẩn",
};
type PostList = {
  items: AdminPost[];
  hasMore: boolean;
  total: number;
  stats: { total: number; pending: number; rejected: number };
  categories: string[];
};
type Props = {
  token: string;
  request: { id: string } | null;
  revision: number;
  onChanged: () => void;
  onUnauthorized: (message: string) => void;
};
const number = (value: number) => value.toLocaleString("vi-VN");
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join("");
}
function tags(post: AdminPost) {
  return [...new Set(post.description.match(/#[\p{L}\p{N}_]+/gu) || [])].slice(
    0,
    3,
  );
}

export default function BaiDangCongDong({
  token,
  request,
  revision,
  onChanged,
  onUnauthorized,
}: Props) {
  const [filter, setFilter] = useState("ALL");
  const [category, setCategory] = useState("");
  const [days, setDays] = useState("ALL");
  const [deleteTarget, setDeleteTarget] = useState<AdminPost | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PostList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminPost | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [reload, setReload] = useState(0);
  const lock = useRef(false);
  const detailController = useRef<AbortController | null>(null);
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;
  const allChecked =
    !!data?.items.length &&
    data.items.every((post) => checked.includes(post.id));
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / 10));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setChecked([]);
    const timer = setTimeout(
      () => {
        const params = new URLSearchParams({
          status: filter,
          page: String(page),
          pageSize: "10",
          q: search.trim(),
          category,
          days,
        });
        apiRequest<PostList>(`/api/admin/posts?${params}`, token, {
          signal: controller.signal,
        })
          .then((value) => {
            if (controller.signal.aborted) return;
            if (page > 1 && page > Math.max(1, Math.ceil(value.total / 10))) {
              setPage(Math.max(1, Math.ceil(value.total / 10)));
              return;
            }
            setData(value);
          })
          .catch((err) => {
            if (controller.signal.aborted) return;
            if (err instanceof ApiError && [401, 403].includes(err.status))
              unauthorized.current(err.message);
            else
              setError(
                err instanceof Error ? err.message : "Không thể tải bài viết.",
              );
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      search ? 300 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, filter, category, days, search, page, revision, reload]);

  useEffect(() => {
    if (!request?.id) return;
    const controller = new AbortController();
    detailController.current = controller;
    setDetailLoading(true);
    setDetailError("");
    setSelected(null);
    setReason("");
    apiRequest<AdminPost>(`/api/admin/posts/${request.id}`, token, {
      signal: controller.signal,
    })
      .then((post) => {
        if (!controller.signal.aborted) setSelected(post);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && [401, 403].includes(err.status))
          unauthorized.current(err.message);
        else
          setDetailError(
            err instanceof Error ? err.message : "Không tải được bài viết.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [request, token]);

  // Duyệt hoặc từ chối bài đang chờ; gửi kèm lý do nếu từ chối.
  async function moderate(status: "APPROVED" | "REJECTED") {
    if (!selected || lock.current) return;
    lock.current = true;
    setBusy(true);
    setDetailError("");
    try {
      await apiRequest(`/api/admin/posts/${selected.id}/moderation`, token, {
        method: "PATCH",
        body: JSON.stringify({ status, reason }),
      });
      setSelected(null);
      setReason("");
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && [401, 403].includes(err.status))
        unauthorized.current(err.message);
      else
        setDetailError(
          err instanceof Error ? err.message : "Không thể xử lý bài viết.",
        );
      if (err instanceof ApiError && err.status === 409)
        setReload((value) => value + 1);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  // Thực hiện thao tác nhanh trên bài được chọn.
  async function quickAction(
    post: AdminPost,
    action: "approve" | "hide" | "restore" | "delete",
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError("");
    setNotice("");
    const path =
      action === "approve"
        ? `/api/admin/posts/${post.id}/moderation`
        : action === "delete"
          ? `/api/admin/posts/${post.id}`
          : `/api/admin/posts/${post.id}/visibility`;
    const payload =
      action === "approve"
        ? { status: "APPROVED" }
        : { hidden: action === "hide" };
    try {
      await apiRequest(path, token, {
        method: action === "delete" ? "DELETE" : "PATCH",
        ...(action === "delete" ? {} : { body: JSON.stringify(payload) }),
      });
      setDeleteTarget(null);
      setNotice(
        action === "approve"
          ? "Đã duyệt bài viết."
          : action === "hide"
            ? "Đã ẩn bài khỏi cộng đồng."
            : action === "restore"
              ? "Đã hiển thị lại bài viết."
              : "Đã xóa bài viết và các tương tác liên quan.",
      );
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && [401, 403].includes(err.status))
        unauthorized.current(err.message);
      else
        setActionError(
          err instanceof Error ? err.message : "Không thể thực hiện thao tác.",
        );
      if (err instanceof ApiError && [404, 409].includes(err.status)) {
        setDeleteTarget(null);
        setReload((value) => value + 1);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  // Xuất các bài đã chọn hoặc trang hiện tại thành CSV.
  function exportPosts() {
    const posts = (data?.items || []).filter(
      (post) => !checked.length || checked.includes(post.id),
    );
    const rows = [
      ["Mã", "Bài đăng", "Tác giả", "Chuyên mục", "Trạng thái", "Ngày gửi"],
      ...posts.map((post) => [
        post.id,
        post.title,
        post.author,
        post.category,
        labels[post.status],
        formatDate(post.createdAt),
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map(
              (value) =>
                `"${(/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`,
            )
            .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bai-dang-cong-dong.csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const openPost = (post: AdminPost) => {
    detailController.current?.abort();
    setDetailLoading(false);
    setSelected(post);
    setReason("");
    setDetailError("");
  };
  const stats = data?.stats;
  return (
    <div className="community-page">
      <div className="community-heading">
        <div>
          <h1>Quản lý Bài đăng cộng đồng</h1>
          <p>
            Danh sách và kiểm duyệt các bài chia sẻ công thức, kinh nghiệm nấu
            ăn từ người dùng.
          </p>
        </div>
        <button
          className="icon-button"
          aria-label="Làm mới bài đăng"
          disabled={loading}
          onClick={() => setReload((value) => value + 1)}
        >
          <RefreshCw size={17} />
        </button>
      </div>
      <section className="community-stats" aria-label="Thống kê bài công khai">
        <button
          className={`community-stat ${filter === "ALL" ? "is-active" : ""}`}
          onClick={() => {
            setFilter("ALL");
            setPage(1);
          }}
        >
          <span>
            <small>Tổng bài đăng</small>
            <strong>{stats ? number(stats.total) : "—"}</strong>
          </span>
          <i>
            <FileText size={20} />
          </i>
        </button>
        <button
          className={`community-stat pending ${filter === "PENDING" ? "is-active" : ""}`}
          onClick={() => {
            setFilter("PENDING");
            setPage(1);
          }}
        >
          <span>
            <small>Chờ duyệt</small>
            <strong>{stats ? number(stats.pending) : "—"}</strong>
          </span>
          <i>
            <Hourglass size={20} />
          </i>
        </button>
        <button
          className={`community-stat rejected ${filter === "REJECTED" ? "is-active" : ""}`}
          onClick={() => {
            setFilter("REJECTED");
            setPage(1);
          }}
        >
          <span>
            <small>Bị từ chối</small>
            <strong>{stats ? number(stats.rejected) : "—"}</strong>
          </span>
          <i>
            <ShieldAlert size={20} />
          </i>
        </button>
      </section>
      <section className="community-toolbar panel" aria-label="Bộ lọc bài đăng">
        <div className="community-filters">
          <label className="community-search">
            <Search size={16} />
            <input
              value={search}
              maxLength={150}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm bài viết, tác giả, #hashtag…"
              aria-label="Tìm bài viết, tác giả hoặc hashtag"
            />
            {search && (
              <button
                className="icon-button"
                aria-label="Xoá tìm kiếm"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                <X size={13} />
              </button>
            )}
          </label>
          <select
            aria-label="Trạng thái bài đăng"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
            <option value="HIDDEN">Đã ẩn</option>
          </select>
          <select
            aria-label="Chuyên mục bài đăng"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả chuyên mục</option>
            {data?.categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <label className="community-date-filter">
            <CalendarDays size={15} />
            <select
              aria-label="Lọc ngày đăng"
              value={days}
              onChange={(e) => {
                setDays(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả thời gian</option>
              <option value="7">7 ngày qua</option>
              <option value="30">30 ngày qua</option>
              <option value="90">90 ngày qua</option>
            </select>
          </label>
        </div>
        <div className="community-tools">
          <button
            className="community-export"
            disabled={loading || !data?.items.length || !!error}
            onClick={exportPosts}
            title={
              checked.length
                ? "Xuất các bài được chọn"
                : "Xuất các bài trên trang hiện tại"
            }
          >
            <Download size={15} />
            {checked.length ? `Xuất ${checked.length} bài` : "Xuất CSV"}
          </button>
        </div>
      </section>
      {notice && (
        <div className="community-action-notice" role="status">
          <Check size={16} />
          {notice}
          <button
            className="icon-button"
            aria-label="Đóng thông báo"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {actionError && !deleteTarget && (
        <div className="data-error" role="alert">
          {actionError}
        </div>
      )}
      {error && (
        <div className="data-error" role="alert">
          {error}
          <button
            className="text-button"
            onClick={() => setReload((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      )}
      <section className="panel community-list" aria-busy={loading}>
        <div className="table-scroll">
          <table className="community-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả bài trên trang"
                    checked={allChecked}
                    disabled={loading || !data?.items.length || !!error}
                    onChange={(e) =>
                      setChecked(
                        e.target.checked
                          ? data?.items.map((post) => post.id) || []
                          : [],
                      )
                    }
                  />
                </th>
                <th>BÀI ĐĂNG</th>
                <th>TÁC GIẢ</th>
                <th>CHUYÊN MỤC</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC NHANH</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="empty-state" role="status">
                    Đang tải bài viết…
                  </td>
                </tr>
              ) : (
                !error &&
                data?.items.map((post) => (
                  <tr
                    key={post.id}
                    className={post.status === "REJECTED" ? "row-rejected" : ""}
                  >
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${post.title}`}
                        checked={checked.includes(post.id)}
                        onChange={(e) =>
                          setChecked((current) =>
                            e.target.checked
                              ? [...current, post.id]
                              : current.filter((id) => id !== post.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="community-post"
                        onClick={() => openPost(post)}
                      >
                        <PostCover
                          key={`${post.id}-${post.image}`}
                          path={post.image}
                          token={token}
                          compact
                        />
                        <span>
                          <strong>{post.title}</strong>
                          <small>
                            {tags(post).length
                              ? tags(post).join("  ·  ")
                              : `#${post.id}  ·  ${new Date(post.createdAt).toLocaleDateString("vi-VN")}`}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <div className="community-author">
                        <span
                          className={`author-avatar avatar-color-${Number(post.userId) % 4}`}
                        >
                          {initials(post.author)}
                        </span>
                        <span>
                          <strong>{post.author}</strong>
                          <small>ID: {post.userId}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="community-category">
                        {post.category}
                      </span>
                      <small className="community-date">
                        {new Date(post.createdAt).toLocaleDateString("vi-VN")}
                      </small>
                    </td>
                    <td>
                      <span
                        className={`community-status ${post.status.toLowerCase()}`}
                      >
                        {labels[post.status]}
                      </span>
                    </td>
                    <td>
                      <div className="community-quick-actions">
                        <button
                          disabled={busy}
                          className="quick-view"
                          onClick={() => openPost(post)}
                          title="Xem toàn bộ bài viết"
                        >
                          <Eye size={14} />
                          Xem
                        </button>
                        {post.status === "PENDING" && (
                          <button
                            disabled={busy}
                            className="quick-approve"
                            onClick={() => void quickAction(post, "approve")}
                            title="Duyệt và xuất bản bài viết"
                          >
                            <Check size={14} />
                            Duyệt
                          </button>
                        )}
                        {post.status === "APPROVED" && (
                          <button
                            disabled={busy}
                            className="quick-hide"
                            onClick={() => void quickAction(post, "hide")}
                            title="Ẩn bài khỏi cộng đồng, vẫn giữ dữ liệu"
                          >
                            <EyeOff size={14} />
                            Ẩn
                          </button>
                        )}
                        {post.status === "HIDDEN" && (
                          <button
                            disabled={busy}
                            className="quick-approve"
                            onClick={() => void quickAction(post, "restore")}
                            title="Hiển thị lại bài đã ẩn"
                          >
                            <Eye size={14} />
                            Hiện lại
                          </button>
                        )}
                        <button
                          disabled={busy}
                          className="quick-delete"
                          onClick={() => {
                            setDeleteTarget(post);
                            setActionError("");
                          }}
                          title="Xóa vĩnh viễn bài viết"
                        >
                          <Trash2 size={14} />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!loading && !error && !data?.items.length && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    <MessageSquare size={26} />
                    <p>Không có bài viết phù hợp.</p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setSearch("");
                        setCategory("");
                        setDays("ALL");
                        setFilter("ALL");
                        setPage(1);
                      }}
                    >
                      Xoá bộ lọc
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="community-pagination">
          <span>
            Hiển thị{" "}
            <strong>
              {data?.total ? (page - 1) * 10 + 1 : 0}–
              {Math.min(page * 10, data?.total || 0)}
            </strong>{" "}
            của <strong>{number(data?.total || 0)}</strong> bài
            {checked.length ? ` · Đã chọn ${checked.length}` : ""}
          </span>
          <div>
            <button
              disabled={loading || page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft size={13} />
              Trước
            </button>
            {[...new Set([1, page - 1, page, page + 1, totalPages])]
              .filter((value) => value >= 1 && value <= totalPages)
              .sort((a, b) => a - b)
              .map((value, index, array) => (
                <span className="page-number-group" key={value}>
                  {index > 0 && value - array[index - 1] > 1 && <span>…</span>}
                  <button
                    className={page === value ? "current" : ""}
                    disabled={loading}
                    aria-label={`Trang ${value}`}
                    aria-current={page === value ? "page" : undefined}
                    onClick={() => setPage(value)}
                  >
                    {number(value)}
                  </button>
                </span>
              ))}
            <button
              disabled={loading || !data?.hasMore}
              onClick={() => setPage((value) => value + 1)}
            >
              Sau
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </section>
      <p className="community-footnote">
        Chỉ hiển thị bài công khai. Xuất CSV áp dụng cho bài đã chọn hoặc trang
        hiện tại.
      </p>
      {(selected || detailLoading || detailError) && (
        <Modal
          title={selected?.title || "Chi tiết bài viết"}
          onClose={() => {
            if (!busy) {
              detailController.current?.abort();
              setSelected(null);
              setDetailLoading(false);
              setDetailError("");
            }
          }}
        >
          {detailError && (
            <div className="data-error" role="alert">
              {detailError}
            </div>
          )}
          {detailLoading && <p role="status">Đang tải bài viết…</p>}
          {selected && (
            <>
              <p>
                {selected.author} · {formatDate(selected.createdAt)} ·{" "}
                {labels[selected.status]}
              </p>
              <PostCover
                key={selected.id}
                path={selected.image}
                token={token}
              />
              <div className="post-content">{selected.description}</div>
              <PostEngagement key={selected.id} postId={selected.id} token={token} onUnauthorized={onUnauthorized}/>
              {selected.status === "PENDING" ? (
                <>
                  <label className="rejection-label">
                    Lý do từ chối
                    <textarea
                      maxLength={1000}
                      disabled={busy}
                      placeholder="Bắt buộc khi từ chối bài viết…"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <div className="review-buttons">
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => void moderate("APPROVED")}
                    >
                      <Check size={16} />
                      {busy ? "Đang xử lý…" : "Duyệt bài"}
                    </button>
                    <button
                      className="reject-button"
                      disabled={busy || !reason.trim()}
                      onClick={() => void moderate("REJECTED")}
                    >
                      <X size={16} />
                      Từ chối
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {selected.rejectionReason && (
                    <p>Lý do: {selected.rejectionReason}</p>
                  )}
                  {selected.reviewedAt && (
                    <p>
                      Được xử lý bởi admin #{selected.reviewedBy} ·{" "}
                      {formatDate(selected.reviewedAt)}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </Modal>
      )}
      {deleteTarget && (
        <Modal
          title="Xóa bài đăng?"
          onClose={() => {
            if (!busy) setDeleteTarget(null);
          }}
        >
          <p>
            Bạn sẽ xóa vĩnh viễn bài “{deleteTarget.title}”, các bình luận, lượt
            thích và lượt lưu liên quan. Hành động này không thể hoàn tác.
          </p>
          <p>Nếu chỉ muốn gỡ bài khỏi cộng đồng, hãy dùng nút Ẩn.</p>
          {actionError && (
            <div className="data-error" role="alert">
              {actionError}
            </div>
          )}
          <div className="review-buttons">
            <button
              className="community-export"
              disabled={busy}
              onClick={() => setDeleteTarget(null)}
            >
              Hủy
            </button>
            <button
              className="reject-button"
              disabled={busy}
              onClick={() => void quickAction(deleteTarget, "delete")}
            >
              <Trash2 size={16} />
              {busy ? "Đang xóa…" : "Xóa vĩnh viễn"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
