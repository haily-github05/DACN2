// Trang Cài đặt hệ thống: sửa hồ sơ, ảnh đại diện và mật khẩu của quản trị viên.
// Lưu tùy chọn giao diện, thông báo và thời gian tự đăng xuất theo tài khoản.
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Monitor,
  Save,
  Settings2,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import { ApiError, apiRequest, formatDate, imageUrl } from "../lib/adminApi";
import { preferencesChanged } from "../components/AdminPreferences";
import type { Preferences } from "../components/AdminPreferences";
type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: string;
  active: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
};
type Settings = { profile: Profile; preferences: Preferences };
type Props = {
  token: string;
  onChanged: () => void;
  onUnauthorized: (message: string) => void;
  onLogout: () => void;
};
export default function CaiDatHeThong({
  token,
  onChanged,
  onUnauthorized,
  onLogout,
}: Props) {
  const [data, setData] = useState<Settings | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [prefs, setPrefs] = useState<Preferences | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0),
    [tab, setTab] = useState("profile");
  const [password, setPassword] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }),
    [show, setShow] = useState(false),
    [avatarFailed, setAvatarFailed] = useState(false);
  const lock = useRef(false),
    unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    apiRequest<Settings>("/api/admin/settings", token, { signal: c.signal })
      .then((value) => {
        if (c.signal.aborted) return;
        setData(value);
        setProfile(value.profile);
        setPrefs(value.preferences);
        setAvatarFailed(false);
      })
      .catch((err) => {
        if (c.signal.aborted) return;
        if (err instanceof ApiError && [401, 403].includes(err.status))
          unauthorized.current(err.message);
        else
          setError(
            err instanceof Error ? err.message : "Không tải được cài đặt.",
          );
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [token, reload]);
  // Chặn yêu cầu trùng, hiển thị lỗi và quản lý trạng thái đang lưu.
  async function action(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (err) {
      if (err instanceof ApiError && [401, 403].includes(err.status))
        unauthorized.current(err.message);
      else
        setError(
          err instanceof Error ? err.message : "Không lưu được cài đặt.",
        );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  // Lưu thông tin cá nhân và yêu cầu làm mới hồ sơ ở đầu trang.
  async function saveProfile() {
    if (!profile) return;
    await action(async () => {
      await apiRequest("/api/admin/settings/profile", token, {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      setData((current) => (current ? { ...current, profile } : current));
      setNotice("Đã lưu hồ sơ quản trị viên.");
      onChanged();
    });
  }
  // Lưu tùy chọn rồi thông báo để giao diện áp dụng ngay.
  async function savePrefs() {
    if (!prefs) return;
    await action(async () => {
      await apiRequest("/api/admin/settings/preferences", token, {
        method: "PUT",
        body: JSON.stringify(prefs),
      });
      setData((current) =>
        current ? { ...current, preferences: prefs } : current,
      );
      preferencesChanged(prefs);
      setNotice("Đã áp dụng và lưu các tùy chọn.");
    });
  }
  // Xác nhận mật khẩu hiện tại và gửi yêu cầu đổi mật khẩu.
  async function changePassword() {
    await action(async () => {
      await apiRequest("/api/admin/settings/password", token, {
        method: "PUT",
        body: JSON.stringify(password),
      });
      setPassword({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setNotice(
        "Đã đổi mật khẩu. Hãy dùng mật khẩu mới ở lần đăng nhập tiếp theo.",
      );
    });
  }
  // Tải lên hoặc xóa ảnh đại diện; cập nhật ngay sau khi API thành công.
  async function avatar(file?: File) {
    if (file && file.size > 5 * 1024 * 1024) {
      setError("Ảnh tối đa 5 MB.");
      return;
    }
    await action(async () => {
      let value = "";
      if (file) {
        const form = new FormData();
        form.append("avatar", file);
        const result = await apiRequest<{ avatar: string }>(
          "/api/admin/settings/avatar",
          token,
          { method: "POST", body: form },
        );
        value = result.avatar;
      } else
        await apiRequest("/api/admin/settings/avatar", token, {
          method: "DELETE",
        });
      setProfile((current) =>
        current ? { ...current, avatar: value } : current,
      );
      setData((current) =>
        current
          ? { ...current, profile: { ...current.profile, avatar: value } }
          : current,
      );
      setAvatarFailed(false);
      setNotice("Đã cập nhật ảnh đại diện.");
      onChanged();
    });
  }
  const tabs = [
    { id: "profile", label: "Hồ sơ & Tài khoản Admin", icon: UserRound },
    { id: "security", label: "Bảo mật & Đổi mật khẩu", icon: LockKeyhole },
    { id: "general", label: "Giao diện & Cấu hình", icon: Settings2 },
    { id: "notifications", label: "Thông báo & Phiên làm việc", icon: Bell },
  ];
  const formId =
    tab === "profile"
      ? "settings-profile"
      : tab === "security"
        ? "settings-password"
        : "settings-preferences";
  return (
    <div className="settings-page">
      <header className="settings-heading">
        <div>
          <div>
            <h1>Cài đặt hệ thống</h1>
            <span>Admin Profile & Config</span>
          </div>
          <p>
            Quản lý tài khoản quản trị, bảo mật mật khẩu và các tùy chọn làm
            việc.
          </p>
        </div>
        <div>
          <button
            className="community-export"
            disabled={busy || !data}
            onClick={() => {
              if (data) {
                setProfile({ ...data.profile });
                setPrefs({ ...data.preferences });
              }
              setPassword({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
              setError("");
              setNotice("Đã hủy các thay đổi chưa lưu.");
            }}
          >
            Hủy thay đổi
          </button>
          <button
            className="primary"
            form={formId}
            type="submit"
            disabled={loading || busy || !data}
          >
            <Save size={15} />
            {busy ? "Đang lưu…" : "Lưu thiết lập"}
          </button>
        </div>
      </header>
      <nav className="settings-tabs" aria-label="Nhóm cài đặt">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <div className="data-error" role="alert">
          {error}
          {!data && (
            <button
              className="text-button"
              onClick={() => setReload((n) => n + 1)}
            >
              Thử lại
            </button>
          )}
        </div>
      )}
      {notice && (
        <p className="community-action-notice" role="status">
          <Check size={15} />
          {notice}
        </p>
      )}
      {loading ? (
        <p className="panel empty-state">Đang tải cài đặt…</p>
      ) : (
        profile &&
        prefs && (
          <div className="settings-layout">
            <div>
              {tab === "profile" && (
                <section className="panel settings-card">
                  <header>
                    <UserRound size={20} />
                    <div>
                      <h2>Thông tin hồ sơ Quản trị viên</h2>
                      <p>Thông tin cá nhân và quyền tài khoản hiện tại</p>
                    </div>
                    <b className="settings-active">
                      {profile.active
                        ? "Tài khoản kích hoạt"
                        : "Tài khoản bị khóa"}
                    </b>
                  </header>
                  <div className="settings-avatar-box">
                    {profile.avatar && !avatarFailed ? (
                      <img
                        src={imageUrl(profile.avatar)}
                        alt="Ảnh quản trị viên"
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      <span className="settings-avatar-placeholder">
                        {profile.name
                          .trim()
                          .split(/\s+/)
                          .slice(-2)
                          .map((s) => s[0])
                          .join("")}
                      </span>
                    )}
                    <div>
                      <div>
                        <label className="community-export settings-upload">
                          <Upload size={14} />
                          Tải ảnh mới
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={busy}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void avatar(file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <button
                          className="settings-delete-avatar"
                          disabled={busy || !profile.avatar}
                          onClick={() => void avatar()}
                        >
                          Xóa ảnh
                        </button>
                      </div>
                      <small>
                        JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh được lưu ngay khi
                        tải lên.
                      </small>
                    </div>
                  </div>
                  <form
                    id="settings-profile"
                    className="settings-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveProfile();
                    }}
                  >
                    <fieldset disabled={busy}>
                      <label>
                        Họ và tên
                        <input
                          required
                          maxLength={100}
                          value={profile.name}
                          onChange={(e) =>
                            setProfile({ ...profile, name: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Vai trò phân quyền
                        <input
                          readOnly
                          value={
                            profile.role === "ADMIN"
                              ? "Quản trị viên"
                              : profile.role
                          }
                        />
                      </label>
                      <label>
                        Email liên hệ
                        <input
                          type="email"
                          maxLength={150}
                          value={profile.email}
                          onChange={(e) =>
                            setProfile({ ...profile, email: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Số điện thoại đăng nhập
                        <input
                          required
                          inputMode="tel"
                          pattern="0[0-9]{9}"
                          maxLength={10}
                          value={profile.phone}
                          onChange={(e) =>
                            setProfile({ ...profile, phone: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Mã quản trị viên
                        <input readOnly value={`ADM-${profile.id}`} />
                      </label>
                      <label>
                        Ngày tạo tài khoản
                        <input readOnly value={formatDate(profile.createdAt)} />
                      </label>
                    </fieldset>
                    <button className="primary" disabled={busy}>
                      <Save size={14} />
                      Lưu hồ sơ
                    </button>
                  </form>
                </section>
              )}
              {tab === "security" && (
                <section className="panel settings-card">
                  <header>
                    <LockKeyhole size={20} />
                    <div>
                      <h2>Đổi mật khẩu & Bảo mật tài khoản</h2>
                      <p>Xác nhận mật khẩu hiện tại trước khi thay đổi</p>
                    </div>
                  </header>
                  <form
                    id="settings-password"
                    className="settings-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void changePassword();
                    }}
                  >
                    <fieldset disabled={busy}>
                      <label className="settings-full">
                        Mật khẩu hiện tại
                        <input
                          type={show ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          value={password.currentPassword}
                          onChange={(e) =>
                            setPassword({
                              ...password,
                              currentPassword: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Mật khẩu mới
                        <input
                          type={show ? "text" : "password"}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          value={password.newPassword}
                          onChange={(e) =>
                            setPassword({
                              ...password,
                              newPassword: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Xác nhận mật khẩu mới
                        <input
                          type={show ? "text" : "password"}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          value={password.confirmPassword}
                          onChange={(e) =>
                            setPassword({
                              ...password,
                              confirmPassword: e.target.value,
                            })
                          }
                        />
                      </label>
                    </fieldset>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={14} /> : <Eye size={14} />}{" "}
                      {show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    </button>
                    <small>
                      Tối thiểu 8 ký tự, tối đa 72 byte. Chọn mật khẩu riêng cho
                      tài khoản này.
                    </small>
                    <button className="primary" disabled={busy}>
                      Cập nhật mật khẩu
                    </button>
                  </form>
                  <div className="settings-info">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>Xác thực hai bước (2FA)</strong>
                      <p>Hệ thống hiện chưa hỗ trợ 2FA.</p>
                    </div>
                  </div>
                </section>
              )}
              {(tab === "general" || tab === "notifications") && (
                <section className="panel settings-card">
                  <header>
                    {tab === "general" ? (
                      <Settings2 size={20} />
                    ) : (
                      <Bell size={20} />
                    )}
                    <div>
                      <h2>
                        {tab === "general"
                          ? "Cấu hình làm việc"
                          : "Thông báo & Phiên làm việc"}
                      </h2>
                      <p>
                        Tùy chọn được lưu riêng theo tài khoản quản trị viên
                      </p>
                    </div>
                  </header>
                  <form
                    id="settings-preferences"
                    className="settings-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void savePrefs();
                    }}
                  >
                    <fieldset disabled={busy}>
                      {tab === "general" ? (
                        <>
                          <label>
                            Ngôn ngữ hiển thị
                            <input readOnly value="Tiếng Việt" />
                          </label>
                          <label>
                            Múi giờ làm việc
                            <input
                              readOnly
                              value="Theo thiết bị / trình duyệt"
                            />
                          </label>
                          <label>
                            Đơn vị đo lường
                            <input
                              readOnly
                              value="Theo dữ liệu nguyên liệu (g, ml, quả…)"
                            />
                          </label>
                          <div className="settings-full">
                            <span>Chế độ giao diện</span>
                            <div className="settings-theme">
                              {[
                                {
                                  value: "light",
                                  label: "Sáng",
                                  note: "Giao diện tiêu chuẩn",
                                },
                                {
                                  value: "dark",
                                  label: "Tối",
                                  note: "Giảm độ sáng nền",
                                },
                                {
                                  value: "system",
                                  label: "Hệ điều hành",
                                  note: "Theo thiết bị của bạn",
                                },
                              ].map((o) => (
                                <label
                                  key={o.value}
                                  className={
                                    prefs.theme === o.value ? "selected" : ""
                                  }
                                >
                                  <input
                                    type="radio"
                                    name="theme"
                                    value={o.value}
                                    checked={prefs.theme === o.value}
                                    onChange={() =>
                                      setPrefs({
                                        ...prefs,
                                        theme: o.value as Preferences["theme"],
                                      })
                                    }
                                  />
                                  <span>
                                    <strong>{o.label}</strong>
                                    <small>{o.note}</small>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <label className="settings-toggle settings-full">
                            <span>
                              Thông báo bài đăng
                              <small>
                                Hiện nút chuông và cập nhật bài chờ duyệt trong
                                trang quản trị.
                              </small>
                            </span>
                            <input
                              type="checkbox"
                              checked={prefs.notifications}
                              onChange={(e) =>
                                setPrefs({
                                  ...prefs,
                                  notifications: e.target.checked,
                                })
                              }
                            />
                          </label>
                          <label className="settings-full">
                            Tự đăng xuất khi không hoạt động
                            <select
                              value={prefs.idleMinutes}
                              onChange={(e) =>
                                setPrefs({
                                  ...prefs,
                                  idleMinutes: Number(e.target.value),
                                })
                              }
                            >
                              <option value={15}>Sau 15 phút</option>
                              <option value={30}>Sau 30 phút</option>
                              <option value={60}>Sau 60 phút</option>
                              <option value={0}>Tắt</option>
                            </select>
                            <small>
                              Áp dụng cho phiên trang quản trị đang mở trên
                              trình duyệt này.
                            </small>
                          </label>
                        </>
                      )}
                    </fieldset>
                    <button className="primary" disabled={busy}>
                      Lưu tùy chọn
                    </button>
                  </form>
                </section>
              )}
            </div>
            <aside className="settings-aside">
              <section className="panel settings-card">
                <header>
                  <ShieldCheck size={19} />
                  <h2>Bảo mật tài khoản</h2>
                </header>
                <ul className="settings-checks">
                  <li>
                    <Check size={14} />
                    Tài khoản có quyền quản trị
                  </li>
                  <li>
                    <Check size={14} />
                    Mật khẩu được mã hóa một chiều
                  </li>
                  <li>
                    <Check size={14} />
                    Kiểm tra quyền khi truy cập API
                  </li>
                </ul>
                <p>
                  Chỉ cấp quyền quản trị cho người cần sử dụng. Đổi mật khẩu tại
                  mục Bảo mật.
                </p>
              </section>
              <section className="panel settings-card">
                <header>
                  <Monitor size={19} />
                  <h2>Phiên làm việc hiện tại</h2>
                </header>
                <div className="settings-device">
                  <Monitor size={25} />
                  <div>
                    <strong>Trang quản trị trên trình duyệt</strong>
                    <small>Phiên hiện tại</small>
                    <span className="settings-active">Đang sử dụng</span>
                  </div>
                </div>
                <p>
                  Tự đăng xuất:{" "}
                  {data?.preferences.idleMinutes
                    ? `sau ${data.preferences.idleMinutes} phút không hoạt động`
                    : "đang tắt"}
                  .
                </p>
                <button className="settings-logout" onClick={onLogout}>
                  Đăng xuất phiên này
                </button>
                <small>
                  Chưa có chức năng liệt kê hoặc đăng xuất các thiết bị khác.
                </small>
              </section>
              <section className="panel settings-card">
                <header>
                  <LockKeyhole size={18} />
                  <h2>Hoạt động tài khoản</h2>
                </header>
                <div className="settings-timeline">
                  <strong>Đăng nhập gần nhất</strong>
                  <p>
                    {profile.lastLoginAt
                      ? formatDate(profile.lastLoginAt)
                      : "Chưa có bản ghi đăng nhập."}
                  </p>
                  <strong>Ngày tạo tài khoản</strong>
                  <p>{formatDate(profile.createdAt)}</p>
                </div>
              </section>
            </aside>
          </div>
        )
      )}
    </div>
  );
}
