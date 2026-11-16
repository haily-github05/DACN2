import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  Clock3,
  Download,
  Eye,
  FileText,
  Play,
  RefreshCw,
  ScanLine,
  Settings,
  ShieldAlert,
  TriangleAlert,
  Utensils,
  WandSparkles,
} from "lucide-react";
import { ApiError, apiRequest, formatDate } from "../lib/adminApi";
import Modal from "../components/Modal";

type ModelStatus = {
  key: string;
  name: string;
  version: string;
  provider: string;
  configured: boolean;
  online: boolean | null;
  status: string;
  detail: string;
  architecture: string;
  latencyMs: number | null;
  configHint: string;
};
type ActivityItem = {
  id: string;
  type: "INGREDIENT_SCAN" | "RECIPE_SUGGESTION" | "MEAL_PLAN" | "CHAT" | "CONTENT_MODERATION";
  status: "SUCCESS" | "FAILURE";
  model: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  durationMs: number | null;
  errorCode: string | null;
  time: string;
};
type Metric = { total: number; successful: number; failed: number };
type TrendDay = { day: string; successful: number; failed: number; total: number };
type DashboardData = {
  models: ModelStatus[];
  daily: {
    scans: Metric;
    suggestions: Metric;
    mealPlans: Metric;
    chats: Metric;
    failures: number;
  };
  dailyTrend: TrendDay[];
  moderation: { pending: number; reported?: number; reportsTracked: boolean };
  activity: ActivityItem[];
  todayActivity?: ActivityItem[];
};
type Props = {
  token: string;
  revision: number;
  onUnauthorized: (message: string) => void;
  onOpenCommunity: () => void;
};

const number = (value: number) => value.toLocaleString("vi-VN");
const activityName: Record<ActivityItem["type"], string> = {
  INGREDIENT_SCAN: "Nhận diện nguyên liệu",
  RECIPE_SUGGESTION: "Gợi ý món ăn",
  MEAL_PLAN: "Lập thực đơn",
  CHAT: "Trợ lý Smart Kitchen",
  CONTENT_MODERATION: "Kiểm duyệt nội dung",
};
const statusName = { SUCCESS: "Thành công", FAILURE: "Lỗi" };
const CHART = { green: "#36a875", red: "#e56b62", grid: "#eee8e2", text: "#9b8a7d", empty: "#f1ede9" };
const chartDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

function UsageByDayChart({ data }: { data: TrendDay[] }) {
  const left = 47, top = 18, plotHeight = 155, baseline = top + plotHeight, slot = 44, barWidth = 22;
  const max = Math.max(1, ...data.map((item) => item.total));
  const scaleMax = Math.ceil(max / 5) * 5 || 1;
  return (
    <svg className="ai-usage-chart" viewBox="0 0 700 226" role="img" aria-label="Lượt sử dụng AI mỗi ngày, chia theo thành công và thất bại">
      {[0, 0.5, 1].map((fraction) => {
        const y = baseline - plotHeight * fraction;
        return <g key={fraction}><line x1={left} x2={left + 620} y1={y} y2={y} stroke={CHART.grid} strokeDasharray={fraction === 0 ? undefined : "3 4"} /><text x={left - 8} y={y + 3} textAnchor="end" fill={CHART.text}>{Math.round(scaleMax * fraction)}</text></g>;
      })}
      {data.map((item, index) => {
        const x = left + 7 + index * slot;
        const successHeight = (item.successful / scaleMax) * plotHeight;
        const failureHeight = (item.failed / scaleMax) * plotHeight;
        const showLabel = index % 2 === 0 || index === data.length - 1;
        return <g key={item.day}>
          {item.successful > 0 && <rect x={x} y={baseline - successHeight} width={barWidth} height={successHeight} rx="3" fill={CHART.green}><title>{chartDate(item.day)} · Thành công: {item.successful}</title></rect>}
          {item.failed > 0 && <rect x={x} y={baseline - successHeight - failureHeight} width={barWidth} height={failureHeight} rx="3" fill={CHART.red}><title>{chartDate(item.day)} · Thất bại: {item.failed}</title></rect>}
          {item.total === 0 && <rect x={x} y={baseline - 3} width={barWidth} height="3" rx="2" fill={CHART.empty}><title>{chartDate(item.day)} · Không có lượt gọi</title></rect>}
          {showLabel && <text x={x + barWidth / 2} y={baseline + 18} textAnchor="middle" fill={CHART.text}>{chartDate(item.day)}</text>}
        </g>;
      })}
    </svg>
  );
}

