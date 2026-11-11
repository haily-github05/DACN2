// Trang Quản lý người dùng: tìm kiếm, lọc, phân trang và xem chi tiết tài khoản.
// Hỗ trợ thêm người dùng, phân quyền, khóa/mở khóa và xuất danh sách CSV.
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  UnlockKeyhole,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Modal from "../components/Modal";
import { ApiError, apiRequest, formatDate, imageUrl } from "../lib/adminApi";
import type { ManagedUser, UserDetails, UserList } from "../lib/adminApi";
const roleLabels = {
  USER: "Người dùng",
  MODERATOR: "Kiểm duyệt viên",
  ADMIN: "Quản trị viên",
};
const number = (n: number) => n.toLocaleString("vi-VN");
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join("");
function UserAvatar({
  user,
  large = false,
}: {
  user: ManagedUser;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(user.avatar);
  return (
    <span
      className={`managed-avatar ${large ? "large" : ""} tone-${Number(user.id) % 4}`}
    >
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        initials(user.name)
      )}
    </span>
  );
}
type PendingAction = {
  title: string;
  users: ManagedUser[];
  patch: { role?: ManagedUser["role"]; active?: boolean };
};
type Props = {
  token: string;
  adminId: number;
  revision: number;
  onChanged: () => void;
  onUnauthorized: (message: string) => void;
};
export default function QuanLyNguoiDung({
  token,
  adminId,
  revision,
  onChanged,
  onUnauthorized,
}: Props) {
  const [search, setSearch] = useState(""),
    [role, setRole] = useState("ALL"),
    [status, setStatus] = useState("ALL"),
    [page, setPage] = useState(1);
  const [list, setList] = useState<UserList | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null),
    [detail, setDetail] = useState<UserDetails | null>(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState("");
  const [checked, setChecked] = useState<string[]>([]),
    [draftRole, setDraftRole] = useState<ManagedUser["role"]>("USER");
  const [matrix, setMatrix] = useState(false),
    [adding, setAdding] = useState(false),
    [form, setForm] = useState({
      name: "",
      phone: "",
      email: "",
      password: "",
      role: "USER",
    }),
    [formError, setFormError] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null),
    [reason, setReason] = useState(""),
    [actionError, setActionError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;
  const pages = Math.max(1, Math.ceil((list?.total || 0) / 10));
  const eligible = (list?.items || []).filter(
    (user) => Number(user.id) !== adminId,
  );
  const checkedUsers = (list?.items || []).filter((user) =>
    checked.includes(user.id),
  );
  const self = detail?.id === String(adminId);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setChecked([]);
    const timer = setTimeout(
      () => {
        const params = new URLSearchParams({
          q: search,
          role,
          status,
          page: String(page),
        });
        apiRequest<UserList>(`/api/admin/users?${params}`, token, {
          signal: controller.signal,
        })
          .then((value) => {
            if (controller.signal.aborted) return;
            if (page > Math.max(1, Math.ceil(value.total / 10))) {
              setPage(Math.max(1, Math.ceil(value.total / 10)));
              return;
            }
            setList(value);
          })
          .catch((err) => {
            if (controller.signal.aborted) return;
            if (err instanceof ApiError && [401, 403].includes(err.status))
              unauthorized.current(err.message);
            else
              setError(
                err instanceof Error
                  ? err.message
                  : "Không tải được người dùng.",
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
  }, [token, search, role, status, page, revision, reload]);
  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError("");
    apiRequest<UserDetails>(`/api/admin/users/${selectedId}`, token, {
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) {
          setDetail(value);
          setDraftRole(value.role);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && [401, 403].includes(err.status))
          unauthorized.current(err.message);
        else
          setDetailError(
            err instanceof Error ? err.message : "Không tải được chi tiết.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [token, selectedId, revision, reload]);
  const fail = (err: unknown, setter: (message: string) => void) => {
    if (err instanceof ApiError && [401, 403].includes(err.status))
      unauthorized.current(err.message);
    else
      setter(
        err instanceof Error ? err.message : "Không thể thực hiện thao tác.",
      );
  };
  const confirmAction = (value: PendingAction) => {
    setPending(value);
    setReason("");
    setActionError("");
  };
  // Áp dụng thao tác quản lý cho tài khoản được chọn.
  async function applyAction() {
    if (!pending || lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError("");
    let succeeded = 0;
    try {
      for (const user of pending.users) {
        await apiRequest(`/api/admin/users/${user.id}`, token, {
          method: "PATCH",
          body: JSON.stringify({
            ...pending.patch,
            ...(pending.patch.active === false ? { reason } : {}),
          }),
        });
        succeeded++;
      }
      setPending(null);
      setNotice(`Đã cập nhật ${succeeded} tài khoản.`);
      setChecked([]);
      onChanged();
    } catch (err) {
      fail(err, setActionError);
      if (succeeded) {
        setActionError(
          `Đã cập nhật ${succeeded}/${pending.users.length} tài khoản. ${err instanceof Error ? err.message : ""}`,
        );
        setReload((value) => value + 1);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  // Tạo tài khoản mới qua API quản trị.
  async function addUser() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFormError("");
    try {
      const value = await apiRequest<{ id: string }>(
        "/api/admin/users",
        token,
        { method: "POST", body: JSON.stringify(form) },
      );
      setAdding(false);
      setForm({ name: "", phone: "", email: "", password: "", role: "USER" });
      setSelectedId(value.id);
      setSearch("");
      setRole("ALL");
      setStatus("ALL");
      setPage(1);
      setNotice("Đã tạo tài khoản mới.");
      onChanged();
    } catch (err) {
      fail(err, setFormError);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  // Xuất các tài khoản đã chọn hoặc trang hiện tại thành CSV.
  function exportUsers() {
    const users = (list?.items || []).filter(
      (user) => !checked.length || checked.includes(user.id),
    );
    const rows = [
      ["Mã", "Họ tên", "Email", "Số điện thoại", "Vai trò", "Trạng thái"],
      ...users.map((user) => [
        user.id,
        user.name,
        user.email,
        user.phone,
        roleLabels[user.role],
        user.active ? "Hoạt động" : "Bị khóa",
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
    anchor.download = "nguoi-dung.csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  // Đưa bộ lọc và số trang về giá trị ban đầu.
  function reset() {
    setSearch("");
    setRole("ALL");
    setStatus("ALL");
    setPage(1);
  }
  return (
    <div className="users-page">
      <div className="users-heading">
        <div>
          <h1>Quản lý Tài khoản & Phân quyền Hệ thống</h1>
          <p>
            Quản lý thông tin, vai trò và trạng thái truy cập của người dùng.
          </p>
        </div>
        <div className="users-heading-actions">
          <button className="community-export" onClick={() => setMatrix(true)}>
            <ShieldCheck size={15} />
            Phân quyền vai trò
          </button>
          <button
            className="community-export"
            disabled={loading || !list?.items.length || !!error}
            onClick={exportUsers}
          >
            <Download size={15} />
            Xuất CSV
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              setAdding(true);
              setFormError("");
            }}
          >
            <UserPlus size={16} />
            Thêm người dùng mới
          </button>
        </div>
      </div>
      <section className="users-stats" aria-label="Thống kê tài khoản toàn hệ thống">
        <button onClick={reset}>
          <span>Tổng người dùng<Users size={20}/></span>
          <strong>{list ? number(list.stats.total) : "—"}</strong>
          <small>Tất cả tài khoản trong hệ thống</small>
        </button>
        <button className="active-stat" onClick={()=>{setSearch("");setRole("ALL");setStatus("ACTIVE");setPage(1);}}>
          <span>Tài khoản đang hoạt động<UnlockKeyhole size={20}/></span>
          <strong>{list ? number(list.stats.active) : "—"}</strong>
          <small>Được phép đăng nhập và sử dụng</small>
        </button>
        <button className="locked-stat" onClick={()=>{setSearch("");setRole("ALL");setStatus("LOCKED");setPage(1);}}>
          <span>Tài khoản bị khóa<LockKeyhole size={20}/></span>
          <strong>{list ? number(list.stats.locked) : "—"}</strong>
          <small>Đã chặn đăng nhập và phiên cũ</small>
        </button>
        <button className="admin-stat" onClick={()=>{setSearch("");setRole("ADMIN");setStatus("ALL");setPage(1);}}>
          <span>Quản trị viên<ShieldCheck size={20}/></span>
          <strong>{list ? number(list.stats.admins) : "—"}</strong>
          <small>Tài khoản có vai trò Admin</small>
        </button>
        <article className="monthly-stat">
          <span>Người dùng mới trong tháng<UserPlus size={20}/></span>
          <strong>{list ? number(list.stats.newMonth) : "—"}</strong>
          <small>Từ đầu tháng đến hiện tại</small>
        </article>
      </section>
      <section className="panel users-filter-panel">
        <div className="users-filter-top">
          <div>
            <button
              className={status === "ALL" ? "active" : ""}
              onClick={() => {
                setStatus("ALL");
                setPage(1);
              }}
            >
              Tất cả {list && `(${number(list.stats.total)})`}
            </button>
            <button
              className={status === "LOCKED" ? "active locked" : ""}
              onClick={() => {
                setStatus("LOCKED");
                setPage(1);
              }}
            >
              Bị khóa {list && `(${list.stats.locked})`}
            </button>
          </div>
          <span>
            Đang lọc:{" "}
            <strong>
              {role === "ALL"
                ? "Toàn hệ thống"
                : roleLabels[role as ManagedUser["role"]]}
            </strong>
            <button onClick={reset}>Đặt lại</button>
            <button
              className="icon-button"
              disabled={loading}
              aria-label="Làm mới"
              onClick={() => setReload((value) => value + 1)}
            >
              <RefreshCw size={14} />
            </button>
          </span>
        </div>
        <div className="users-filter-inputs">
          <label>
            <Search size={16} />
            <input
              maxLength={100}
              placeholder="Tìm tên, email, số điện thoại…"
              aria-label="Tìm người dùng"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="Lọc vai trò"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả vai trò</option>
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="LOCKED">Bị khóa</option>
          </select>
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
      <div className="users-workspace">
        <section className="panel users-table-panel">
          <div className="users-bulk">
            <div>
              <input
                type="checkbox"
                aria-label="Chọn tất cả tài khoản trên trang trừ tài khoản đang đăng nhập"
                disabled={busy || loading || !!error || !eligible.length}
                checked={
                  !!eligible.length &&
                  eligible.every((user) => checked.includes(user.id))
                }
                onChange={(e) =>
                  setChecked(
                    e.target.checked ? eligible.map((user) => user.id) : [],
                  )
                }
              />
              <span>Chọn hàng loạt</span>
              <small>{checked.length} đã chọn</small>
            </div>
            <div>
              <button
                disabled={
                  busy ||
                  loading ||
                  !!error ||
                  !checkedUsers.some((user) => user.active)
                }
                onClick={() =>
                  confirmAction({
                    title: "Khóa tài khoản đã chọn?",
                    users: checkedUsers.filter((user) => user.active),
                    patch: { active: false },
                  })
                }
              >
                <LockKeyhole size={13} />
                Khóa tài khoản
              </button>
              <button
                disabled={
                  busy ||
                  loading ||
                  !!error ||
                  !checkedUsers.some((user) => !user.active)
                }
                onClick={() =>
                  confirmAction({
                    title: "Mở khóa tài khoản đã chọn?",
                    users: checkedUsers.filter((user) => !user.active),
                    patch: { active: true },
                  })
                }
              >
                <UnlockKeyhole size={13} />
                Mở khóa
              </button>
            </div>
          </div>
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
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th />
                  <th>Thông tin người dùng</th>
                  <th>Vai trò</th>
                  <th>Đăng nhập gần nhất</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="empty-state" role="status">
                      Đang tải người dùng…
                    </td>
                  </tr>
                ) : (
                  !error &&
                  list?.items.map((user) => (
                    <tr
                      key={user.id}
                      className={selectedId === user.id ? "selected-user" : ""}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={checked.includes(user.id)}
                          disabled={busy || Number(user.id) === adminId}
                          aria-label={`Chọn ${user.name}`}
                          onChange={(e) =>
                            setChecked((current) =>
                              e.target.checked
                                ? [...current, user.id]
                                : current.filter((id) => id !== user.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="user-info-button"
                          onClick={() => setSelectedId(user.id)}
                        >
                          <UserAvatar key={user.id + user.avatar} user={user} />
                          <span>
                            <strong>
                              {user.name}
                              {Number(user.id) === adminId && <b>Bạn</b>}
                            </strong>
                            <small>
                              {user.email ||
                                user.phone ||
                                "Chưa có thông tin liên hệ"}
                            </small>
                            <code>ID: #USR-{user.id}</code>
                          </span>
                        </button>
                      </td>
                      <td>
                        <span
                          className={`user-role ${user.role.toLowerCase()}`}
                        >
                          {user.role === "USER"
                            ? "User"
                            : user.role === "ADMIN"
                              ? "Admin"
                              : "Moderator"}
                        </span>
                      </td>
                      <td>
                        <small className="user-login-time">
                          {formatDate(user.lastLoginAt)}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`user-state ${user.active ? "active" : "locked"}`}
                        >
                          <i />
                          {user.active ? "Hoạt động" : "Bị khóa"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`Chi tiết ${user.name}`}
                          onClick={() => setSelectedId(user.id)}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && !error && !list?.items.length && (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      Không có tài khoản phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="community-pagination">
            <span>
              Hiển thị {list?.total ? (page - 1) * 10 + 1 : 0}–
              {Math.min(page * 10, list?.total || 0)} trong{" "}
              <strong>{number(list?.total || 0)}</strong> người dùng
            </span>
            <div>
              <button
                disabled={loading || page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft size={13} />
                Trước
              </button>
              <button className="current">{page}</button>
              <span>/ {pages}</span>
              <button
                disabled={loading || page >= pages}
                onClick={() => setPage((value) => value + 1)}
              >
                Tiếp
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </section>
        <aside className="panel user-detail">
          <div className="user-detail-heading">
            <h2>
              Chi tiết người dùng
            </h2>
            {selectedId && (
              <button
                className="icon-button"
                aria-label="Đóng chi tiết"
                onClick={() => setSelectedId(null)}
              >
                <X size={16} />
              </button>
            )}
          </div>
          {!selectedId ? (
            <div className="user-detail-placeholder">
              <Users size={30} />
              <p>
                Chọn một người dùng trong bảng để xem chi tiết và quản lý quyền.
              </p>
            </div>
          ) : detailLoading ? (
            <p className="empty-state" role="status">
              Đang tải chi tiết…
            </p>
          ) : detailError ? (
            <div className="data-error" role="alert">
              {detailError}
            </div>
          ) : (
            detail?.id === selectedId && (
              <div className="user-detail-body">
                <div className="user-profile">
                  <UserAvatar
                    key={detail.id + detail.avatar}
                    user={detail}
                    large
                  />
                  <h3>{detail.name}</h3>
                  <p>{detail.email || detail.phone}</p>
                  <span className={`user-role ${detail.role.toLowerCase()}`}>
                    {roleLabels[detail.role]}
                  </span>
                </div>
                <div className="user-detail-contact">
                  <p>
                    <span>Số điện thoại</span>
                    <strong>{detail.phone || "Chưa bổ sung"}</strong>
                  </p>
                  <p>
                    <span>Email</span>
                    <strong>{detail.email || "Chưa bổ sung"}</strong>
                  </p>
                  <p>
                    <span>Ngày tham gia</span>
                    <strong>{formatDate(detail.createdAt)}</strong>
                  </p>
                  <p>
                    <span>Đăng nhập gần nhất</span>
                    <strong>{formatDate(detail.lastLoginAt)}</strong>
                  </p>
                </div>
                <div className="user-access">
                  <div>
                    <span>
                      <strong>Kích hoạt tài khoản</strong>
                      <small>Cho phép đăng nhập và sử dụng ứng dụng</small>
                    </span>
                    <button
                      className={`account-switch ${detail.active ? "on" : ""}`}
                      role="switch"
                      aria-checked={detail.active}
                      aria-label="Kích hoạt tài khoản"
                      disabled={busy || self}
                      onClick={() =>
                        confirmAction({
                          title: detail.active
                            ? "Khóa tài khoản?"
                            : "Mở khóa tài khoản?",
                          users: [detail],
                          patch: { active: !detail.active },
                        })
                      }
                    >
                      <i />
                    </button>
                  </div>
                  {!detail.active && (
                    <p className="lock-reason">Lý do: {detail.lockedReason}</p>
                  )}
                  <label>
                    Vai trò tài khoản
                    <select
                      disabled={busy || self}
                      value={draftRole}
                      onChange={(e) =>
                        setDraftRole(e.target.value as ManagedUser["role"])
                      }
                    >
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="primary"
                    disabled={busy || self || draftRole === detail.role}
                    onClick={() =>
                      confirmAction({
                        title: "Thay đổi vai trò tài khoản?",
                        users: [detail],
                        patch: { role: draftRole },
                      })
                    }
                  >
                    <ShieldCheck size={15} />
                    Lưu vai trò
                  </button>
                  {self && (
                    <p className="user-self-note">
                      Không thể tự khóa hoặc hạ quyền tài khoản đang đăng nhập.
                    </p>
                  )}
                </div>
                <h4>THỐNG KÊ HOẠT ĐỘNG</h4>
                <div className="user-activity-stats">
                  {[
                    [detail.stats.posts, "Bài đăng"],
                    [detail.stats.cooked, "Lượt nấu"],
                    [detail.stats.pantry, "Mục trong kho"],
                    [detail.stats.comments, "Bình luận"],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <strong>{number(Number(value))}</strong>
                      <small>{label}</small>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </aside>
      </div>
      <p className="community-footnote">
        Lần đăng nhập chỉ được ghi nhận từ khi bật chức năng này. Xuất CSV áp
        dụng cho tài khoản đã chọn hoặc trang hiện tại.
      </p>
      {matrix && (
        <Modal title="Phân quyền vai trò" onClose={() => setMatrix(false)}>
          <p>Quyền được backend kiểm tra ở mỗi yêu cầu.</p>
          <div className="table-scroll">
            <table className="role-matrix">
              <thead>
                <tr>
                  <th>Chức năng</th>
                  <th>User</th>
                  <th>Moderator</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Dùng ứng dụng mobile</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Vào trang quản trị</td>
                  <td>—</td>
                  <td>—</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Duyệt bài cộng đồng</td>
                  <td>—</td>
                  <td>—</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Quản lý người dùng</td>
                  <td>—</td>
                  <td>—</td>
                  <td>✓</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Moderator được dành cho luồng kiểm duyệt riêng sau này. Tài khoản bị
            khóa không được sử dụng các quyền trên.
          </p>
        </Modal>
      )}
      {pending && (
        <Modal
          title={pending.title}
          onClose={() => {
            if (!busy) setPending(null);
          }}
        >
          <p>
            Áp dụng cho {pending.users.length} tài khoản:{" "}
            {pending.users.map((user) => user.name).join(", ")}.
          </p>
          {pending.patch.role && (
            <p>
              Vai trò mới: <strong>{roleLabels[pending.patch.role]}</strong>.
              Thay đổi có hiệu lực ngay ở yêu cầu tiếp theo.
            </p>
          )}
          {pending.patch.active === false && (
            <label className="rejection-label">
              Lý do khóa
              <textarea
                maxLength={500}
                value={reason}
                disabled={busy}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Lý do khóa tài khoản…"
              />
            </label>
          )}
          {actionError && (
            <div className="data-error" role="alert">
              {actionError}
            </div>
          )}
          <div className="review-buttons">
            <button
              className="community-export"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              Hủy
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() => void applyAction()}
            >
              {busy ? "Đang xử lý…" : "Xác nhận"}
            </button>
          </div>
        </Modal>
      )}
      {adding && (
        <Modal
          title="Thêm người dùng mới"
          onClose={() => {
            if (!busy) {
              setAdding(false);
              setForm((current) => ({ ...current, password: "" }));
            }
          }}
        >
          <p>Tạo tài khoản bằng số điện thoại và mật khẩu ban đầu.</p>
          {formError && (
            <div className="data-error" role="alert">
              {formError}
            </div>
          )}
          <form
            className="community-create"
            onSubmit={(e) => {
              e.preventDefault();
              void addUser();
            }}
          >
            <label>
              Họ tên
              <input
                required
                maxLength={100}
                disabled={busy}
                value={form.name}
                onChange={(e) =>
                  setForm((current) => ({ ...current, name: e.target.value }))
                }
              />
            </label>
            <label>
              Số điện thoại
              <input
                required
                type="tel"
                maxLength={20}
                disabled={busy}
                value={form.phone}
                onChange={(e) =>
                  setForm((current) => ({ ...current, phone: e.target.value }))
                }
              />
            </label>
            <label>
              Email (tuỳ chọn)
              <input
                type="email"
                maxLength={255}
                disabled={busy}
                value={form.email}
                onChange={(e) =>
                  setForm((current) => ({ ...current, email: e.target.value }))
                }
              />
            </label>
            <label>
              Mật khẩu ban đầu
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                disabled={busy}
                value={form.password}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    password: e.target.value,
                  }))
                }
              />
            </label>
            <label>
              Vai trò
              <select
                value={form.role}
                disabled={busy}
                onChange={(e) =>
                  setForm((current) => ({ ...current, role: e.target.value }))
                }
              >
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary" disabled={busy}>
              <UserPlus size={16} />
              {busy ? "Đang tạo…" : "Tạo tài khoản"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
