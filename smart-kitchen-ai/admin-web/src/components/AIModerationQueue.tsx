import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Eye, FileSearch, LoaderCircle, RefreshCw, Search, Shield, ShieldAlert, Sparkles, Trash2, X } from "lucide-react";
import Modal from "./Modal";
import { ApiError, apiRequest, formatDate, imageUrl } from "../lib/adminApi";

type Review = {
  id: string;
  contentId: string;
  postId: string;
  type: "POST" | "COMMENT" | "RECIPE";
  title: string;
  content: string;
  image: string;
  author: string;
  authorId: string;
  trustScore: number;
  flags: string[];
  highlights: string[];
  riskScore: number | null;
  confidence: number | null;
  recommendation: "APPROVE" | "REVIEW" | "WARN" | null;
  reason: string;
  analysisStatus: "PENDING_ANALYSIS" | "ANALYZED" | "FAILED";
  status: "PENDING" | "SAFE" | "APPROVED" | "HIDDEN" | "DISMISSED" | "REMOVED";
  createdAt: string;
  analyzedAt: string | null;
};
type ReviewData = {
  items: Review[];
  total: number;
  hasMore: boolean;
  stats: { analyzed: number; pending: number; high_risk: number; processed: number };
};
type Props = { token: string; revision: number; onChanged: () => void; onUnauthorized: (message: string) => void };
type Action = "APPROVE" | "HIDE" | "DISMISS" | "DELETE_AND_PUNISH";

const flags = [
  ["INAPPROPRIATE", "Ngôn từ không phù hợp"],
  ["SPAM", "Spam"],
  ["OFF_TOPIC", "Không liên quan ẩm thực"],
  ["FOOD_SAFETY", "An toàn thực phẩm"],
  ["MISINFORMATION", "Thông tin sai lệch"],
] as const;
const statusNames: Record<Review["status"], string> = { PENDING: "Chờ Admin xử lý", SAFE: "An toàn", APPROVED: "Đã duyệt", HIDDEN: "Đã ẩn", DISMISSED: "Đã từ chối cảnh báo", REMOVED: "Đã xóa & phạt" };
const typeNames: Record<Review["type"], string> = { POST: "Bài viết", COMMENT: "Bình luận", RECIPE: "Công thức" };
const number = (value: number) => value.toLocaleString("vi-VN");
const flagName = (key: string) => flags.find(([value]) => value === key)?.[1] || key;

function RiskBadge({ score, pendingLabel = "Chờ phân tích" }: { score: number | null; pendingLabel?: string }) {
  if (score == null) return <span className="ai-risk pending">{pendingLabel}</span>;
  const level = score >= 70 ? "high" : score >= 30 ? "medium" : "low";
  const name = level === "high" ? "Cao" : level === "medium" ? "Trung bình" : "Thấp";
  return <span className={`ai-risk ${level}`}><strong>{score}%</strong><small>{name}</small></span>;
}

function resultGroup(item: Review) {
  if (item.analysisStatus !== "ANALYZED") return { label: item.analysisStatus === "FAILED" ? "Phân tích lỗi" : "Chờ phân tích", tone: "pending" };
  if ((item.riskScore ?? 0) >= 70) return { label: "Rủi ro cao", tone: "high" };
  if (item.flags.length || (item.riskScore ?? 0) >= 30) return { label: "Cần xem xét", tone: "review" };
  return { label: "An toàn", tone: "safe" };
}

function needsAdmin(item: Review) {
  return item.status === "PENDING" && item.analysisStatus === "ANALYZED" && (item.flags.length > 0 || (item.riskScore ?? 0) >= 30);
}

function reviewState(item: Review) {
  if (item.analysisStatus !== "ANALYZED") return item.analysisStatus === "FAILED" ? "Có thể thử phân tích lại" : "Đang chạy AI";
  return item.status === "SAFE" ? "Lưu trong lịch sử phân tích" : statusNames[item.status];
}