function DailySuccessRateChart({ data }: { data: TrendDay[] }) {
  const left = 47, top = 18, plotHeight = 155, baseline = top + plotHeight, slot = 44, barWidth = 22;
  return (
    <svg className="ai-usage-chart" viewBox="0 0 700 226" role="img" aria-label="Tỷ lệ thành công và thất bại trong tổng lượt sử dụng AI mỗi ngày">
      {[0, 0.5, 1].map((fraction) => {
        const y = baseline - plotHeight * fraction;
        return <g key={fraction}><line x1={left} x2={left + 620} y1={y} y2={y} stroke={CHART.grid} strokeDasharray={fraction === 0 ? undefined : "3 4"} /><text x={left - 8} y={y + 3} textAnchor="end" fill={CHART.text}>{Math.round(fraction * 100)}%</text></g>;
      })}
      {data.map((item, index) => {
        const x = left + 7 + index * slot;
        const successRatio = item.total ? item.successful / item.total : 0;
        const failureRatio = item.total ? item.failed / item.total : 0;
        const showLabel = index % 2 === 0 || index === data.length - 1;
        return <g key={item.day}>
          <rect x={x} y={top} width={barWidth} height={plotHeight} rx="3" fill={item.total ? CHART.red : CHART.empty}>
            <title>{chartDate(item.day)} · {item.total ? `Thành công ${Math.round(successRatio * 100)}%, thất bại ${Math.round(failureRatio * 100)}%` : "Không có lượt gọi"}</title>
          </rect>
          {item.total > 0 && <rect x={x} y={baseline - successRatio * plotHeight} width={barWidth} height={successRatio * plotHeight} rx="3" fill={CHART.green} />}
          {showLabel && <text x={x + barWidth / 2} y={baseline + 18} textAnchor="middle" fill={CHART.text}>{chartDate(item.day)}</text>}
        </g>;
      })}
    </svg>
  );
}

