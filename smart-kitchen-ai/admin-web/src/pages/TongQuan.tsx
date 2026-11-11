// Trang Tổng quan: hiển thị thống kê, biểu đồ, công thức và hoạt động hệ thống.
// Nhận dữ liệu từ App; hỗ trợ tìm/lọc công thức và xuất báo cáo.
import { useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CookingPot,
  Database,
  Eye,
  Filter,
  ImageOff,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Modal from "../components/Modal";
import { formatDate, imageUrl } from "../lib/adminApi";
import type { Overview, Recipe } from "../lib/adminApi";

type Props = {
  data: Overview | null;
  loading: boolean;
  error: string;
  period: string;
  onPeriodChange: (value: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
  onRefresh: () => void;
};
const icons: Record<string, LucideIcon> = {
  users: Users,
  recipes: BookOpen,
  ingredients: Database,
  community: MessageSquare,
  cooked: CookingPot,
};
const colors = ["#ff6b18", "#159c72", "#b34a0b", "#f49a09", "#00a67d"];
const number = (value: number) => value.toLocaleString("vi-VN");
function RecipeImage({
  path,
  name,
  className,
}: {
  path: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(path);
  return src && !failed ? (
    <img
      src={src}
      alt={name}
      className={className}
      onError={() => setFailed(true)}
    />
  ) : (
    <span
      className={`recipe-image-fallback ${className || ""}`}
      aria-label="Chưa có ảnh"
    >
      <ImageOff size={22} />
    </span>
  );
}
function TrendChart({ trends }: { trends: Overview["trends"] }) {
  const max = Math.max(
    1,
    ...trends.flatMap((point) => [point.users, point.cooked]),
  );
  const ceiling = Math.max(4, Math.ceil(max / 4) * 4);
  const x = (i: number) => (i * 600) / Math.max(1, trends.length - 1);
  const y = (value: number) => 244 - (value / ceiling) * 220;
  const points = (key: "users" | "cooked") =>
    trends.map((row, i) => `${x(i)},${y(row[key])}`).join(" ");
  const empty = trends.every((point) => !point.users && !point.cooked);
  const labels = [
    ...new Set([
      0,
      Math.floor((trends.length - 1) / 3),
      Math.floor((2 * (trends.length - 1)) / 3),
      trends.length - 1,
    ]),
  ];
  return (
    <div className="real-chart">
      <div className="real-chart-axis">
        {[1, 0.75, 0.5, 0.25, 0].map((scale) => (
          <span key={scale}>{number(ceiling * scale)}</span>
        ))}
      </div>
      <svg
        viewBox="-7 0 614 260"
        className="trend-chart"
        role="img"
        aria-label="Biểu đồ người dùng mới và lượt hoàn thành nấu theo ngày"
      >
        <defs>
          <linearGradient id="real-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff8b45" stopOpacity=".22" />
            <stop offset="100%" stopColor="#ff8b45" stopOpacity=".02" />
          </linearGradient>
        </defs>
        {[24, 79, 134, 189, 244].map((row) => (
          <line
            key={row}
            x1="0"
            x2="600"
            y1={row}
            y2={row}
            stroke="#ececf2"
            strokeDasharray="3 5"
          />
        ))}
        <polygon
          points={`0,244 ${points("users")} 600,244`}
          fill="url(#real-area)"
        />
        <polyline
          points={points("users")}
          fill="none"
          stroke="#ff6b18"
          strokeWidth="2.5"
        />
        <polyline
          points={points("cooked")}
          fill="none"
          stroke="#159c72"
          strokeWidth="2"
          strokeDasharray="5 3"
        />
        {trends.map((row, i) => (
          <g key={row.day}>
            <circle cx={x(i)} cy={y(row.users)} r="3" fill="#ff6b18">
              <title>
                {row.day}: {row.users} người dùng mới
              </title>
            </circle>
            <circle cx={x(i)} cy={y(row.cooked)} r="3" fill="#159c72">
              <title>
                {row.day}: {row.cooked} lượt nấu
              </title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="chart-days">
        {labels.map((i) => (
          <span key={i}>
            {trends[i].day.slice(8)}/{trends[i].day.slice(5, 7)}
          </span>
        ))}
      </div>
      {empty && (
        <p className="chart-empty">
          Chưa có đăng ký hoặc lượt nấu trong khoảng thời gian này.
        </p>
      )}
    </div>
  );
}
export default function TongQuan({
  data,
  loading,
  error,
  period,
  onPeriodChange,
  query,
  onQueryChange,
  onClearQuery,
  onRefresh,
}: Props) {
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const recipeCategories = [...new Set((data?.recipes || []).map(recipe => recipe.category))].sort((a,b) => a.localeCompare(b,"vi"));
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [modal, setModal] = useState<"report" | "logs" | null>(null);
  const filtered = (data?.recipes || []).filter(
    (recipe) =>
      (filter === "all" ||
        (filter === "active" ? recipe.active : !recipe.active)) &&
      (!categoryFilter || recipe.category === categoryFilter) &&
      `${recipe.id} ${recipe.name} ${recipe.description} ${recipe.category}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pageCount);
  const items = filtered.slice((currentPage - 1) * 5, currentPage * 5);
  const events = data?.events || [];
  // Xuất báo cáo từ dữ liệu tổng quan đang hiển thị.
  function exportReport() {
    if (!data) return;
    const rows = [
      ["Chỉ số", "Tổng hiện tại", `Mới trong ${data.days} ngày`],
      ...data.stats.map((stat) => [
        stat.label,
        String(stat.value),
        String(stat.added),
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tong-quan-${data.today}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Trung tâm Quản trị & Vận hành</h1>
          <p>
            Theo dõi người dùng, công thức, nguyên liệu và hoạt động thực tế từ
            hệ thống.
          </p>
        </div>
        <div className="heading-actions">
          <label className="period-select">
            <CalendarDays size={16} />
            <select
              aria-label="Khoảng thời gian thống kê"
              value={period}
              onChange={(e) => {
                onPeriodChange(e.target.value);
                setPage(1);
              }}
            >
              <option value="7">7 ngày qua</option>
              <option value="30">30 ngày qua</option>
              <option value="90">90 ngày qua</option>
            </select>
          </label>
          <button className="primary" disabled={loading} onClick={onRefresh}>
            <RefreshCw size={15} />
            {loading ? "Đang tải…" : "Làm mới dữ liệu"}
          </button>
        </div>
      </div>
      {error && (
        <div className="data-error" role="alert">
          <strong>Không tải được dữ liệu</strong>
          <p>{error}</p>
          <button className="primary" onClick={onRefresh}>
            Thử lại
          </button>
        </div>
      )}
      {loading && (
        <section className="panel loading-panel" role="status">
          <RefreshCw size={22} />
          <p>Đang tải dữ liệu từ MySQL…</p>
        </section>
      )}
      {!loading && !error && data && (
        <>
          <section className="stats-grid" aria-label="Số liệu hiện tại">
            {data.stats.map((stat) => {
              const Icon = icons[stat.key] || Database;
              return (
                <article
                  className={`stat-card ${stat.key === "cooked" ? "green" : ""}`}
                  key={stat.key}
                >
                  <div className="stat-top">
                    <span>{stat.label}</span>
                    <span className="stat-icon">
                      <Icon size={19} />
                    </span>
                  </div>
                  <strong className="stat-value">{number(stat.value)}</strong>
                  <div className="stat-change">
                    <span>
                      <ChartNoAxesCombined size={12} />+{number(stat.added)}
                    </span>
                    <small>trong {data.days} ngày qua</small>
                  </div>
                </article>
              );
            })}
          </section>
          <div className="dashboard-grid">
            <section className="panel trends">
              <div className="panel-heading">
                <div>
                  <h2>Người dùng mới & Hoạt động nấu ăn</h2>
                  <p>Thống kê theo ngày trong {data.days} ngày qua</p>
                </div>
                <div className="chart-legend">
                  <span>
                    <i />
                    Người dùng mới
                  </span>
                  <span>
                    <i style={{ background: "#159c72" }} />
                    Lượt hoàn thành nấu
                  </span>
                </div>
              </div>
              <TrendChart trends={data.trends} />
              <button
                className="chart-insight"
                onClick={() => setModal("report")}
              >
                <Database size={14} />
                <span>Dữ liệu tổng hợp từ tài khoản và lịch sử nấu ăn.</span>
                <b>
                  Xem báo cáo <ArrowRight size={13} />
                </b>
              </button>
            </section>
            <section className="panel categories">
              <div className="panel-heading">
                <h2>Top 5 nhóm công thức</h2>
              </div>
              <p>
                Phân bố công thức đang hoạt động trong database, không phải mức
                độ yêu thích.
              </p>
              <div className="category-list">
                {data.categories.map((category, i) => (
                  <div className="category-item" key={category.name}>
                    <div>
                      <span>
                        <i style={{ background: colors[i] }} />
                        {category.name}
                      </span>
                      <b>
                        {category.percent}%{" "}
                        <small>({number(category.count)})</small>
                      </b>
                    </div>
                    <div className="progress-track">
                      <span
                        style={{
                          width: `${category.percent}%`,
                          background: colors[i],
                        }}
                      />
                    </div>
                  </div>
                ))}
                {!data.categories.length && <p>Chưa có công thức hoạt động.</p>}
              </div>
              <div className="ai-insight">
                <ShieldCheck size={24} />
                <p>
                  AI nhận diện ảnh: <strong>{data.ai.message}</strong>. Chưa có
                  dữ liệu độ chính xác và lượt quét AI để thống kê.
                </p>
              </div>
            </section>
            <section className="panel moderation">
              <div className="panel-heading">
                <div>
                  <h2>Công thức mới nhất</h2>
                  <p>
                    Tìm và lọc trong tối đa 100 công thức mới nhất. Chỉ xem dữ
                    liệu.
                  </p>
                  <input
                    className="table-search"
                    aria-label="Lọc công thức trong bảng"
                    placeholder="Lọc công thức đã tải…"
                    value={query}
                    onChange={(e) => {
                      onQueryChange(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <label className="filter-select">
                  <Filter size={13} />
                  <select
                    aria-label="Lọc trạng thái công thức"
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">Tất cả</option>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Ngừng hoạt động</option>
                  </select>
                </label>
                <label className="filter-select">
                  <Filter size={13} />
                  <select
                    aria-label="Lọc danh mục"
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Tất cả danh mục</option>
                    {recipeCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="table-scroll">
                <table className="real-recipe-table">
                  <thead>
                    <tr>
                      <th>Công thức</th>
                      <th>Danh mục</th>
                      <th>Nguyên liệu</th>
                      <th>Ngày tạo</th>
                      <th>Trạng thái</th>
                      <th>Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((recipe) => (
                      <tr key={recipe.id}>
                        <td>
                          <div className="dish-cell">
                            <RecipeImage
                              key={`${recipe.id}-${recipe.image}`}
                              path={recipe.image}
                              name=""
                            />
                            <div>
                              <strong>{recipe.name}</strong>
                              <small>#{recipe.id}</small>
                            </div>
                          </div>
                        </td>
                        <td>{recipe.category}</td>
                        <td>{recipe.ingredientCount}</td>
                        <td>
                          <span className="muted">
                            {formatDate(recipe.createdAt)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${recipe.active ? "approved" : "label"}`}
                          >
                            {recipe.active ? "Hoạt động" : "Ngừng hoạt động"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`Xem ${recipe.name}`}
                            onClick={() => setSelected(recipe)}
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!items.length && (
                      <tr>
                        <td colSpan={6} className="empty-state">
                          <Search size={24} />
                          <p>Không có công thức phù hợp.</p>
                          {query && (
                            <button
                              className="text-button"
                              onClick={onClearQuery}
                            >
                              Xoá tìm kiếm
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span>{filtered.length} công thức trong danh sách đã tải</span>
                <div className="pagination">
                  <button
                    aria-label="Trang trước"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span>
                    {currentPage} / {pageCount}
                  </span>
                  <button
                    aria-label="Trang sau"
                    disabled={currentPage === pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </section>
            <section className="panel live-log">
              <div className="panel-heading">
                <h2>
                  <Activity size={17} />
                  Hoạt động gần đây
                </h2>
              </div>
              <div className="logs">
                {events.slice(0, 4).map((event) => (
                  <article className="log-item recipe" key={event.id}>
                    <span className="log-icon">
                      {event.type === "user" ? (
                        <Users size={17} />
                      ) : event.type === "post" ? (
                        <MessageSquare size={17} />
                      ) : (
                        <BookOpen size={17} />
                      )}
                    </span>
                    <div>
                      <p>
                        <strong>{event.title}</strong>
                      </p>
                      <p>{event.body}</p>
                      <footer>
                        <time>{formatDate(event.time)}</time>
                      </footer>
                    </div>
                  </article>
                ))}
                {!events.length && (
                  <p className="empty-state">
                    Chưa có hoạt động được ghi nhận.
                  </p>
                )}
              </div>
              <button className="audit-button" onClick={() => setModal("logs")}>
                <Activity size={15} /> Xem hoạt động đã tải{" "}
                <ArrowRight size={14} />
              </button>
            </section>
          </div>
        </>
      )}
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <RecipeImage
            key={`${selected.id}-${selected.image}`}
            path={selected.image}
            name={selected.name}
            className="detail-image"
          />
          <div className="detail-meta">
            <span>
              Mã công thức<strong>#{selected.id}</strong>
            </span>
            <span>
              Danh mục<strong>{selected.category}</strong>
            </span>
            <span>
              Nguyên liệu<strong>{selected.ingredientCount}</strong>
            </span>
          </div>
          <p>{selected.description || "Chưa có mô tả."}</p>
          <p>
            Ngày tạo: {formatDate(selected.createdAt)} ·{" "}
            {selected.active ? "Đang hoạt động" : "Ngừng hoạt động"}
          </p>
        </Modal>
      )}
      {modal === "report" && data && (
        <Modal
          title={`Báo cáo ${data.days} ngày`}
          onClose={() => setModal(null)}
        >
          <p>
            Tổng số bản ghi hiện tại và số phát sinh trong khoảng thời gian được
            chọn.
          </p>
          <div className="report-stats">
            {data.stats.map((stat) => (
              <div key={stat.key}>
                <span>{stat.label}</span>
                <strong>{number(stat.value)}</strong>
                <small>
                  +{number(stat.added)} trong {data.days} ngày
                </small>
              </div>
            ))}
          </div>
          <button className="primary" onClick={exportReport}>
            <ArrowDownToLine size={16} />
            Tải báo cáo CSV
          </button>
        </Modal>
      )}
      {modal === "logs" && (
        <Modal title="Hoạt động gần đây" onClose={() => setModal(null)}>
          <p>
            10 hoạt động mới nhất từ tài khoản, công thức, bài công khai và lịch
            sử nấu ăn. Chưa phải nhật ký kiểm toán.
          </p>
          {events.map((event) => (
            <div className="audit-entry" key={event.id}>
              <strong>{event.title}</strong>
              <p>{event.body}</p>
              <small>{formatDate(event.time)}</small>
            </div>
          ))}
          {!events.length && <p>Chưa có hoạt động.</p>}
        </Modal>
      )}
    </>
  );
}
