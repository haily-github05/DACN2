// Trang Quản lý công thức: tìm/lọc món, xem định lượng và các bước nấu.
// Hỗ trợ tạo/sửa, bật/tắt, xóa công thức, xuất JSON và in/lưu PDF.
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChefHat,
  Clock,
  Download,
  ImageOff,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Modal from "../components/Modal";
import { ApiError, apiRequest, imageUrl } from "../lib/adminApi";
import type { IngredientCatalog } from "../lib/adminApi";
type Recipe = {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  region: string;
  difficulty: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  calories: number | null;
  cost: number | null;
  summary: string;
  active: boolean;
  ingredientCount?: number;
};
type Detail = Recipe & {
  ingredients: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    optional: boolean;
    note: string;
  }[];
  steps: { instruction: string; duration: number | null; image: string }[];
};
type Catalog = {
  items: Recipe[];
  total: number;
  stats: { total: number; active: number; quick: number; cooked: number };
  categories: string[];
  difficulties: string[];
};
type Props = {
  token: string;
  revision: number;
  onChanged: () => void;
  onUnauthorized: (message: string) => void;
};
const empty = (): Detail => ({
  id: "",
  name: "",
  description: "",
  image: "",
  category: "Món chính",
  region: "",
  difficulty: "Dễ",
  prepTime: 0,
  cookTime: 0,
  servings: 2,
  calories: null,
  cost: null,
  summary: "",
  active: false,
  ingredients: [],
  steps: [{ instruction: "", duration: null, image: "" }],
});
const num = (n: number) => n.toLocaleString("vi-VN");
function Photo({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img src={imageUrl(src)} alt="" onError={() => setFailed(true)} />
  ) : (
    <span className="recipe-no-image">
      <ImageOff size={24} />
    </span>
  );
}
export default function QuanLyCongThuc({
  token,
  revision,
  onChanged,
  onUnauthorized,
}: Props) {
  const [data, setData] = useState<Catalog | null>(null),
    [q, setQ] = useState(""),
    [category, setCategory] = useState(""),
    [difficulty, setDifficulty] = useState(""),
    [status, setStatus] = useState(""),
    [quick, setQuick] = useState(""),
    [calories, setCalories] = useState(""),
    [page, setPage] = useState(1),
    [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [selected, setSelected] = useState(""),
    [detail, setDetail] = useState<Detail | null>(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState("");
  const [checked, setChecked] = useState<string[]>([]),
    [compact, setCompact] = useState(false),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState<Recipe | null>(null),
    [editor, setEditor] = useState<Detail | null>(null),
    [formError, setFormError] = useState("");
  const [options, setOptions] = useState<
      { id: string; name: string; unit: string }[]
    >([]),
    [optionError, setOptionError] = useState("");
  const unauthorized = useRef(onUnauthorized),
    lock = useRef(false);
  unauthorized.current = onUnauthorized;
  const fail = (err: unknown, setter: (message: string) => void) => {
    if (err instanceof ApiError && [401, 403].includes(err.status))
      unauthorized.current(err.message);
    else
      setter(
        err instanceof Error ? err.message : "Không thực hiện được thao tác.",
      );
  };
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setChecked([]);
    const timer = setTimeout(
      () => {
        const params = new URLSearchParams({
          q,
          category,
          difficulty,
          status,
          quick,
          calories,
          page: String(page),
        });
        apiRequest<Catalog>(`/api/admin/recipes?${params}`, token, {
          signal: controller.signal,
        })
          .then((value) => {
            if (controller.signal.aborted) return;
            const max = Math.max(1, Math.ceil(value.total / 10));
            if (page > max) {
              setPage(max);
              return;
            }
            setData(value);
          })
          .catch((err) => {
            if (controller.signal.aborted) return;
            if (err instanceof ApiError && [401, 403].includes(err.status))
              unauthorized.current(err.message);
            else
              setError(
                err instanceof Error
                  ? err.message
                  : "Không tải được công thức.",
              );
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      q ? 300 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    token,
    revision,
    reload,
    q,
    category,
    difficulty,
    status,
    quick,
    calories,
    page,
  ]);
  useEffect(() => {
    setDetail(null);
    setDetailError("");
    if (!selected) return;
    const controller = new AbortController();
    setDetailLoading(true);
    apiRequest<Detail>(`/api/admin/recipes/${selected}`, token, {
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) setDetail(value);
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
  }, [selected, token, revision, reload]);
  const editing = editor !== null;
  useEffect(() => {
    if (!editing) return;
    const controller = new AbortController();
    setOptionError("");
    setOptions([]);
    (async () => {
      const items: { id: string; name: string; unit: string }[] = [];
      let p = 1,
        total = 1;
      while (items.length < total) {
        const value = await apiRequest<IngredientCatalog>(
          `/api/admin/ingredients?page=${p++}&pageSize=50`,
          token,
          { signal: controller.signal },
        );
        items.push(
          ...value.items.map((i) => ({ id: i.id, name: i.name, unit: i.unit })),
        );
        total = value.total;
        if (!value.items.length) break;
      }
      if (!controller.signal.aborted) setOptions(items);
    })().catch((err) => {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError && [401, 403].includes(err.status))
        unauthorized.current(err.message);
      else
        setOptionError(
          "Không tải được danh mục nguyên liệu. Đóng và mở lại để thử lại.",
        );
    });
    return () => controller.abort();
  }, [editing, token]);
  // Chặn thao tác gửi trùng và xử lý lỗi API thống nhất.
  async function action(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    setDetailError("");
    try {
      await fn();
    } catch (err) {
      fail(err, setDetailError);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  // Lưu thông tin món cùng định lượng và các bước nấu.
  async function save() {
    if (!editor || lock.current) return;
    lock.current = true;
    setBusy(true);
    setFormError("");
    try {
      const result = await apiRequest<{ id: string }>(
        editor.id ? `/api/admin/recipes/${editor.id}` : "/api/admin/recipes",
        token,
        { method: editor.id ? "PUT" : "POST", body: JSON.stringify(editor) },
      );
      setEditor(null);
      setSelected(result.id);
      setNotice("Đã lưu công thức.");
      onChanged();
    } catch (err) {
      fail(err, setFormError);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  // Tải chi tiết các món đã chọn hoặc trang hiện tại để xuất JSON.
  async function exportJson() {
    const ids = checked.length ? checked : data?.items.map((r) => r.id) || [];
    await action(async () => {
      const recipes = [];
      for (const id of ids)
        recipes.push(
          await apiRequest<Detail>(`/api/admin/recipes/${id}`, token),
        );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(recipes, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "cong-thuc.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(`Đã xuất ${recipes.length} công thức.`);
    });
  }
  // Xóa các bộ lọc công thức và quay về trang đầu.
  function reset() {
    setQ("");
    setCategory("");
    setDifficulty("");
    setStatus("");
    setQuick("");
    setCalories("");
    setPage(1);
  }
  const pages = Math.max(1, Math.ceil((data?.total || 0) / 10));
  return (
    <div className="recipes-page">
      <header className="recipes-heading">
        <div>
          <h1>Quản lý Công thức Nấu ăn</h1>
          <p>
            Quản lý thư viện món ăn, định lượng nguyên liệu và hướng dẫn nấu
            từng bước.
          </p>
        </div>
        <div>
          <button
            className="community-export"
            disabled={busy || loading || !data?.items.length || !!error}
            onClick={() => void exportJson()}
          >
            <Download size={15} />
            Xuất JSON {checked.length ? `(${checked.length})` : ""}
          </button>
          <button
            className="primary"
            onClick={() => {
              setEditor(empty());
              setFormError("");
            }}
          >
            <Plus size={16} />
            Tạo công thức mới
          </button>
        </div>
      </header>
      <section className="recipes-stats">
        {[
          {
            label: "Tổng công thức",
            value: data?.stats.total,
            icon: BookOpen,
            note: "Thư viện món ăn trong hệ thống",
          },
          {
            label: "Công thức đang hoạt động",
            value: data?.stats.active,
            icon: Check,
            note: "Hiển thị trong thư viện người dùng",
          },
          {
            label: "Món nấu nhanh dưới 15 phút",
            value: data?.stats.quick,
            icon: Clock,
            note: "Tổng thời gian chuẩn bị và nấu",
          },
          {
            label: "Lượt nấu đã ghi nhận",
            value: data?.stats.cooked,
            icon: ChefHat,
            note: "Từ lịch sử nấu của người dùng",
          },
        ].map(({ label, value, icon: Icon, note }) => (
          <article key={label}>
            <span>
              {label}
              <Icon size={22} />
            </span>
            <strong>{value === undefined ? "—" : num(value)}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <section className="panel recipes-toolbar">
        <div className="recipes-tabs">
          <button
            className={!status && !quick ? "active" : ""}
            onClick={() => {
              setStatus("");
              setQuick("");
              setPage(1);
            }}
          >
            Tất cả <b>{data?.stats.total ?? "—"}</b>
          </button>
          <button
            className={status === "active" ? "active" : ""}
            onClick={() => {
              setStatus("active");
              setQuick("");
              setPage(1);
            }}
          >
            Đang hoạt động
          </button>
          <button
            className={status === "inactive" ? "active" : ""}
            onClick={() => {
              setStatus("inactive");
              setQuick("");
              setPage(1);
            }}
          >
            Ngừng hoạt động
          </button>
          <button
            className={quick ? "active" : ""}
            onClick={() => {
              setStatus("");
              setQuick("1");
              setPage(1);
            }}
          >
            Nấu nhanh &lt;15 phút
          </button>
        </div>
        <div className="recipes-filters">
          <label>
            <Search size={16} />
            <input
              value={q}
              maxLength={100}
              placeholder="Tìm món ăn hoặc nguyên liệu…"
              aria-label="Tìm công thức"
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="Danh mục công thức"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả danh mục</option>
            {data?.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Độ khó"
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả độ khó</option>
            {data?.difficulties.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Mức calo"
            value={calories}
            onChange={(e) => {
              setCalories(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả mức calo</option>
            <option value="low">Dưới 300 kcal</option>
            <option value="medium">300–600 kcal</option>
            <option value="high">Trên 600 kcal</option>
          </select>
          <button className="text-button" onClick={reset}>
            Đặt lại
          </button>
          <button
            className="icon-button"
            aria-label="Làm mới công thức"
            onClick={() => setReload((n) => n + 1)}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </section>
      {notice && (
        <p className="community-action-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <div className="data-error" role="alert">
          {error}
          <button onClick={() => setReload((n) => n + 1)}>Thử lại</button>
        </div>
      )}
      {detailError && (
        <p className="data-error" role="alert">
          {detailError}
        </p>
      )}
      <div className={`recipes-workspace ${selected ? "has-detail" : ""}`}>
        <section className="panel recipes-list">
          <div className="recipes-list-tools">
            <label>
              <input
                type="checkbox"
                aria-label="Chọn cả trang"
                checked={
                  !!data?.items.length &&
                  data.items.every((r) => checked.includes(r.id))
                }
                disabled={loading || !!error}
                onChange={(e) =>
                  setChecked(
                    e.target.checked ? data?.items.map((r) => r.id) || [] : [],
                  )
                }
              />
              Đã chọn {checked.length} công thức
            </label>
            <button aria-pressed={compact} onClick={() => setCompact(!compact)}>
              {compact ? "Mật độ: Gọn" : "Mật độ: Chuẩn"}
            </button>
          </div>
          <div className="table-scroll">
            <table className={`recipes-table ${compact ? "compact" : ""}`}>
              <thead>
                <tr>
                  <th />
                  <th>Món ăn & mã ID</th>
                  <th>Nguyên liệu</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      Đang tải công thức…
                    </td>
                  </tr>
                ) : (
                  !error &&
                  data?.items.map((r) => (
                    <tr
                      key={r.id}
                      className={selected === r.id ? "selected" : ""}
                    >
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${r.name}`}
                          checked={checked.includes(r.id)}
                          onChange={(e) =>
                            setChecked((ids) =>
                              e.target.checked
                                ? [...ids, r.id]
                                : ids.filter((id) => id !== r.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="recipe-row-title"
                          onClick={() => setSelected(r.id)}
                        >
                          <Photo key={r.id + r.image} src={r.image} />
                          <span>
                            <strong>{r.name}</strong>
                            <small>
                              RCP-{r.id} · {r.difficulty || "Chưa có độ khó"}
                            </small>
                            <small>{r.category}</small>
                          </span>
                        </button>
                      </td>
                      <td>{r.ingredientCount} nguyên liệu</td>
                      <td>{r.prepTime + r.cookTime} phút</td>
                      <td>
                        <span
                          className={`community-status ${r.active ? "approved" : "pending"}`}
                        >
                          {r.active ? "Hoạt động" : "Ngừng hoạt động"}
                        </span>
                      </td>
                      <td>
                        <div className="recipe-row-actions">
                          <button
                            className="icon-button delete"
                            disabled={busy}
                            title="Xóa"
                            aria-label={`Xóa ${r.name}`}
                            onClick={() => setDeleting(r)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && !error && !data?.items.length && (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      Không tìm thấy công thức phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="ingredient-pagination">
            <span>{num(data?.total || 0)} công thức · 10 dòng mỗi trang</span>
            <div>
              <button
                disabled={page === 1 || loading}
                onClick={() => setPage((n) => n - 1)}
              >
                ‹
              </button>
              <span>
                {page} / {pages}
              </span>
              <button
                disabled={page >= pages || loading}
                onClick={() => setPage((n) => n + 1)}
              >
                ›
              </button>
            </div>
          </div>
        </section>
        {selected && (
          <aside className="panel recipe-detail">
            <button
              className="recipe-detail-close icon-button"
              aria-label="Đóng chi tiết"
              onClick={() => setSelected("")}
            >
              <X size={18} />
            </button>
            {detailLoading ? (
              <p className="empty-state">Đang tải chi tiết…</p>
            ) : detail ? (
              <>
                <div className="recipe-hero">
                  <Photo key={detail.id + detail.image} src={detail.image} />
                  <div>
                    <span>{detail.category}</span>
                    <h2>{detail.name}</h2>
                  </div>
                </div>
                <div className="recipe-detail-body">
                  <div className="recipe-facts">
                    <span>
                      Thời gian
                      <strong>{detail.prepTime + detail.cookTime} phút</strong>
                    </span>
                    <span>
                      Độ khó
                      <strong>{detail.difficulty || "Chưa phân loại"}</strong>
                    </span>
                    <span>
                      Khẩu phần<strong>{detail.servings} người</strong>
                    </span>
                  </div>
                  <p>{detail.description}</p>
                  <p>
                    {detail.calories == null
                      ? "Chưa có dữ liệu calo"
                      : `${num(detail.calories)} kcal`}{" "}
                    · {detail.active ? "Đang hoạt động" : "Ngừng hoạt động"}
                  </p>
                  <h3>Quy trình nấu · {detail.steps.length} bước</h3>
                  <ol className="recipe-steps">
                    {detail.steps.map((step, index) => (
                      <li key={index}>
                        <b>{index + 1}</b>
                        <div>
                          {step.duration != null && (
                            <small>{step.duration} phút</small>
                          )}
                          <p>{step.instruction}</p>
                          {step.image && (
                            <img
                              src={imageUrl(step.image)}
                              alt={`Bước ${index + 1}`}
                            />
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {!detail.steps.length && (
                    <p>{detail.summary || "Chưa có hướng dẫn nấu."}</p>
                  )}
                  <h3>Định lượng nguyên liệu</h3>
                  <ul className="recipe-ingredients">
                    {detail.ingredients.map((i) => (
                      <li key={i.id}>
                        <span>
                          {i.name}
                          {i.optional ? " (tùy chọn)" : ""}
                          {i.note && <small>{i.note}</small>}
                        </span>
                        <strong>
                          {i.quantity} {i.unit}
                        </strong>
                      </li>
                    ))}
                  </ul>
                  <div className="recipe-detail-actions">
                    <button
                      className="community-export"
                      disabled={busy}
                      onClick={() => {
                        setEditor(structuredClone(detail));
                        setFormError("");
                      }}
                    >
                      <Pencil size={15} />
                      Chỉnh sửa
                    </button>
                    <button
                      className="community-export"
                      disabled={busy}
                      onClick={() =>
                        void action(async () => {
                          await apiRequest(
                            `/api/admin/recipes/${detail.id}/status`,
                            token,
                            {
                              method: "PATCH",
                              body: JSON.stringify({ active: !detail.active }),
                            },
                          );
                          setNotice("Đã cập nhật trạng thái.");
                          onChanged();
                        })
                      }
                    >
                      {detail.active ? "Ngừng hoạt động" : "Kích hoạt"}
                    </button>
                    <button
                      className="community-export"
                      onClick={() => window.print()}
                    >
                      <Download size={15} />
                      In / PDF
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button
                className="text-button"
                onClick={() => setReload((n) => n + 1)}
              >
                Tải lại chi tiết
              </button>
            )}
          </aside>
        )}
      </div>
      {deleting && (
        <Modal
          title="Xóa công thức?"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p>{deleting.name}</p>
          <p>
            Chỉ xóa công thức chưa được người dùng lưu, nấu hoặc thêm vào lịch
            ăn. Ảnh được giữ nguyên.
          </p>
          {detailError && (
            <p className="data-error" role="alert">
              {detailError}
            </p>
          )}
          <button
            className="reject-button"
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await apiRequest(`/api/admin/recipes/${deleting.id}`, token, {
                  method: "DELETE",
                });
                if (selected === deleting.id) setSelected("");
                setDeleting(null);
                setNotice("Đã xóa công thức.");
                onChanged();
              })
            }
          >
            <Trash2 size={15} />
            {busy ? "Đang xóa…" : "Xóa công thức"}
          </button>
        </Modal>
      )}
      {editor && (
        <Modal
          title={editor.id ? "Chỉnh sửa công thức" : "Tạo công thức mới"}
          onClose={() => {
            if (!busy) setEditor(null);
          }}
        >
          <form
            className="community-create recipe-editor"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            {formError && (
              <p className="data-error" role="alert">
                {formError}
              </p>
            )}
            <label>
              Tên món
              <input
                required
                maxLength={150}
                value={editor.name}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
              />
            </label>
            <label>
              Mô tả
              <textarea
                maxLength={10000}
                value={editor.description}
                onChange={(e) =>
                  setEditor({ ...editor, description: e.target.value })
                }
              />
            </label>
            <label>
              Đường dẫn ảnh
              <input
                maxLength={500}
                value={editor.image}
                placeholder="https://… hoặc /uploads/…"
                onChange={(e) =>
                  setEditor({ ...editor, image: e.target.value })
                }
              />
            </label>
            <div className="ingredient-form-row">
              <label>
                Danh mục
                <input
                  required
                  maxLength={50}
                  value={editor.category}
                  onChange={(e) =>
                    setEditor({ ...editor, category: e.target.value })
                  }
                />
              </label>
              <label>
                Vùng miền
                <input
                  maxLength={50}
                  value={editor.region}
                  onChange={(e) =>
                    setEditor({ ...editor, region: e.target.value })
                  }
                />
              </label>
              <label>
                Độ khó
                <select
                  required
                  value={editor.difficulty}
                  onChange={(e) =>
                    setEditor({ ...editor, difficulty: e.target.value })
                  }
                >
                  <option value="">Chọn độ khó</option>
                  {[
                    ...new Set([
                      "Dễ",
                      "Vừa",
                      "Khó",
                      ...(editor.difficulty ? [editor.difficulty] : []),
                    ]),
                  ].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Khẩu phần
                <input
                  type="number"
                  min={1}
                  max={1000}
                  required
                  value={editor.servings}
                  onChange={(e) =>
                    setEditor({ ...editor, servings: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Chuẩn bị (phút)
                <input
                  type="number"
                  min={0}
                  max={10080}
                  required
                  value={editor.prepTime}
                  onChange={(e) =>
                    setEditor({ ...editor, prepTime: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Nấu (phút)
                <input
                  type="number"
                  min={0}
                  max={10080}
                  required
                  value={editor.cookTime}
                  onChange={(e) =>
                    setEditor({ ...editor, cookTime: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Calo
                <input
                  type="number"
                  min={0}
                  max={100000}
                  value={editor.calories ?? ""}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      calories:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Trạng thái
                <select
                  value={String(editor.active)}
                  onChange={(e) =>
                    setEditor({ ...editor, active: e.target.value === "true" })
                  }
                >
                  <option value="false">Ngừng hoạt động</option>
                  <option value="true">Hoạt động</option>
                </select>
              </label>
            </div>
            <h3>Nguyên liệu</h3>
            {optionError && <p role="alert">{optionError}</p>}
            {editor.ingredients.map((item, index) => (
              <div className="recipe-editor-ingredient" key={index}>
                <select
                  required
                  aria-label={`Nguyên liệu ${index + 1}`}
                  value={item.id}
                  onChange={(e) => {
                    const option = options.find((o) => o.id === e.target.value);
                    setEditor({
                      ...editor,
                      ingredients: editor.ingredients.map((i, n) =>
                        n === index
                          ? {
                              ...i,
                              id: e.target.value,
                              name: option?.name || "",
                              unit: option?.unit || "g",
                            }
                          : i,
                      ),
                    });
                  }}
                >
                  <option value="">Chọn nguyên liệu</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <input
                  required
                  aria-label={`Số lượng ${index + 1}`}
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      ingredients: editor.ingredients.map((i, n) =>
                        n === index
                          ? { ...i, quantity: Number(e.target.value) }
                          : i,
                      ),
                    })
                  }
                />
                <input
                  required
                  aria-label={`Đơn vị ${index + 1}`}
                  maxLength={20}
                  value={item.unit}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      ingredients: editor.ingredients.map((i, n) =>
                        n === index ? { ...i, unit: e.target.value } : i,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Xóa nguyên liệu ${index + 1}`}
                  onClick={() =>
                    setEditor({
                      ...editor,
                      ingredients: editor.ingredients.filter(
                        (_, n) => n !== index,
                      ),
                    })
                  }
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="community-export"
              disabled={!options.length || editor.ingredients.length >= 100}
              onClick={() =>
                setEditor({
                  ...editor,
                  ingredients: [
                    ...editor.ingredients,
                    {
                      id: "",
                      name: "",
                      quantity: 1,
                      unit: "g",
                      optional: false,
                      note: "",
                    },
                  ],
                })
              }
            >
              <Plus size={14} />
              Thêm nguyên liệu
            </button>
            <h3>Các bước nấu</h3>
            {editor.steps.map((step, index) => (
              <label key={index}>
                Bước {index + 1}
                <textarea
                  required
                  maxLength={10000}
                  value={step.instruction}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      steps: editor.steps.map((s, n) =>
                        n === index ? { ...s, instruction: e.target.value } : s,
                      ),
                    })
                  }
                />
                <input
                  aria-label={`Thời gian bước ${index + 1}`}
                  type="number"
                  min={0}
                  max={10080}
                  placeholder="Thời gian (phút)"
                  value={step.duration ?? ""}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      steps: editor.steps.map((s, n) =>
                        n === index
                          ? {
                              ...s,
                              duration:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            }
                          : s,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  className="text-button"
                  disabled={editor.steps.length === 1}
                  onClick={() =>
                    setEditor({
                      ...editor,
                      steps: editor.steps.filter((_, n) => n !== index),
                    })
                  }
                >
                  Xóa bước
                </button>
              </label>
            ))}
            <button
              type="button"
              className="community-export"
              disabled={editor.steps.length >= 100}
              onClick={() =>
                setEditor({
                  ...editor,
                  steps: [
                    ...editor.steps,
                    { instruction: "", duration: null, image: "" },
                  ],
                })
              }
            >
              <Plus size={14} />
              Thêm bước nấu
            </button>
            <button
              className="primary"
              disabled={
                busy ||
                !editor.ingredients.length ||
                !!optionError ||
                !options.length
              }
            >
              {busy ? "Đang lưu…" : "Lưu công thức"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