function downloadActivity(items: ActivityItem[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = [
    ["Thời gian", "Người dùng", "Email", "Hoạt động", "Model", "Trạng thái", "Thời lượng (ms)", "Mã lỗi"],
    ...items.map((item) => [
      item.time,
      item.userName || (item.userId ? `Tài khoản #${item.userId}` : "Chưa ghi nhận"),
      item.userEmail || "",
      activityName[item.type],
      item.model,
      statusName[item.status],
      item.durationMs == null ? "" : String(item.durationMs),
      item.errorCode || "",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(quote).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "nhat-ky-hoat-dong-ai.csv";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function QuanLyAIVaKiemDuyet({ token, revision, onUnauthorized, onOpenCommunity }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [configModel, setConfigModel] = useState<ModelStatus | null>(null);
  const [activityFilter, setActivityFilter] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    apiRequest<DashboardData>("/api/admin/ai-management", token, { signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setData(value); })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        if (cause instanceof ApiError && [401, 403].includes(cause.status)) onUnauthorized(cause.message);
        else setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu AI.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, revision, reload, onUnauthorized]);

  const daily = data?.daily;
  const metricFilterActive = activityFilter?.startsWith("metric-") === true;
  const activitySource = metricFilterActive ? (data?.todayActivity ?? data?.activity) : data?.activity;
  const visibleActivity = activitySource?.filter((item) => {
    if (!activityFilter || activityFilter === "database") return true;
    if (activityFilter === "vision" || activityFilter === "metric-scans") return item.type === "INGREDIENT_SCAN";
    if (activityFilter === "metric-suggestions") return item.type === "RECIPE_SUGGESTION";
    if (activityFilter === "metric-meal-plans") return item.type === "MEAL_PLAN";
    if (activityFilter === "metric-failures") return item.status === "FAILURE";
    if (activityFilter === "meal-plan") return item.type === "MEAL_PLAN" || item.type === "RECIPE_SUGGESTION";
    return item.type === "CHAT";
  }) || [];
  const toggleActivityFilter = (filterKey: string) => {
    setActivityFilter((current) => current === filterKey ? null : filterKey);
    window.setTimeout(() => document.getElementById("ai-activity-log")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const metricCards = [
    { title: "Lượt nhận diện nguyên liệu", metric: daily?.scans, icon: ScanLine, color: "violet", filterKey: "metric-scans" },
    { title: "Lượt gợi ý món ăn", metric: daily?.suggestions, icon: WandSparkles, color: "orange", filterKey: "metric-suggestions" },
    { title: "Lượt lập thực đơn", metric: daily?.mealPlans, icon: Utensils, color: "green", filterKey: "metric-meal-plans" },
    { title: "Lỗi AI hôm nay", value: daily?.failures, icon: TriangleAlert, color: "red", filterKey: "metric-failures" },
  ];
  const activityFilterName: Record<string, string> = {
    vision: "KitchenVision",
    "meal-plan": "Gemini Meal Planner và gợi ý món ăn",
    assistant: "Trợ lý Smart Kitchen",
    database: "MySQL Database",
    "metric-scans": "Lượt nhận diện nguyên liệu",
    "metric-suggestions": "Lượt gợi ý món ăn",
    "metric-meal-plans": "Lượt lập thực đơn",
    "metric-failures": "Lỗi AI",
  };
  return (
    <div className="ai-management-page" aria-busy={loading}>
      <header className="ai-management-heading">
        <div>
          <h1>Quản lý AI</h1>
          <p>Theo dõi hoạt động AI, cấu hình model và phát hiện lỗi dịch vụ.</p>
        </div>
        <div className="ai-management-actions">
          <button className="community-export" disabled={!data?.activity.length} onClick={() => data && downloadActivity(data.activity)}>
            <Download size={15} /> Xuất nhật ký CSV
          </button>
          <button className="primary" disabled={loading} onClick={() => setReload((value) => value + 1)}>
            <RefreshCw size={15} /> Làm mới dữ liệu
          </button>
        </div>
      </header>

      {error && <div className="data-error" role="alert">{error}<button className="text-button" onClick={() => setReload((value) => value + 1)}>Thử lại</button></div>}

      <section className="ai-summary-grid" aria-label="Số liệu hoạt động AI hôm nay">
        {metricCards.map(({ title, metric, value, icon: Icon, color, filterKey }) => (
          <article
            className={`ai-summary-card ai-summary-card-clickable${activityFilter === filterKey ? " filter-active" : ""}`}
            key={title}
            role="button"
            tabIndex={0}
            aria-pressed={activityFilter === filterKey}
            onClick={() => toggleActivityFilter(filterKey)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleActivityFilter(filterKey); } }}
          >
            <span className={`ai-summary-icon ${color}`}><Icon size={18} /></span>
            <small>{title}</small>
            <strong>{number(value ?? metric?.total ?? 0)}</strong>
            <span className="ai-summary-foot">
              {metric ? `${number(metric.successful)} thành công · ${number(metric.failed)} lỗi` : "Tính từ nhật ký trong ngày"}
            </span>
          </article>
        ))}
      </section>

      <section className="ai-charts-grid" aria-label="Biểu đồ hoạt động AI trong 14 ngày gần nhất">
        <article className="ai-panel ai-chart-panel">
          <div className="ai-panel-heading">
            <div><h2>Lượt sử dụng AI theo ngày</h2><p>14 ngày gần nhất · tổng lượt gọi dịch vụ AI</p></div>
            <div className="ai-chart-legend"><span><i className="success" />Thành công</span><span><i className="failure" />Thất bại</span></div>
          </div>
          <UsageByDayChart data={data?.dailyTrend ?? []} />
        </article>
        <article className="ai-panel ai-chart-panel">
          <div className="ai-panel-heading">
            <div><h2>Tỷ lệ thành công / thất bại</h2><p>Tỷ lệ theo tổng lượt gọi của từng ngày</p></div>
            <div className="ai-chart-legend"><span><i className="success" />Thành công</span><span><i className="failure" />Thất bại</span></div>
          </div>
          <DailySuccessRateChart data={data?.dailyTrend ?? []} />
        </article>
      </section>

      <section className="ai-panel">
        <div className="ai-panel-heading">
          <div><h2>Mô hình AI &amp; kết nối hạ tầng</h2><p>YOLO lấy trạng thái trực tiếp; Gemini hiển thị lỗi từ lần gọi gần nhất; MySQL báo kết nối database.</p></div>
          <span className="ai-live-count"><i /> {data?.models.filter((model) => model.key !== "database" && model.configured).length ?? 0} dịch vụ AI đã cấu hình</span>
        </div>
        <div className="ai-model-table-wrap">
          <table className="ai-model-table">
            <thead><tr><th>TÊN DỊCH VỤ</th><th>ENGINE &amp; KIẾN TRÚC</th><th>CHỨC NĂNG</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead>
            <tbody>
              {data?.models.map((model) => (
                <tr key={model.key}>
                  <td><span className={`ai-model-icon ${model.key}`}><Bot size={16} /></span><strong>{model.name}</strong></td>
                  <td><span className="ai-model-provider">{model.provider}</span><small>{model.architecture}</small><small>{model.version}</small></td>
                  <td className="ai-model-detail">{model.detail}</td>
                  <td><span className={`ai-state ${model.online === null ? "warning" : model.online ? "online" : model.configured ? "warning" : "offline"}`}><i />{model.status}</span></td>
                  <td><div className="ai-row-actions">
                    <button aria-label={`Xem cấu hình ${model.name}`} title="Xem cấu hình" onClick={() => setConfigModel(model)}><Settings size={15} /></button>
                    <button aria-label={`Kiểm tra ${model.name}`} title="Làm mới trạng thái" disabled={loading} onClick={() => setReload((value) => value + 1)}><Play size={14} /></button>
                    <button aria-label={`Lọc nhật ký ${model.name}`} title="Lọc nhật ký liên quan · nhấn lại để bỏ lọc" onClick={() => toggleActivityFilter(model.key)}><FileText size={15} /></button>
                  </div></td>
                </tr>
              ))}
              {!loading && !data?.models.length && <tr><td colSpan={5} className="empty-state">Chưa có thông tin dịch vụ.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="ai-usage-note"><Bot size={14} /> API key chỉ được kiểm tra cấu hình; lỗi kết nối Gemini được phản ánh sau khi có yêu cầu thực tế. Bí mật không hiển thị trong trang quản trị.</p>
      </section>

      <section className="ai-panel ai-report-summary">
        <div className="ai-report-icon"><ShieldAlert size={19} /></div>
        <div className="ai-report-copy">
          <h2>Giám sát nội dung cộng đồng</h2>
          <p><strong>{number(data?.moderation.pending ?? 0)}</strong> bài viết đang chờ xử lý. {data?.moderation.reportsTracked ? `${number(data.moderation.reported ?? 0)} nội dung bị báo cáo.` : "Chức năng báo cáo nội dung chưa được triển khai trong ứng dụng."}</p>
        </div>
        <button className="community-export" onClick={onOpenCommunity}>Mở Quản lý bài đăng</button>
      </section>

      <section className="ai-panel ai-audit-panel" id="ai-activity-log">
        <div className="ai-panel-heading">
          <div><h2><Activity size={16} /> Nhật ký hoạt động AI</h2><p>{metricFilterActive ? "Các lượt phát sinh trong hôm nay, khớp với thẻ thống kê đã chọn." : "30 hoạt động gần nhất, bao gồm lượt gọi thành công và lỗi."}</p></div>
          <span className="ai-audit-source"><Clock3 size={13} /> Lưu trong MySQL</span>
        </div>
        {activityFilter && <div className="ai-log-filter"><span>Đang lọc nhật ký: {activityFilterName[activityFilter] || "AI"}</span><button className="text-button" onClick={() => setActivityFilter(null)}>Xem tất cả</button></div>}
        <div className="ai-audit-table-wrap">
          <table className="ai-audit-table">
            <thead><tr><th>THỜI GIAN</th><th>NGƯỜI DÙNG</th><th>HOẠT ĐỘNG</th><th>MODEL</th><th>THỜI GIAN XỬ LÝ</th><th>KẾT QUẢ</th></tr></thead>
            <tbody>
              {visibleActivity.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.time)}</td>
                  <td className="ai-audit-user"><strong>{item.userName || (item.userId ? `Tài khoản #${item.userId}` : "Chưa ghi nhận")}</strong>{item.userEmail && <small>{item.userEmail}</small>}{!item.userId && <small>Nhật ký cũ / dịch vụ</small>}</td>
                  <td><strong>{activityName[item.type]}</strong></td><td>{item.model}</td>
                  <td>{item.durationMs == null ? "—" : `${number(item.durationMs)} ms`}</td>
                  <td><span className={`ai-audit-status ${item.status.toLowerCase()}`}>{statusName[item.status]}{item.errorCode ? ` · ${item.errorCode}` : ""}</span></td>
                </tr>
              ))}
              {!loading && !visibleActivity.length && <tr><td colSpan={6} className="empty-state"><Eye size={18} /> {activityFilter ? "Chưa có nhật ký cho dịch vụ này." : "Chưa có nhật ký AI. Chạy migration và phát sinh hoạt động để bắt đầu ghi nhận."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {configModel && <Modal title={`Cấu hình ${configModel.name}`} onClose={() => setConfigModel(null)} className="ai-config-modal">
        <p className="ai-config-intro">Các giá trị bí mật không hiển thị trong trang quản trị. Cập nhật cấu hình tại môi trường backend rồi khởi động lại dịch vụ tương ứng.</p>
        <div className="ai-config-row"><small>Engine</small><strong>{configModel.architecture}</strong></div>
        <div className="ai-config-row"><small>Phiên bản</small><strong>{configModel.version}</strong></div>
        <div className="ai-config-row"><small>Nơi cấu hình</small><code>{configModel.configHint}</code></div>
        <div className="ai-config-row"><small>Trạng thái</small><strong>{configModel.status}</strong></div>
      </Modal>}
    </div>
  );
}
