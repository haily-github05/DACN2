// Biểu mẫu đăng nhập quản trị bằng email hoặc số điện thoại và mật khẩu.
// Xác thực tài khoản, kiểm tra quyền admin và hỗ trợ hiện/ẩn mật khẩu.
import { useRef, useState } from "react";
import {
  BookOpen,
  ChefHat,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import { apiRequest } from "../lib/adminApi";
import type { AdminSession } from "../lib/adminApi";
export default function AdminLogin({
  onLogin,
  message,
}: {
  onLogin: (session: AdminSession) => void;
  message: string;
}) {
  const [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  return (
    <main className="admin-login-page">
      <div className="admin-login-shell">
        <section className="login-story" aria-label="Bếp Thông Minh">
          <a className="login-brand" href="#">
            <img src="/images/logo.png" alt="Logo Bếp Thông Minh" />
            <span>
              <strong>Bếp Thông Minh</strong>
              <small>SMART KITCHEN AI</small>
            </span>
          </a>
          <div className="login-story-main">
            <span className="login-story-tag">
              <ChefHat size={14} />
              MỘT GIAN BẾP. NGÀN CẢM HỨNG.
            </span>
            <h2>
              Kết nối gian bếp.
              <br />
              <em>Chạm đến yêu thương.</em>
            </h2>
            <p>
              Từ nguyên liệu tươi ngon đến những bữa cơm trọn vẹn.
              <br />
              Cùng xây dựng trải nghiệm nấu ăn thông minh mỗi ngày.
            </p>
            <div className="login-story-visual" aria-hidden="true">
              <div className="login-visual-orbit" />
              <div className="login-visual-logo">
                <img src="/images/logo.png" alt="" />
              </div>
              <span className="login-float login-float-recipes">
                <BookOpen size={19} />
                <span>
                  Công thức hay<strong>Bữa ngon mỗi ngày</strong>
                </span>
              </span>
              <span className="login-float login-float-community">
                <Users size={19} />
                <span>
                  Cộng đồng bếp<strong>Kết nối & sẻ chia</strong>
                </span>
              </span>
              <span className="login-visual-dot dot-one" />
              <span className="login-visual-dot dot-two" />
            </div>
          </div>
          <footer>
            <span className="login-story-line" />
            Nấu ăn thông minh hơn. Sống trọn vẹn hơn.
          </footer>
        </section>
        <section className="login-form-panel">
          <div className="login-form-content">
            <span className="login-admin-tag">
              <ShieldCheck size={14} />
              DÀNH CHO QUẢN TRỊ VIÊN
            </span>
            <h1>
              Chào mừng trở lại <span>!</span>
            </h1>
            <p>
              Đăng nhập để quản lý và đồng hành cùng
              <br />
              cộng đồng Bếp Thông Minh SMART KITCHEN AI.
            </p>
            {(error || message) && (
              <div className="data-error" role="alert">
                {error || message}
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (lock.current) return;
                lock.current = true;
                setBusy(true);
                setError("");
                try {
                  const user = await apiRequest<{ token: string }>(
                    "/api/auth/login",
                    "",
                    {
                      method: "POST",
                      body: JSON.stringify({ identifier, password }),
                    },
                  );
                  const admin = await apiRequest<{
                    id: number;
                    name: string;
                    avatar: string;
                  }>("/api/admin/session", user.token);
                  setPassword("");
                  onLogin({ ...admin, token: user.token });
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Không thể đăng nhập.",
                  );
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            >
              <label htmlFor="admin-login-identifier">
                Email hoặc số điện thoại
              </label>
              <div className="login-input-wrap">
                <Mail size={18} />
                <input
                  id="admin-login-identifier"
                  autoComplete="username"
                  type="text"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={254}
                  disabled={busy}
                  placeholder="Email Gmail hoặc số điện thoại"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
              <label htmlFor="admin-login-password">Mật khẩu</label>
              <div className="login-input-wrap">
                <LockKeyhole size={18} />
                <input
                  id="admin-login-password"
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={busy}
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small className="login-email-note">
                Dùng email đã lưu trong tài khoản và mật khẩu Bếp Thông Minh.
              </small>
              <button className="login-submit" disabled={busy}>
                <span>{busy ? "Đang xác thực…" : "Đăng nhập"}</span>

              </button>
            </form>
            <div className="login-access-note">
              <ShieldCheck size={17} />
              <p>
                Chỉ tài khoản được cấp quyền quản trị
                <br />
                mới có thể truy cập hệ thống.
              </p>
            </div>
          </div>
          <footer>
            Bếp Thông Minh <span>·</span> Trang quản trị hệ thống
          </footer>
        </section>
      </div>
    </main>
  );
}
