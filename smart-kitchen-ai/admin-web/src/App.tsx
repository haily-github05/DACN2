import CaiDatHeThong from "./pages/CaiDatHeThong";
import AdminPreferences from "./components/AdminPreferences";
import QuanLyCongThuc from "./pages/QuanLyCongThuc";
import { useEffect, useState } from "react";
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import Sidebar, { sidebarItems } from "./components/Sidebar";
import AdminLogin from "./components/AdminLogin";
import AdminAvatar from "./components/AdminAvatar";
import Modal from "./components/Modal";
import AdminSearch from "./components/AdminSearch";
import TongQuan from "./pages/TongQuan";
import QuanLyNguoiDung from "./pages/QuanLyNguoiDung";
import QuanLyNguyenLieu from "./pages/QuanLyNguyenLieu";
import BaiDangCongDong from "./pages/BaiDangCongDong";
import AdminNotifications from "./components/AdminNotifications";
import {
  ApiError,
  apiRequest,
  getOverview,
  readSession,
  saveSession,
} from "./lib/adminApi";
import type { AdminSession, Overview } from "./lib/adminApi";

export default function App() {
  const [session, setSession] = useState<AdminSession | null>(readSession);
  const [active, setActive] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [period, setPeriod] = useState("7");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [requestedPost, setRequestedPost] = useState<{ id: string } | null>(
    null,
  );
  const [profile, setProfile] = useState(false);
  const [confirmLogout,setConfirmLogout]=useState(false);
  const [notificationsEnabled,setNotificationsEnabled]=useState(true);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileNav(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active]);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    getOverview(session.token, period, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && [401, 403].includes(err.status)) {
          saveSession(null);
          setSession(null);
          setAuthMessage(err.message);
        } else
          setError(
            err instanceof Error ? err.message : "Không thể tải dữ liệu.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [session, period, revision]);
  const sessionToken = session?.token;
  useEffect(() => {
    if (!sessionToken) return;
    let controller: AbortController | undefined;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      apiRequest<{ id: number; name: string; avatar: string }>(
        "/api/admin/session",
        sessionToken,
        { signal },
      )
        .then((admin) => {
          if (signal.aborted) return;
          setSession((current) => {
            if (!current || current.token !== sessionToken) return current;
            if (
              current.name === admin.name &&
              current.avatar === admin.avatar &&
              current.id === admin.id
            )
              return current;
            const updated = { ...current, ...admin };
            saveSession(updated);
            return updated;
          });
        })
        .catch((err) => {
          if (
            !signal.aborted &&
            err instanceof ApiError &&
            [401, 403].includes(err.status)
          ) {
            saveSession(null);
            setSession(null);
            setAuthMessage(err.message);
          }
        });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      controller?.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [sessionToken, revision]);
  function login(value: AdminSession) {
    saveSession(value);
    setSession(value);
    setAuthMessage("");
  }
  function logout() {
    setConfirmLogout(false);
    saveSession(null);
    setSession(null);
    setData(null);
    setQuery("");
    setActive(0);
    setProfile(false);
    setRequestedPost(null);
    setMobileNav(false);
    setAuthMessage("");
  }
  function navigate(index: number) {
    setRequestedPost(null);
    setActive(index);
    setMobileNav(false);
    setQuery("");
  }
  if (!session) return <AdminLogin onLogin={login} message={authMessage} />;
  return (
    <div className="app">
      <AdminPreferences token={session.token} onNotifications={setNotificationsEnabled} onTimeout={()=>{logout();setAuthMessage("Phiên quản trị đã kết thúc do không hoạt động.");}}/>
      <Sidebar
        active={active}
        mobileOpen={mobileNav}
        onNavigate={navigate}
        onCloseMobile={() => setMobileNav(false)}
        onLogout={()=>setConfirmLogout(true)}
      />
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-toggle"
            aria-label="Mở menu"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <span>{sidebarItems[active].label}</span>
          </div>
          <div className="topbar-right">
            <AdminSearch
              token={session.token}
              onUnauthorized={(message) => {
                logout();
                setAuthMessage(message);
              }}
            />
            <span
              className="server-status unconfigured"
              title="Chưa có dịch vụ nhận diện ảnh được kết nối."
            >
              <i />
              <span>AI nhận diện ảnh:</span>
              <strong>{data?.ai.message || "Chưa cấu hình"}</strong>
            </span>
            {notificationsEnabled&&<AdminNotifications
              token={session.token}
              revision={revision}
              onOpen={(id) => {
                setRequestedPost(id ? { id } : null);
                setActive(4);
                setMobileNav(false);
              }}
              onUnauthorized={(message) => {
                logout();
                setAuthMessage(message);
              }}
            />}
            <button className="user-menu" onClick={() => setProfile(true)}>
              <span>
                <strong>{session.name}</strong>
                <small>
                  <ShieldCheck size={11} /> Quản trị viên
                </small>
              </span>
              <AdminAvatar
                key={`${session.id}:${session.avatar || ""}`}
                name={session.name}
                avatar={session.avatar}
              />
            </button>
          </div>
        </header>
        <main>
          {active === 0 ? (
            <TongQuan
              data={data}
              loading={loading}
              error={error}
              period={period}
              onPeriodChange={setPeriod}
              query={query}
              onQueryChange={setQuery}
              onClearQuery={() => setQuery("")}
              onRefresh={() => setRevision((value) => value + 1)}
            />
          ) : active === 1 ? (
            <QuanLyNguoiDung
              token={session.token}
              adminId={session.id}
              revision={revision}
              onChanged={() => setRevision((value) => value + 1)}
              onUnauthorized={(message) => {
                logout();
                setAuthMessage(message);
              }}
            />
          ) : active === 2 ? (
            <QuanLyNguyenLieu
              token={session.token}
              revision={revision}
              onChanged={() => setRevision((value) => value + 1)}
              onUnauthorized={(message) => {
                logout();
                setAuthMessage(message);
              }}
            />
          ) : active === 3 ? (
            <QuanLyCongThuc
              token={session.token}
              revision={revision}
              onChanged={() => setRevision((value) => value + 1)}
              onUnauthorized={(message) => {
                logout();
                setAuthMessage(message);
              }}
            />
          ) : active === 6 ? (
            <CaiDatHeThong token={session.token} onChanged={()=>setRevision(value=>value+1)} onUnauthorized={message=>{logout();setAuthMessage(message);}} onLogout={()=>setConfirmLogout(true)}/>
          ) : active === 4 ? (
            <BaiDangCongDong
              token={session.token}
              request={requestedPost}
              revision={revision}
              onChanged={() => setRevision((value) => value + 1)}
              onUnauthorized={(message) => {
                logout();
                setAuthMessage(message);
              }}
            />
          ) : (
            <section className="panel" style={{ padding: 28 }}>
              <div className="eyebrow">QUẢN TRỊ</div>
              <h1>{sidebarItems[active].label}</h1>
              <p style={{ marginTop: 12 }}>Trang này đang được chuẩn bị.</p>
              <button
                className="primary"
                style={{ marginTop: 20 }}
                onClick={() => navigate(0)}
              >
                Về Tổng quan
              </button>
            </section>
          )}
        </main>
      </div>
      {confirmLogout && (
        <Modal title="Bạn muốn đăng xuất?" className="logout-dialog" onClose={()=>setConfirmLogout(false)} header={
          <div className="logout-brand"><div className="logout-logo"><img src="/images/logo.png" alt="Logo Bếp Thông Minh"/></div><strong>Bếp Thông Minh</strong><span>TRANG QUẢN TRỊ</span></div>
        }>
          <p className="logout-description">Phiên làm việc của bạn sẽ kết thúc.<br/>Bạn có thể đăng nhập lại bất cứ lúc nào.</p>
          <div className="logout-account"><AdminAvatar name={session.name} avatar={session.avatar}/><span><strong>{session.name}</strong><small><ShieldCheck size={12}/>Quản trị viên</small></span></div>
          <div className="logout-actions"><button className="logout-cancel" onClick={()=>setConfirmLogout(false)}>Ở lại</button><button className="logout-confirm" onClick={logout}><LogOut size={16}/>Đăng xuất</button></div>
        </Modal>
      )}
      {profile && (
        <Modal title="" onClose={() => setProfile(false)}>
          <div className="admin-profile">
            <AdminAvatar
              key={`${session.id}:${session.avatar || ""}`}
              name={session.name}
              avatar={session.avatar}
              large
            />

            <h2>{session.name}</h2>

            <p>Quản trị viên · Mã tài khoản: {session.id}</p>

            <div className="profile-note">
              <ShieldCheck size={20} />
              <span>
                Đã xác thực bằng tài khoản trong database và được cấp quyền quản
                trị trên backend.
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
  
}
