// Thanh điều hướng dùng chung: hiển thị các trang quản trị và mục đang chọn.
// Hỗ trợ đóng menu trên màn hình nhỏ và gửi yêu cầu đăng xuất lên App.
import {
  BookOpen,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Warehouse,
  Settings,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const sidebarItems: { label: string; icon: LucideIcon }[] = [
  { label: "Tổng quan", icon: LayoutDashboard },
  { label: "Quản lý Người dùng", icon: Users },
  { label: "Quản lý Nguyên liệu", icon: Warehouse },
  { label: "Quản lý Công thức nấu ăn", icon: BookOpen },
  { label: "Quản lý Bài đăng cộng đồng ", icon: MessageSquare },
  { label: "Quản lý AI & Kiểm duyệt", icon: FileCheck2 },
  { label: "Cài đặt hệ thống", icon: Settings },
];
type SidebarProps = {
  active: number;
  mobileOpen: boolean;
  onNavigate: (index: number) => void;
  onCloseMobile: () => void;
  onLogout: () => void;
};

export default function Sidebar({
  active,
  mobileOpen,
  onNavigate,
  onCloseMobile,
  onLogout,
}: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <button
          className="nav-scrim"
          aria-label="Đóng menu"
          onClick={onCloseMobile}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <a className="brand" href="#dashboard" onClick={() => onNavigate(0)}>
          <span className="brand-icon">
            <img
              src="/images/logo.png"
              alt="Smart Kitchen AI"
              className="brand-logo"
            />
          </span>
          <span className="brand-copy">
            <strong>Bếp Thông Minh</strong>
            <small>
              <i /> Smart Kitchen AI Admin
            </small>
          </span>
        </a>
        <nav aria-label="Menu quản trị">
          {sidebarItems.map(({ label, icon: Icon }, index) => (
            <button
              key={label}
              className={`nav-item ${active === index ? "active" : ""}`}
              onClick={() => onNavigate(index)}
              aria-current={active === index ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>

            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item logout" onClick={onLogout}>
            <LogOut size={17} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}
