// Nút chuông thông báo bài chờ duyệt và lịch sử trạng thái bài đăng.
// Tự làm mới, đánh dấu đã đọc và mở bài tương ứng trong trang quản lý.
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { ApiError, apiRequest, formatDate } from "../lib/adminApi";
import type { AdminNotificationsData } from "../lib/adminApi";

type HistoryData={total:number;items:{id:string;title:string;author:string;createdAt:string;status:string;reviewedAt:string|null;reviewer:string;reason:string;read:boolean}[]};
const statusLabel:Record<string,string>={PENDING:'Chờ duyệt',APPROVED:'Đã duyệt',REJECTED:'Đã từ chối',HIDDEN:'Đã ẩn'};
export default function AdminNotifications({
  token,
  revision,
  onOpen,
  onUnauthorized,
}: {
  token: string;
  revision: number;
  onOpen: (id: string) => void;
  onUnauthorized: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AdminNotificationsData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [tab,setTab]=useState<'pending'|'history'>('pending');
  const [history,setHistory]=useState<HistoryData|null>(null),[historyPage,setHistoryPage]=useState(1),[historyLoading,setHistoryLoading]=useState(false),[historyError,setHistoryError]=useState('');
  const wrapper = useRef<HTMLDivElement>(null);
  const actionLock = useRef(false);
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;
  useEffect(() => {
    let controller: AbortController | undefined;
    const load = () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      apiRequest<AdminNotificationsData>("/api/admin/notifications", token, {
        signal,
      })
        .then((value) => {
          if (!signal.aborted) {
            setData(value);
            setError("");
          }
        })
        .catch((err) => {
          if (signal.aborted) return;
          if (err instanceof ApiError && [401, 403].includes(err.status))
            unauthorized.current(err.message);
          else
            setError(
              err instanceof Error ? err.message : "Không tải được thông báo.",
            );
        });
    };
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30000);
    const focus = () => load();
    window.addEventListener("focus", focus);
    return () => {
      controller?.abort();
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [token, revision, reload]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);
  useEffect(()=>{
    if(!open||tab!=='history')return;
    const controller=new AbortController();setHistoryLoading(true);setHistoryError('');setHistory(null);
    apiRequest<HistoryData>(`/api/admin/notifications/history?page=${historyPage}`,token,{signal:controller.signal}).then(value=>{if(!controller.signal.aborted){const max=Math.max(1,Math.ceil(value.total/20));if(historyPage>max)setHistoryPage(max);else setHistory(value);}}).catch(err=>{if(controller.signal.aborted)return;if(err instanceof ApiError&&[401,403].includes(err.status))unauthorized.current(err.message);else setHistoryError(err instanceof Error?err.message:'Không tải được lịch sử.');}).finally(()=>{if(!controller.signal.aborted)setHistoryLoading(false);});return()=>controller.abort();
  },[open,tab,historyPage,token,revision,reload]);
  // Đánh dấu một hoặc tất cả thông báo đã đọc; mở bài nếu có mã bài.
  async function read(id?: string) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    try {
      await apiRequest(
        id
          ? `/api/admin/notifications/${id}/read`
          : "/api/admin/notifications/read-all",
        token,
        { method: "PUT" },
      );
      setReload((value) => value + 1);
      if (id) {
        setOpen(false);
        onOpen(id);
      }
    } catch (err) {
      if (err instanceof ApiError && [401, 403].includes(err.status))
        unauthorized.current(err.message);
      else
        setError(
          err instanceof Error ? err.message : "Không thể đánh dấu đã đọc.",
        );
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="notification-wrap" ref={wrapper}>
      <button
        className="icon-button bell"
        aria-label={`Thông báo${data ? `, ${data.unread} chưa đọc` : ""}`}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open) setReload((value) => value + 1);
        }}
      >
        <Bell size={19} />
        {!!data?.unread && (
          <b className="notification-badge">
            {data.unread > 99 ? "99+" : data.unread}
          </b>
        )}
      </button>
      {open && (
        <section
          className="notification-popover real-notifications"
          aria-label="Thông báo duyệt bài"
        >
          <div className="notifications-heading">
            <strong>Thông báo bài đăng</strong>
            <button
              className="icon-button"
              aria-label="Tải lại thông báo"
              onClick={() => setReload((value) => value + 1)}
            >
              <RefreshCw size={15} />
            </button>
          </div>
          <div className="notification-tabs"><button className={tab==='pending'?'active':''} aria-pressed={tab==='pending'} onClick={()=>setTab('pending')}>Chờ duyệt {data?`(${data.pending})`:''}</button><button className={tab==='history'?'active':''} aria-pressed={tab==='history'} onClick={()=>setTab('history')}>Lịch sử</button></div>
          {tab==='history'&&<>{historyLoading&&<p role="status">Đang tải lịch sử…</p>}{historyError&&<p className="notification-error" role="alert">{historyError}</p>}{history&&<><small>{history.total} bài · trạng thái hiện tại</small><div className="notification-items">{history.items.map(item=><button className="notification-item" key={item.id} onClick={()=>{setOpen(false);onOpen(item.id);}}><strong>{item.title}</strong><span>{item.author} · {statusLabel[item.status]||item.status}</span>{item.status==='PENDING'&&<span>{item.read?'Đã đọc':'Chưa đọc'}</span>}{item.reviewer&&<span>Người xử lý: {item.reviewer}</span>}{item.status==='REJECTED'&&item.reason&&<span>Lý do: {item.reason}</span>}<time>Gửi: {formatDate(item.createdAt)}</time>{item.reviewedAt&&<time>Xử lý: {formatDate(item.reviewedAt)}</time>}</button>)}{!history.items.length&&<p>Chưa có lịch sử thông báo.</p>}</div><div className="notification-history-pages"><button disabled={historyPage===1} onClick={()=>setHistoryPage(n=>n-1)}>Trước</button><span>{historyPage} / {Math.max(1,Math.ceil(history.total/20))}</span><button disabled={historyPage>=Math.ceil(history.total/20)} onClick={()=>setHistoryPage(n=>n+1)}>Sau</button></div><small>Lịch sử từ bài đăng còn tồn tại; bài đã xóa không hiển thị.</small></>}</>}
          {tab==='pending'&&<>
          {error && (
            <p className="notification-error" role="alert">
              {error}
            </p>
          )}
          {!data && !error && <p role="status">Đang tải thông báo…</p>}
          {data && (
            <>
              <small>
                {data.pending} bài cần xử lý · {data.unread} chưa đọc
              </small>
              <div className="notification-items">
                {data.items.map((item) => (
                  <button
                    disabled={busy}
                    className={`notification-item ${item.read ? "" : "unread"}`}
                    key={item.id}
                    onClick={() => void read(item.id)}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.author} gửi bài để duyệt</span>
                    <time>{formatDate(item.createdAt)}</time>
                  </button>
                ))}
                {!data.items.length && <p>Không có bài đang chờ duyệt.</p>}
              </div>
              <div className="notification-footer">
                <button
                  className="text-button"
                  disabled={busy || !data.unread}
                  onClick={() => void read()}
                >
                  <CheckCheck size={14} />
                  Đọc tất cả
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setOpen(false);
                    onOpen("");
                  }}
                >
                  Xem danh sách duyệt
                </button>
              </div>
              {data.pending > 20 && (
                <small>
                  Hiển thị 20 bài gần nhất; mở danh sách để xem thêm.
                </small>
              )}
            </>
          )}
          </>}
        </section>
      )}
    </div>
  );
}
