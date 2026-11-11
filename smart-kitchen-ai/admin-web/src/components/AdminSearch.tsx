// Tìm kiếm toàn hệ thống theo công thức, nguyên liệu và người dùng.
// Trì hoãn truy vấn khi nhập, phân nhóm kết quả và hỗ trợ chuyển trang.
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import Modal from "./Modal";
import { ApiError, apiRequest } from "../lib/adminApi";
import type { SearchItem, SearchResults } from "../lib/adminApi";

const labels = {
  all: "Tất cả",
  recipes: "Công thức",
  ingredients: "Nguyên liệu",
  users: "Người dùng",
};
type Filter = keyof typeof labels;
export default function AdminSearch({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SearchResults | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const unauthorizedRef = useRef(onUnauthorized);
  unauthorizedRef.current = onUnauthorized;
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!open) inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [open]);
  useEffect(() => {
    if (!open || !query.trim()) {
      setResult(null);
      setLoading(false);
      setError("");
      setSelected(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setResult(null);
    setSelected(null);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        q: query.trim(),
        type,
        page: String(page),
      });
      apiRequest<SearchResults>(`/api/admin/search?${params}`, token, {
        signal: controller.signal,
      })
        .then((data) => {
          if (!controller.signal.aborted) setResult(data);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          if (err instanceof ApiError && [401, 403].includes(err.status))
            unauthorizedRef.current(err.message);
          else
            setError(
              err instanceof Error ? err.message : "Không thể tìm kiếm.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, type, page, token, retry]);
  const groups = result
    ? (["recipes", "ingredients", "users"] as const).flatMap((key) => {
        const group = result.groups[key];
        return group ? [[key, group] as const] : [];
      })
    : [];
  const hasMore = groups.some(([, group]) => group.hasMore);
  const count = groups.reduce(
    (total, [, group]) => total + group.items.length,
    0,
  );
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
    setSelected(null);
  };
  return (
    <>
      <form
        className="global-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setOpen(true);
          setPage(1);
        }}
      >
        <button
          type="submit"
          className="search-submit"
          aria-label="Tìm kiếm toàn hệ thống"
        >
          <Search size={16} />
        </button>
        <input
          ref={inputRef}
          maxLength={100}
          placeholder="Tìm công thức, nguyên liệu, người dùng…"
          aria-label="Tìm kiếm toàn hệ thống, nhấn Enter để xem kết quả"
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
        />
      </form>
      {open && (
        <Modal
          title="Tìm kiếm toàn hệ thống"
          onClose={() => {
            setOpen(false);
            setSelected(null);
          }}
        >
          <label className="search-dialog-input">
            <Search size={18} />
            <input
              autoFocus
              maxLength={100}
              aria-label="Từ khoá tìm kiếm"
              placeholder="Nhập tên, danh mục, mã hoặc số điện thoại…"
              value={query}
              onChange={(e) => changeQuery(e.target.value)}
            />
            {query && (
              <button
                className="icon-button"
                aria-label="Xoá từ khoá"
                onClick={() => changeQuery("")}
              >
                <X size={15} />
              </button>
            )}
          </label>
          <div className="search-tabs" aria-label="Loại kết quả">
            {Object.entries(labels).map(([value, label]) => (
              <button
                key={value}
                className={type === value ? "selected" : ""}
                aria-pressed={type === value}
                onClick={() => {
                  setType(value as Filter);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {loading && <p role="status">Đang tìm trong cơ sở dữ liệu…</p>}
          {error && (
            <div className="data-error" role="alert">
              {error}
              <button
                className="text-button"
                onClick={() => setRetry((value) => value + 1)}
              >
                Thử lại
              </button>
            </div>
          )}
          {!query.trim() && (
            <p>
              Nhập từ khoá để tìm công thức, nguyên liệu hoặc người dùng. Hỗ trợ
              tiếng Việt có và không dấu.
            </p>
          )}
          {!loading && !error && result && (
            <div aria-live="polite">
              {!count && (
                <p>
                  Không tìm thấy kết quả phù hợp
                  {page > 1 ? " trên trang này" : ""}.
                </p>
              )}
              {groups.map(([key, group]) => (
                <section className="search-result-group" key={key}>
                  <h3>
                    {labels[key as Filter]} · {group.items.length}
                    {group.hasMore ? "+" : ""}
                  </h3>
                  {group.items.map((item) => (
                    <button
                      className="search-result"
                      key={item.id}
                      onClick={() => setSelected(item)}
                    >
                      <span>
                        <strong>{item.name}</strong>
                        <small>
                          #{item.id} ·{" "}
                          {item.category || item.phone || "Người dùng"}
                          {item.unit ? ` · ${item.unit}` : ""}
                        </small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </section>
              ))}
              {(page > 1 || hasMore) && (
                <div className="search-pagination">
                  <button
                    className="icon-button"
                    aria-label="Trang trước"
                    disabled={page === 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span>Trang {page}</span>
                  <button
                    className="icon-button"
                    aria-label="Trang sau"
                    disabled={!hasMore}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              )}
              {selected && (
                <section className="search-detail">
                  <h3>{selected.name}</h3>
                  <p>Mã: {selected.id}</p>
                  {selected.category && <p>Danh mục: {selected.category}</p>}
                  {selected.description && <p>{selected.description}</p>}
                  {selected.unit && <p>Đơn vị: {selected.unit}</p>}
                  {selected.phone && <p>Số điện thoại: {selected.phone}</p>}
                  {selected.email && <p>Email: {selected.email}</p>}
                  <button
                    className="text-button"
                    onClick={() => setSelected(null)}
                  >
                    Đóng chi tiết
                  </button>
                </section>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