export default function AIModerationQueue({ token, revision, onChanged, onUnauthorized }: Props) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [selected, setSelected] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [flag, setFlag] = useState("ALL");
  const [risk, setRisk] = useState("ALL");
  const [status, setStatus] = useState("PENDING");
  const [days, setDays] = useState("ALL");
  const [sort, setSort] = useState("RISK_DESC");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [confirmPunish, setConfirmPunish] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const lock = useRef(false);
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / 10));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ type, flag, risk, status, days, sort, page: String(page), q: query.trim() });
      apiRequest<ReviewData>(`/api/admin/ai-moderation?${params}`, token, { signal: controller.signal })
        .then((value) => { if (!controller.signal.aborted) setData(value); })
        .catch((cause) => {
          if (controller.signal.aborted) return;
          if (cause instanceof ApiError && [401, 403].includes(cause.status)) unauthorized.current(cause.message);
          else setError(cause instanceof Error ? cause.message : "Không tải được hàng đợi AI.");
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, query ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [token, revision, type, flag, risk, status, days, sort, page, query, reload]);

  const changeFilter = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLSelectElement>) => { setter(event.target.value); setPage(1); };
  async function scanNewContent() {
    if (lock.current) return;
    lock.current = true; setScanning(true); setError(""); setNotice("");
    try {
      const result = await apiRequest<{ queued: number }>("/api/admin/ai-moderation/scan", token, { method: "POST" });
      setNotice(result.queued ? `Đã đưa ${number(result.queued)} nội dung mới vào hàng đợi phân tích.` : "Không có nội dung mới cần đưa vào hàng đợi.");
      setReload(value => value + 1);
    } catch (cause) {
      if (cause instanceof ApiError && [401, 403].includes(cause.status)) unauthorized.current(cause.message);
      else setError(cause instanceof Error ? cause.message : "Không thể quét nội dung mới.");
    } finally { lock.current = false; setScanning(false); }
  }
  async function applyDecision(action: Action) {
    if (!selected || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await apiRequest(`/api/admin/ai-moderation/${selected.id}/decision`, token, { method: "PATCH", body: JSON.stringify({ action, note: actionNote }) });
      setNotice(action === "APPROVE" ? "Đã duyệt nội dung." : action === "HIDE" ? "Đã ẩn nội dung." : action === "DISMISS" ? "Đã bỏ qua cảnh báo AI." : "Đã xóa nội dung và khóa tài khoản.");
      setSelected(null); setConfirmPunish(false); setActionNote(""); setReload(value => value + 1); onChanged();
    } catch (cause) {
      if (cause instanceof ApiError && [401, 403].includes(cause.status)) unauthorized.current(cause.message);
      else setError(cause instanceof Error ? cause.message : "Không thể xử lý nội dung.");
    } finally { lock.current = false; setBusy(false); }
  }
  async function retryAnalysis(item: Review) {
    try { await apiRequest(`/api/admin/ai-moderation/${item.id}/retry`, token, { method: "POST" }); setReload(value => value + 1); }
    catch (cause) {
      if (cause instanceof ApiError && [401, 403].includes(cause.status)) unauthorized.current(cause.message);
      else setError(cause instanceof Error ? cause.message : "Không thể phân tích lại.");
    }
  }

  return (
    <div className="ai-review-page">
      <div className="ai-review-heading">
        <div><h2><Sparkles size={17} /> Kiểm duyệt AI</h2><p>AI phân tích và đề xuất; Admin quyết định cách xử lý cuối cùng.</p></div>
        <button className="community-export ai-scan-button" disabled={scanning || busy} onClick={() => void scanNewContent()}>
          {scanning ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />} {scanning ? "Đang quét…" : "Phân tích nội dung mới"}
        </button>
      </div>
      <div className="ai-review-score-note"><Shield size={14} /><span><b>Risk Score</b> là mức rủi ro nội dung · <b>Confidence</b> là độ tin cậy mô hình · <b>Trust Score</b> là uy tín tài khoản, chỉ để tham khảo và không dùng để gắn cờ nội dung.</span></div>
      <section className="ai-review-stats" aria-label="Thống kê kiểm duyệt AI">
        {[
          { label: "Tổng nội dung AI đã phân tích", value: data?.stats.analyzed, icon: FileSearch, tone: "blue" },
          { label: "Chờ Admin xử lý", value: data?.stats.pending, icon: AlertTriangle, tone: "orange" },
          { label: "Rủi ro cao", value: data?.stats.high_risk, icon: ShieldAlert, tone: "red" },
          { label: "Đã xử lý", value: data?.stats.processed, icon: Check, tone: "green" },
        ].map(({ label, value, icon: Icon, tone }) => <article key={label} className="ai-review-stat"><span className={`ai-review-stat-icon ${tone}`}><Icon size={16} /></span><small>{label}</small><strong>{value == null ? "—" : number(value)}</strong></article>)}
      </section>
      <p className="ai-review-stats-note">Thống kê tổng hợp trên dữ liệu AI đã phân tích; bảng bên dưới hiển thị theo bộ lọc đang chọn.</p>
      <section className="ai-review-toolbar">
        <label className="ai-review-search"><Search size={15} /><input value={query} maxLength={150} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm nội dung, tác giả hoặc ID…" /></label>
        <select value={type} onChange={changeFilter(setType)} aria-label="Loại nội dung"><option value="ALL">Tất cả loại</option><option value="POST">Bài viết</option><option value="COMMENT">Bình luận</option><option value="RECIPE">Công thức</option></select>
        <select value={flag} onChange={changeFilter(setFlag)} aria-label="Nhóm vi phạm"><option value="ALL">Tất cả AI Flag</option>{flags.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
        <select value={risk} onChange={changeFilter(setRisk)} aria-label="Mức rủi ro"><option value="ALL">Mọi mức rủi ro</option><option value="LOW">Thấp</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option></select>
        <select value={status} onChange={changeFilter(setStatus)} aria-label="Trạng thái kiểm duyệt"><option value="PENDING">Chờ Admin xử lý</option><option value="ANALYSIS_PENDING">Chờ phân tích</option><option value="FAILED">Phân tích lỗi</option><option value="SAFE">An toàn · Lịch sử phân tích</option><option value="APPROVED">Đã duyệt</option><option value="HIDDEN">Đã ẩn</option><option value="DISMISSED">Đã từ chối cảnh báo</option><option value="REMOVED">Đã xóa &amp; phạt</option><option value="ALL">Tất cả trạng thái</option></select>
        <select value={days} onChange={changeFilter(setDays)} aria-label="Thời gian"><option value="ALL">Mọi thời gian</option><option value="1">Hôm nay</option><option value="7">7 ngày</option><option value="30">30 ngày</option><option value="90">90 ngày</option></select>
        <select value={sort} onChange={changeFilter(setSort)} aria-label="Sắp xếp"><option value="RISK_DESC">Rủi ro cao trước</option><option value="NEWEST">Mới nhất trước</option></select>
      </section>
      {notice && <div className="community-action-notice" role="status"><Check size={15} />{notice}<button className="icon-button" aria-label="Đóng thông báo" onClick={() => setNotice("")}><X size={13} /></button></div>}
      {error && <div className="data-error" role="alert">{error}<button className="text-button" onClick={() => setReload(value => value + 1)}>Thử lại</button></div>}
      <section className="panel ai-review-table-panel" aria-busy={loading}>
        <div className="table-scroll"><table className="ai-review-table">
          <thead><tr><th>ID &amp; LOẠI NỘI DUNG</th><th>TÁC GIẢ &amp; TRUST SCORE</th><th>NỘI DUNG &amp; AI FLAG</th><th>THỜI GIAN</th><th>AI RISK SCORE</th><th>AI CONFIDENCE</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="empty-state">Đang tải hàng đợi AI…</td></tr> : data?.items.map(item => <tr key={item.id}>
              <td><strong className="ai-review-id">#{item.contentId}</strong><span className={`ai-type ${item.type.toLowerCase()}`}>{typeNames[item.type]}</span><small className="ai-decision-status">{statusNames[item.status]}</small></td>
              <td><strong>{item.author}</strong><span className="ai-trust-score">Trust Score <b>{item.trustScore}/100</b></span></td>
              <td className="ai-review-content"><strong>{item.title || item.content.slice(0, 76)}</strong><p>{item.content.slice(0, 130)}{item.content.length > 130 ? "…" : ""}</p><div className="ai-flag-list">{item.analysisStatus === "ANALYZED" ? item.flags.length ? item.flags.map(key => <span className="ai-flag" key={key}>{flagName(key)}</span>) : <span className="ai-flag safe">Không phát hiện flag</span> : <span className={`ai-flag ${item.analysisStatus === "FAILED" ? "failed" : "scanning"}`}>{item.analysisStatus === "FAILED" ? "Phân tích lỗi" : "AI đang phân tích"}</span>}</div></td>
              <td>{formatDate(item.analyzedAt || item.createdAt)}</td>
              <td><RiskBadge score={item.riskScore} pendingLabel={item.analysisStatus === "FAILED" ? "Phân tích lỗi" : "Chờ phân tích"} /></td>
              <td>{item.confidence == null ? <span className="ai-no-score">—</span> : <div className="ai-confidence"><strong>{item.confidence}%</strong><i><span style={{ width: `${item.confidence}%` }} /></i></div>}</td>
              <td><span className={`ai-result-group ${resultGroup(item).tone}`}>{resultGroup(item).label}</span><small className="ai-decision-status">{reviewState(item)}</small></td>
              <td><div className="ai-review-actions"><button title="Xem chi tiết" aria-label="Xem chi tiết" onClick={() => { setSelected(item); setActionNote(""); }}><Eye size={14} /></button>{needsAdmin(item) && <><button title="Duyệt" aria-label="Duyệt" disabled={busy} onClick={() => void decideFor(item, "APPROVE")}><Check size={14} /></button><button title="Ẩn" aria-label="Ẩn" disabled={busy} onClick={() => void decideFor(item, "HIDE")}><Eye size={14} /></button><button className="punish" title="Xóa & phạt" aria-label="Xóa và phạt" disabled={busy} onClick={() => setSelected(item)}><Trash2 size={14} /></button></>}{item.analysisStatus === "FAILED" && item.status === "PENDING" && <button title="Phân tích lại" aria-label="Phân tích lại" onClick={() => void retryAnalysis(item)}><RefreshCw size={14} /></button>}</div></td>
            </tr>)}
            {!loading && !error && !data?.items.length && <tr><td colSpan={8} className="empty-state"><Shield size={22} /><p>Không có nội dung trong bộ lọc này.</p><button className="text-button" onClick={() => { setStatus("PENDING"); setType("ALL"); setFlag("ALL"); setRisk("ALL"); setDays("ALL"); setQuery(""); setPage(1); }}>Về hàng chờ Admin</button></td></tr>}
          </tbody>
        </table></div>
        <div className="ai-review-pagination"><span>Hiển thị <b>{data?.total ? (page - 1) * 10 + 1 : 0}–{Math.min(page * 10, data?.total || 0)}</b> trong <b>{number(data?.total || 0)}</b> mục</span><div><button disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={14} />Trước</button><span>Trang {page}/{totalPages}</span><button disabled={loading || !data?.hasMore} onClick={() => setPage(value => value + 1)}>Sau<ChevronRight size={14} /></button></div></div>
      </section>

      {selected && <Modal title="Chi tiết kiểm duyệt AI" onClose={() => { if (!busy) setSelected(null); }} className="ai-review-modal">
        <div className="ai-detail-meta"><span className={`ai-type ${selected.type.toLowerCase()}`}>{typeNames[selected.type]} · #{selected.contentId}</span><span>{formatDate(selected.createdAt)}</span></div>
        {selected.image && <img className="ai-review-image" src={imageUrl(selected.image)} alt="Ảnh đính kèm nội dung" />}
        <h3 className="ai-detail-title">{selected.title || `Nội dung ${typeNames[selected.type].toLowerCase()}`}</h3>
        <div className="ai-detail-author"><span><strong>{selected.author}</strong><small>ID người dùng: {selected.authorId}</small></span><span className="ai-trust-score">Trust Score <b>{selected.trustScore}/100</b></span></div>
        <div className="ai-original-content">{selected.content || "(Không có nội dung văn bản)"}</div>
        <div className="ai-detail-scores"><div><small>AI Risk Score</small><RiskBadge score={selected.riskScore} pendingLabel={selected.analysisStatus === "FAILED" ? "Phân tích lỗi" : "Chờ phân tích"} /></div><div><small>AI Confidence</small><strong>{selected.confidence == null ? "—" : `${selected.confidence}%`}</strong></div><div><small>Trạng thái</small><strong>{resultGroup(selected).label} · {reviewState(selected)}</strong></div></div>
        <div className="ai-detail-section"><h4>AI Flag</h4><div className="ai-flag-list">{selected.analysisStatus !== "ANALYZED" ? <span className={`ai-flag ${selected.analysisStatus === "FAILED" ? "failed" : "scanning"}`}>{selected.analysisStatus === "FAILED" ? "Phân tích lỗi" : "Chờ phân tích"}</span> : selected.flags.length ? selected.flags.map(key => <span className="ai-flag" key={key}>{flagName(key)}</span>) : <span className="ai-flag safe">Không phát hiện dấu hiệu vi phạm</span>}</div></div>
        <div className="ai-detail-section"><h4>Lý do AI cảnh báo</h4><p>{selected.reason || (selected.analysisStatus === "FAILED" ? "Không thể phân tích nội dung. Hãy thử lại hoặc kiểm tra thủ công." : "AI chưa hoàn tất phân tích.")}</p></div>
        {selected.analysisStatus === "ANALYZED" && <div className="ai-detail-section"><h4>Từ khóa / đoạn nội dung đáng chú ý</h4>{selected.highlights.length ? <div className="ai-highlight-list">{selected.highlights.map((highlight, index) => <blockquote key={`${index}-${highlight}`}>{highlight}</blockquote>)}</div> : <p>AI không trích xuất được đoạn đáng chú ý.</p>}</div>}
        <div className="ai-recommendation"><Sparkles size={15} /><span><b>AI Recommendation:</b> {selected.recommendation === "APPROVE" ? "Đề xuất duyệt" : selected.recommendation === "WARN" ? "Đề xuất cảnh báo / xử lý" : selected.recommendation === "REVIEW" ? "Cần Admin xem xét" : "Chưa có đề xuất"}. Đây chỉ là gợi ý; Admin quyết định cuối cùng.</span></div>
        <label className="ai-action-note">Ghi chú xử lý (không bắt buộc)<textarea maxLength={1000} value={actionNote} onChange={event => setActionNote(event.target.value)} placeholder="Nhập ghi chú cho quyết định của Admin…" /></label>
        {needsAdmin(selected) && <div className="ai-detail-actions"><button className="quick-approve" disabled={busy} onClick={() => void applyDecision("APPROVE")}><Check size={14} />Duyệt nội dung</button><button className="quick-hide" disabled={busy} onClick={() => void applyDecision("HIDE")}><Eye size={14} />Ẩn nội dung</button><button className="quick-delete" disabled={busy} onClick={() => setConfirmPunish(true)}><Trash2 size={14} />Xóa nội dung &amp; xử lý tài khoản</button><button className="quick-view" disabled={busy} onClick={() => void applyDecision("DISMISS")}><X size={14} />Bỏ qua cảnh báo · AI nhận diện nhầm</button></div>}
        {selected.status === "PENDING" && selected.analysisStatus === "FAILED" && <button className="text-button" onClick={() => void retryAnalysis(selected)}>Thử phân tích lại</button>}
        {error && <div className="data-error" role="alert">{error}</div>}
      </Modal>}
      {confirmPunish && selected && <Modal title="Xóa nội dung và phạt tài khoản?" onClose={() => { if (!busy) setConfirmPunish(false); }} className="ai-punish-modal">
        <p>Nội dung sẽ bị xóa và tài khoản <b>{selected.author}</b> sẽ bị khóa. Thao tác này do Admin xác nhận và không thể hoàn tác từ hàng đợi AI.</p>
        <div className="ai-punish-actions"><button className="community-export" disabled={busy} onClick={() => setConfirmPunish(false)}>Quay lại</button><button className="quick-delete" disabled={busy} onClick={() => void applyDecision("DELETE_AND_PUNISH")}><Trash2 size={14} />Xóa &amp; khóa tài khoản</button></div>
      </Modal>}
    </div>
  );

  async function decideFor(item: Review, action: Action) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await apiRequest(`/api/admin/ai-moderation/${item.id}/decision`, token, { method: "PATCH", body: JSON.stringify({ action }) });
      setNotice(action === "APPROVE" ? "Đã duyệt nội dung." : "Đã ẩn nội dung.");
      setSelected(null); setReload(value => value + 1); onChanged();
    } catch (cause) {
      if (cause instanceof ApiError && [401, 403].includes(cause.status)) onUnauthorized(cause.message);
      else setError(cause instanceof Error ? cause.message : "Không thể xử lý nội dung.");
    } finally { lock.current = false; setBusy(false); }
  }
}
