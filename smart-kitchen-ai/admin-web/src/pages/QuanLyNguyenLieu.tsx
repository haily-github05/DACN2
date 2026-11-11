// Trang Quản lý nguyên liệu: quản lý danh mục, đơn vị, ảnh và gợi ý bảo quản chung.
// Hỗ trợ thêm/sửa, sửa hàng loạt, xóa nguyên liệu chưa dùng và xem công thức liên quan.
import IngredientRecipes from "../components/IngredientRecipes";
import { useEffect, useRef, useState } from "react";
import {
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Grid2X2,
  ImageOff,
  Layers,
  List,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  Thermometer,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Modal from "../components/Modal";
import { ApiError, apiRequest, formatDate, imageUrl } from "../lib/adminApi";
import type { CatalogIngredient, IngredientCatalog } from "../lib/adminApi";
const categoryDefaults = [
  "Thịt",
  "Hải sản",
  "Rau củ",
  "Trứng",
  "Sữa",
  "Đậu",
  "Nấm",
  "Gia vị",
  "Trái cây",
  "Ngũ cốc",
  "Khác",
];
const unitDefaults = [
  "g",
  "kg",
  "ml",
  "l",
  "quả",
  "củ",
  "bó",
  "cây",
  "hộp",
  "gói",
  "phần",
];
const storageDefaults = ["Ngăn mát", "Ngăn đông", "Nhiệt độ phòng", "Khô ráo"];
const number = (value: number) => value.toLocaleString("vi-VN");
const blank = () => ({
  name: "",
  category: "Rau củ",
  unit: "g",
  storage: "",
  image: "",
});
function IngredientImage({ image, name }: { image: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(image);
  return src && !failed ? (
    <img
      className="ingredient-thumb"
      src={src}
      alt={name}
      onError={() => setFailed(true)}
    />
  ) : (
    <span className="ingredient-thumb empty">
      <ImageOff size={21} />
    </span>
  );
}
type Props = {
  token: string;
  revision: number;
  onChanged: () => void;
  onUnauthorized: (message: string) => void;
};
export default function QuanLyNguyenLieu({
  token,
  revision,
  onChanged,
  onUnauthorized,
}: Props) {
  const [tab, setTab] = useState<"main" | "categories" | "units" | "storage">(
      "main",
    ),
    [view, setView] = useState<"table" | "grid">("table");
  const [q, setQ] = useState(""),
    [category, setCategory] = useState(""),
    [unit, setUnit] = useState(""),
    [storage, setStorage] = useState(""),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<IngredientCatalog | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [checked, setChecked] = useState<string[]>([]);
  const [editor, setEditor] = useState<"new" | CatalogIngredient | null>(null),
    [form, setForm] = useState(blank),
    [file, setFile] = useState<File | null>(null),
    [formError, setFormError] = useState(""),
    [preview, setPreview] = useState<CatalogIngredient | null>(null);
  const [deleting, setDeleting] = useState<CatalogIngredient[] | null>(null),
    [bulk, setBulk] = useState(false),
    [bulkCategory, setBulkCategory] = useState(""),
    [bulkStorage, setBulkStorage] = useState("__keep");
  const [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [notice, setNotice] = useState("");
  const [recipeSource,setRecipeSource]=useState<CatalogIngredient|null>(null);
  const lock = useRef(false),
    unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;
  const categories = [
    ...new Set([
      ...(data?.categories.map((row) => row.name) || []),
      ...categoryDefaults,
    ]),
  ].sort((a, b) => a.localeCompare(b, "vi"));
  const units = [
    ...new Set([
      ...(data?.units.map((row) => row.name) || []),
      ...unitDefaults,
    ]),
  ].sort((a, b) => a.localeCompare(b, "vi"));
  const storages = [
    ...new Set([
      ...(data?.storages
        .filter((row) => row.name !== "Chưa khai báo")
        .map((row) => row.name) || []),
      ...storageDefaults,
    ]),
  ];
  const selected = (data?.items || []).filter((item) =>
    checked.includes(item.id),
  );
  const pages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));
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
          unit,
          storage,
          page: String(page),
          pageSize: String(pageSize),
        });
        apiRequest<IngredientCatalog>(
          `/api/admin/ingredients?${params}`,
          token,
          { signal: controller.signal },
        )
          .then((value) => {
            if (controller.signal.aborted) return;
            const max = Math.max(1, Math.ceil(value.total / pageSize));
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
                  : "Không tải được nguyên liệu.",
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
  }, [token, revision, reload, q, category, unit, storage, page, pageSize]);
  const fail = (err: unknown, setter: (text: string) => void) => {
    if (err instanceof ApiError && [401, 403].includes(err.status))
      unauthorized.current(err.message);
    else
      setter(
        err instanceof Error ? err.message : "Không thể thực hiện thao tác.",
      );
  };
  // Mở biểu mẫu tạo mới hoặc điền dữ liệu nguyên liệu cần sửa.
  function edit(item?: CatalogIngredient) {
    setEditor(item || "new");
    setForm(
      item
        ? {
            name: item.name,
            category: item.category,
            unit: item.unit,
            storage: item.storage,
            image: item.image,
          }
        : blank(),
    );
    setFile(null);
    setFormError("");
  }
  // Tải ảnh nếu có, sau đó lưu thông tin nguyên liệu.
  async function save() {
    if (lock.current || !editor) return;
    lock.current = true;
    setBusy(true);
    setFormError("");
    try {
      let image = form.image;
      if (file) {
        const body = new FormData();
        body.append("image", file);
        const upload = await apiRequest<{ url: string }>(
          "/api/admin/ingredients/image",
          token,
          { method: "POST", body },
        );
        image = upload.url;
        setForm((current) => ({ ...current, image }));
        setFile(null);
      }
      await apiRequest(
        editor === "new"
          ? "/api/admin/ingredients"
          : `/api/admin/ingredients/${editor.id}`,
        token,
        {
          method: editor === "new" ? "POST" : "PUT",
          body: JSON.stringify({ ...form, image }),
        },
      );
      setEditor(null);
      setNotice(
        editor === "new"
          ? "Đã thêm nguyên liệu mới."
          : "Đã cập nhật nguyên liệu.",
      );
      onChanged();
    } catch (err) {
      fail(err, setFormError);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  // Gửi yêu cầu xóa nhóm nguyên liệu; backend kiểm tra các tham chiếu.
  async function remove() {
    if (lock.current || !deleting) return;
    lock.current = true;
    setBusy(true);
    setActionError("");
    try {
      await apiRequest("/api/admin/ingredients/bulk-delete", token, {
        method: "POST",
        body: JSON.stringify({ ids: deleting.map((item) => item.id) }),
      });
      setNotice(`Đã xóa ${deleting.length} nguyên liệu chưa được sử dụng.`);
      setDeleting(null);
      setChecked([]);
      onChanged();
    } catch (err) {
      fail(err, setActionError);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  // Chỉ cập nhật những trường đã chọn trong biểu mẫu sửa hàng loạt.
  async function saveBulk() {
    if (lock.current || !selected.length) return;
    lock.current = true;
    setBusy(true);
    setActionError("");
    try {
      await apiRequest("/api/admin/ingredients/bulk", token, {
        method: "PATCH",
        body: JSON.stringify({
          ids: checked,
          ...(bulkCategory ? { category: bulkCategory } : {}),
          ...(bulkStorage !== "__keep" ? { storage: bulkStorage } : {}),
        }),
      });
      setBulk(false);
      setNotice(`Đã cập nhật ${checked.length} nguyên liệu.`);
      onChanged();
    } catch (err) {
      fail(err, setActionError);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  // Xuất nguyên liệu đã chọn hoặc trang hiện tại thành CSV.
  function exportCSV() {
    const rows = [
      [
        "Mã",
        "Tên nguyên liệu",
        "Danh mục",
        "Đơn vị",
        "Gợi ý bảo quản",
        "Số công thức",
        "Mục trong kho",
        "Mục mua sắm",
      ],
      ...(data?.items || [])
        .filter((item) => !checked.length || checked.includes(item.id))
        .map((item) => [
          item.id,
          item.name,
          item.category,
          item.unit,
          item.storage,
          String(item.usage.recipes),
          String(item.usage.pantry),
          String(item.usage.shopping),
        ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map(
              (value) =>
                `"${(/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`,
            )
            .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "danh-muc-nguyen-lieu.csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  // Xóa bộ lọc và quay về trang đầu.
  function reset() {
    setQ("");
    setCategory("");
    setUnit("");
    setStorage("");
    setPage(1);
  }
  // Chuyển nhóm danh mục/đơn vị/bảo quản thành bộ lọc danh sách.
  function chooseGroup(value: string) {
    setPage(1);
    setQ("");
    setCategory(tab === "categories" ? value : "");
    setUnit(tab === "units" ? value : "");
    setStorage(
      tab === "storage" ? (value === "Chưa khai báo" ? "__empty" : value) : "",
    );
    setTab("main");
  }
  const stats = data?.stats;
  const groups =
    tab === "categories"
      ? data?.categories
      : tab === "units"
        ? data?.units
        : data?.storages;
  const actions = (item: CatalogIngredient) => (
    <div className="ingredient-actions">
      <button
        className="icon-button"
        disabled={busy}
        aria-label={`Xem ${item.name}`}
        title="Chi tiết"
        onClick={() => setPreview(item)}
      >
        <Eye size={15} />
      </button>
      <button
        className="icon-button"
        disabled={busy}
        aria-label={`Sửa ${item.name}`}
        title="Sửa nguyên liệu"
        onClick={() => edit(item)}
      >
        <Pencil size={15} />
      </button>
      <button
        className="icon-button delete"
        disabled={busy}
        aria-label={`Xóa ${item.name}`}
        title="Xóa nguyên liệu chưa được sử dụng"
        onClick={() => {
          setDeleting([item]);
          setActionError("");
        }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
  return (
    <div className="ingredients-page">
      <div className="ingredients-heading">
        <div>
          <h1>Quản lý Nguyên liệu</h1>
          <p>
            Danh mục nguyên liệu dùng chung. Gợi ý bảo quản độc lập với nơi
            người dùng chọn trong kho bếp.
          </p>
        </div>
        <div>
          <button
            className="community-export"
            disabled={loading || !data?.items.length || !!error}
            title="Xuất bài đã chọn hoặc trang hiện tại, mở được bằng Excel"
            onClick={exportCSV}
          >
            <Download size={15} />
            {checked.length ? `Xuất ${checked.length} mục` : "Xuất CSV"}
          </button>
          <button className="primary" disabled={busy} onClick={() => edit()}>
            <Plus size={17} />
            Thêm nguyên liệu mới
          </button>
        </div>
      </div>
      <section className="ingredients-stats" aria-label="Thống kê danh mục">
        <article>
          <span>
            Tổng nguyên liệu
            <Package size={22} />
          </span>
          <strong>{stats ? number(stats.total) : "—"}</strong>
          <small>Danh mục nguyên liệu gốc</small>
        </article>
        <article>
          <span>
            Danh mục phân loại
            <Layers size={22} />
          </span>
          <strong>{stats ? number(stats.categories) : "—"}</strong>
          <small>Thịt, hải sản, rau củ, gia vị…</small>
        </article>
        <article>
          <span>
            Đơn vị đo lường (UoM)
            <Ruler size={22} />
          </span>
          <strong>{stats ? number(stats.units) : "—"}</strong>
          <small>Đơn vị mặc định của nguyên liệu</small>
        </article>
        <article>
          <span>
            Có gợi ý bảo quản
            <Thermometer size={22} />
          </span>
          <strong>
            {stats
              ? `${stats.total ? Math.round((stats.storage / stats.total) * 100) : 0}%`
              : "—"}
          </strong>
          <small>
            {stats
              ? `${number(stats.storage)} / ${number(stats.total)} nguyên liệu`
              : "Theo dữ liệu hiện có"}
          </small>
        </article>
      </section>
      <div className="ingredient-tabs">
        <div>
          {(
            [
              {
                key: "main",
                label: "Nguyên liệu chính",
                icon: Package,
                count: stats?.total,
              },
              {
                key: "categories",
                label: "Danh mục phân loại",
                icon: Layers,
                count: stats?.categories,
              },
              {
                key: "units",
                label: "Đơn vị tính",
                icon: Ruler,
                count: stats?.units,
              },
              { key: "storage", label: "Gợi ý bảo quản", icon: Thermometer },
            ] as const
          ).map(({ key, label, icon: Icon, ...rest }) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              <Icon size={17} />
              {label}
              {"count" in rest && rest.count !== undefined && (
                <b>{rest.count}</b>
              )}
            </button>
          ))}
        </div>
        <div className="ingredient-view-switch">
          <span>Chế độ xem:</span>
          <button
            aria-label="Xem dạng bảng"
            aria-pressed={view === "table"}
            className={view === "table" ? "active" : ""}
            onClick={() => {
              setView("table");
              setTab("main");
            }}
          >
            <List size={17} />
          </button>
          <button
            aria-label="Xem dạng thẻ"
            aria-pressed={view === "grid"}
            className={view === "grid" ? "active" : ""}
            onClick={() => {
              setView("grid");
              setTab("main");
            }}
          >
            <Grid2X2 size={17} />
          </button>
        </div>
      </div>
      {notice && (
        <div className="community-action-notice" role="status">
          <Check size={16} />
          {notice}
          <button
            className="icon-button"
            aria-label="Đóng thông báo"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {tab === "main" && (
        <section className="panel ingredient-toolbar">
          <div>
            <label className="ingredient-search">
              <Search size={15} />
              <input
                maxLength={100}
                value={q}
                placeholder="Tìm theo tên hoặc mã nguyên liệu…"
                aria-label="Tìm nguyên liệu"
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <select
              aria-label="Lọc danh mục nguyên liệu"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả danh mục</option>
              {data?.categories.map((row) => (
                <option key={row.name} value={row.name}>
                  {row.name} ({row.count})
                </option>
              ))}
            </select>
            <select
              aria-label="Lọc đơn vị"
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả đơn vị</option>
              {data?.units.map((row) => (
                <option key={row.name} value={row.name}>
                  {row.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Lọc gợi ý bảo quản"
              value={storage}
              onChange={(e) => {
                setStorage(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả gợi ý bảo quản</option>
              <option value="__empty">Chưa khai báo</option>
              {data?.storages
                .filter((row) => row.name !== "Chưa khai báo")
                .map((row) => (
                  <option key={row.name} value={row.name}>
                    {row.name}
                  </option>
                ))}
            </select>
            <button className="text-button" onClick={reset}>
              Đặt lại
            </button>
            <button
              className="icon-button"
              disabled={loading}
              aria-label="Làm mới danh mục"
              onClick={() => setReload((value) => value + 1)}
            >
              <RefreshCw size={15} />
            </button>
          </div>
          <div className="ingredient-bulk">
            <span>
              Đã chọn: <b>{checked.length} mục</b>
            </span>
            <button
              disabled={busy || loading || !!error || !checked.length}
              onClick={() => {
                setBulk(true);
                setBulkCategory("");
                setBulkStorage("__keep");
                setActionError("");
              }}
            >
              <Pencil size={13} />
              Sửa hàng loạt
            </button>
            <button
              className="delete"
              disabled={busy || loading || !!error || !checked.length}
              onClick={() => {
                setDeleting(selected);
                setActionError("");
              }}
            >
              <Trash2 size={13} />
              Xóa
            </button>
          </div>
        </section>
      )}
      {error && (
        <div className="data-error" role="alert">
          {error}
          <button
            className="text-button"
            onClick={() => setReload((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      )}
      {loading ? (
        <section className="panel empty-state" role="status">
          Đang tải nguyên liệu…
        </section>
      ) : !error && tab !== "main" ? (
        <section className="panel ingredient-group-panel">
          <h2>
            {tab === "categories"
              ? "Danh mục phân loại"
              : tab === "units"
                ? "Đơn vị tính"
                : "Gợi ý bảo quản đã khai báo"}
          </h2>
          <p>Chọn một nhóm để xem các nguyên liệu tương ứng.</p>
          <div>
            {groups?.map((row) => (
              <button key={row.name} onClick={() => chooseGroup(row.name)}>
                <span>
                  {tab === "categories" ? (
                    <Layers size={19} />
                  ) : tab === "units" ? (
                    <Ruler size={19} />
                  ) : (
                    <Thermometer size={19} />
                  )}
                  <strong>{row.name}</strong>
                </span>
                <b>{number(row.count)}</b>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
          {!groups?.length && <p>Chưa có dữ liệu.</p>}
          {tab === "storage" && (
            <p className="ingredient-data-note">
              Gợi ý chung theo nguyên liệu. Nơi bảo quản thực tế do từng người
              dùng chọn được lưu riêng trong kho bếp. Thực phẩm đóng gói cần làm
              theo nhãn, nhất là sau khi mở; nguyên liệu khô và tươi có thể cần
              cách bảo quản khác nhau.
            </p>
          )}
        </section>
      ) : (
        !error && (
          <section className="panel ingredient-list">
            {view === "table" ? (
              <div className="table-scroll">
                <table className="ingredient-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          aria-label="Chọn tất cả nguyên liệu trên trang"
                          checked={
                            !!data?.items.length &&
                            data.items.every((item) =>
                              checked.includes(item.id),
                            )
                          }
                          disabled={!data?.items.length || busy}
                          onChange={(e) =>
                            setChecked(
                              e.target.checked
                                ? data?.items.map((item) => item.id) || []
                                : [],
                            )
                          }
                        />
                      </th>
                      <th>Nguyên liệu</th>
                      <th>Danh mục phân loại</th>
                      <th>Đơn vị tính</th>
                      <th title="Gợi ý chung, độc lập với nơi bảo quản thực tế trong kho của từng người dùng">
                        Gợi ý bảo quản
                      </th>
                      <th>Đang sử dụng</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Chọn ${item.name}`}
                            checked={checked.includes(item.id)}
                            disabled={busy}
                            onChange={(e) =>
                              setChecked((current) =>
                                e.target.checked
                                  ? [...current, item.id]
                                  : current.filter((id) => id !== item.id),
                              )
                            }
                          />
                        </td>
                        <td>
                          <button
                            className="ingredient-name"
                            onClick={() => setPreview(item)}
                          >
                            <IngredientImage
                              key={item.id + item.image}
                              image={item.image}
                              name=""
                            />
                            <span>
                              <strong>{item.name}</strong>
                              <small>NL-{item.id}</small>
                            </span>
                          </button>
                        </td>
                        <td>
                          <span className="ingredient-category">
                            {item.category}
                          </span>
                        </td>
                        <td>
                          <strong className="ingredient-unit">
                            {item.unit}
                          </strong>
                        </td>
                        <td>
                          {item.storage ? (
                            <span className="ingredient-storage">
                              <i />
                              {item.storage}
                            </span>
                          ) : (
                            <span className="ingredient-unset">
                              Chưa khai báo
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="ingredient-usage">
                            <button className="ingredient-recipe-link" aria-label={`Xem ${item.usage.recipes} công thức dùng ${item.name}`} onClick={()=>setRecipeSource(item)}>{item.usage.recipes} công thức</button>

                          </div>
                        </td>
                        <td>{actions(item)}</td>
                      </tr>
                    ))}
                    {!data?.items.length && (
                      <tr>
                        <td colSpan={7} className="empty-state">
                          <Boxes size={26} />
                          <p>Không tìm thấy nguyên liệu phù hợp.</p>
                          <button className="text-button" onClick={reset}>
                            Xoá bộ lọc
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="ingredient-card-grid">
                {data?.items.map((item) => (
                  <article key={item.id}>
                    <div>
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${item.name}`}
                        checked={checked.includes(item.id)}
                        disabled={busy}
                        onChange={(e) =>
                          setChecked((current) =>
                            e.target.checked
                              ? [...current, item.id]
                              : current.filter((id) => id !== item.id),
                          )
                        }
                      />
                      <span className="ingredient-category">
                        {item.category}
                      </span>
                    </div>
                    <IngredientImage
                      key={item.id + item.image}
                      image={item.image}
                      name=""
                    />
                    <h3>{item.name}</h3>
                    <p>
                      NL-{item.id} · Đơn vị: <strong>{item.unit}</strong>
                    </p>
                    <p>{item.storage || "Chưa có gợi ý bảo quản"}</p>
                    <small>
                      <button className="ingredient-recipe-link" onClick={()=>setRecipeSource(item)}>{item.usage.recipes} công thức</button> · {item.usage.pantry} mục
                      trong kho
                    </small>
                    {actions(item)}
                  </article>
                ))}
                {!data?.items.length && (
                  <p className="empty-state">Không có nguyên liệu phù hợp.</p>
                )}
              </div>
            )}
            <div className="ingredient-pagination">
              <span>
                Hiển thị {data?.total ? (page - 1) * pageSize + 1 : 0}–
                {Math.min(page * pageSize, data?.total || 0)} của{" "}
                <strong>{number(data?.total || 0)}</strong> nguyên liệu
              </span>
              <label>
                Dòng mỗi trang
                <select
                  aria-label="Số dòng mỗi trang"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <div>
                <button
                  aria-label="Trang trước"
                  disabled={page === 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  <ChevronLeft size={15} />
                </button>
                <span>
                  {page} / {pages}
                </span>
                <button
                  aria-label="Trang sau"
                  disabled={page >= pages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </section>
        )
      )}
      {recipeSource && <IngredientRecipes token={token} ingredient={recipeSource} onClose={()=>setRecipeSource(null)} onUnauthorized={onUnauthorized}/>}
      {editor && (
        <Modal
          title={
            editor === "new" ? "Thêm nguyên liệu mới" : `Sửa ${editor.name}`
          }
          onClose={() => {
            if (!busy) setEditor(null);
          }}
        >
          {formError && (
            <div className="data-error" role="alert">
              {formError}
            </div>
          )}
          <form
            className="community-create"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <label>
              Tên nguyên liệu
              <input
                required
                maxLength={100}
                disabled={busy}
                value={form.name}
                onChange={(e) =>
                  setForm((current) => ({ ...current, name: e.target.value }))
                }
              />
            </label>
            <div className="ingredient-form-row">
              <label>
                Danh mục
                <select
                  required
                  value={form.category}
                  disabled={busy}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      category: e.target.value,
                    }))
                  }
                >
                  {categories.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Đơn vị mặc định
                <select
                  required
                  value={form.unit}
                  disabled={busy}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, unit: e.target.value }))
                  }
                >
                  {units.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <small className="ingredient-form-note">
              Đổi đơn vị mặc định không tự quy đổi số lượng hoặc đơn vị đã lưu
              trong kho và công thức.
            </small>
            <label>
              Gợi ý bảo quản
              <select
                value={form.storage}
                disabled={busy}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    storage: e.target.value,
                  }))
                }
              >
                <option value="">Chưa khai báo</option>
                {storages.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ảnh nguyên liệu
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => {
                  const value = e.target.files?.[0] || null;
                  if (value && value.size > 5 * 1024 * 1024) {
                    setFormError("Ảnh tối đa 5 MB.");
                    e.target.value = "";
                    return;
                  }
                  setFile(value);
                  setFormError("");
                }}
              />
              <small className="ingredient-form-note">
                JPEG/PNG/WebP, tối đa 5 MB. {file ? `Đã chọn ${file.name}` : ""}
              </small>
            </label>
            <label>
              Hoặc đường dẫn ảnh
              <input
                maxLength={500}
                value={form.image}
                disabled={busy || !!file}
                placeholder="https://… hoặc /uploads/ingredients/…"
                onChange={(e) =>
                  setForm((current) => ({ ...current, image: e.target.value }))
                }
              />
            </label>
            <button className="primary" disabled={busy || !form.name.trim()}>
              {file ? <Upload size={15} /> : <Check size={15} />}{" "}
              {busy ? "Đang lưu…" : "Lưu nguyên liệu"}
            </button>
          </form>
        </Modal>
      )}
      {preview && (
        <Modal title={preview.name} onClose={() => setPreview(null)}>
          <div className="ingredient-preview">
            <IngredientImage
              key={preview.id + preview.image}
              image={preview.image}
              name={preview.name}
            />
          </div>
          <div className="detail-meta">
            <span>
              Mã<strong>NL-{preview.id}</strong>
            </span>
            <span>
              Danh mục<strong>{preview.category}</strong>
            </span>
            <span>
              Đơn vị<strong>{preview.unit}</strong>
            </span>
          </div>
          <p>Gợi ý bảo quản: {preview.storage || "Chưa khai báo"}</p>
          <p>
            {preview.usage.recipes} công thức
          </p>mục trong kho 
          <p>Ngày tạo: {formatDate(preview.createdAt)}</p>
          <p>
            Chưa có dữ liệu dinh dưỡng hoặc hạn dùng theo nhiệt độ cho nguyên
            liệu này.
          </p>
          <button
            className="primary"
            onClick={() => {
              setPreview(null);
              edit(preview);
            }}
          >
            <Pencil size={15} />
            Sửa thông tin
          </button>
        </Modal>
      )}
      {deleting && (
        <Modal
          title={`Xóa ${deleting.length} nguyên liệu?`}
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p>{deleting.map((item) => item.name).join(", ")}</p>
          <p>
            Chỉ xóa nguyên liệu chưa được dùng trong công thức, kho hoặc danh
            sách mua sắm. Nếu có mục đang được sử dụng, toàn bộ thao tác sẽ bị
            hủy.
          </p>
          {actionError && (
            <div className="data-error" role="alert">
              {actionError}
            </div>
          )}
          <div className="review-buttons">
            <button
              className="community-export"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Hủy
            </button>
            <button
              className="reject-button"
              disabled={busy}
              onClick={() => void remove()}
            >
              <Trash2 size={16} />
              {busy ? "Đang xóa…" : "Xác nhận xóa"}
            </button>
          </div>
        </Modal>
      )}
      {bulk && (
        <Modal
          title={`Sửa ${selected.length} nguyên liệu đã chọn`}
          onClose={() => {
            if (!busy) setBulk(false);
          }}
        >
          <p>Chỉ áp dụng những trường bạn chọn thay đổi.</p>
          {actionError && (
            <div className="data-error" role="alert">
              {actionError}
            </div>
          )}
          <form
            className="community-create"
            onSubmit={(e) => {
              e.preventDefault();
              void saveBulk();
            }}
          >
            <label>
              Danh mục
              <select
                disabled={busy}
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
              >
                <option value="">Giữ nguyên</option>
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Gợi ý bảo quản
              <select
                disabled={busy}
                value={bulkStorage}
                onChange={(e) => setBulkStorage(e.target.value)}
              >
                <option value="__keep">Giữ nguyên</option>
                <option value="">Xóa gợi ý bảo quản</option>
                {storages.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="primary"
              disabled={busy || (!bulkCategory && bulkStorage === "__keep")}
            >
              <Check size={15} />
              {busy ? "Đang cập nhật…" : "Lưu thay đổi"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
