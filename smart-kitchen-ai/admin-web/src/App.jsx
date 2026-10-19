
import React, { useMemo, useState } from "react";
import { pages } from "./data";

const labels = [
  "Tổng quan",
  "Người dùng",
  "Nguyên liệu",
  "Món ăn",
  "Công thức",
  "Bài đăng cộng đồng",
  "Báo cáo & kiểm duyệt",
  "Thống kê",
  "Quản lý nội dung",
];

export default function App() {
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState({});
  const [modal, setModal] = useState(false);
  const [draft, setDraft] = useState(["", "", ""]);
  const [editingIndex, setEditingIndex] = useState(null);

  const [title, sub, stats, seed] = pages[tab];

  const list = rows[tab] ?? seed;

  const shown = useMemo(() => {
    return list
      .map((row, index) => ({ row, index }))
      .filter(({ row }) =>
        row
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      );
  }, [list, query]);

  // Chuyển trang
  const changeTab = (index) => {
    setTab(index);
    setQuery("");
    setModal(false);
    setEditingIndex(null);
  };

  // Mở form thêm mới
  const openAdd = () => {
    setDraft(["", "", ""]);
    setEditingIndex(null);
    setModal(true);
  };

  // Mở form chỉnh sửa
  const openEdit = (row, index) => {
    setDraft([...row]);
    setEditingIndex(index);
    setModal(true);
  };

  // Đóng form
  const closeModal = () => {
    setModal(false);
    setDraft(["", "", ""]);
    setEditingIndex(null);
  };

  // Lưu dữ liệu
  const save = () => {
    if (!draft[0].trim() || !draft[1].trim()) {
      alert("Vui lòng nhập mã và tên!");
      return;
    }

    setRows((prev) => {
      let updatedList = [...list];

      if (editingIndex !== null) {
        // Cập nhật bản ghi hiện tại
        updatedList[editingIndex] = [...draft];
      } else {
        // Thêm bản ghi mới
        updatedList.push([...draft]);
      }

      return {
        ...prev,
        [tab]: updatedList,
      };
    });

    closeModal();
  };

  // Xóa dữ liệu
  const removeRow = (index) => {
    if (!window.confirm("Bạn có chắc muốn xóa bản ghi này?")) {
      return;
    }

    setRows((prev) => ({
      ...prev,
      [tab]: list.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="shell">
      {/* SIDEBAR */}
      <aside>
        <div className="logo">
          ✦ Smart Kitchen AI
        </div>

        <div className="tag">
          ADMIN DASHBOARD
        </div>

        {labels.map((label, i) => (
          <button
            key={i}
            className={i === tab ? "selected" : ""}
            onClick={() => changeTab(i)}
          >
            {label}
          </button>
        ))}

        <small>
          Prototype · Dữ liệu chỉ lưu tạm
        </small>
      </aside>

      {/* MAIN CONTENT */}
      <main>
        {/* HEADER */}
        <header>
          <div>
            <h1>{title}</h1>
            <p>{sub}</p>
          </div>

          <span>
            Quản trị viên ◉
          </span>
        </header>

        {/* THỐNG KÊ */}
        <section className="stats">
          {stats.map((item, i) => {
            const [label, value] = item.split("|");

            return (
              <article key={i}>
                <p>{label}</p>
                <strong>{value}</strong>
              </article>
            );
          })}
        </section>

        {/* DANH SÁCH DỮ LIỆU */}
        <section className="panel">
          <div className="panelHead">
            <h2>
              {tab === 0
                ? "Hoạt động gần đây"
                : tab === 7
                ? "Danh sách thống kê"
                : "Danh sách " + labels[tab].toLowerCase()}
            </h2>

            <div className="actions">
              <input
                type="text"
                placeholder="Tìm theo tên, mã hoặc nội dung..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <button onClick={openAdd}>
                + Thêm / Tạo mới
              </button>
            </div>
          </div>

          {/* TABLE */}
          <table>
            <thead>
              <tr>
                <th>Mã / Hạng mục</th>
                <th>Tên / Thông tin</th>
                <th>Phân loại / Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    Không tìm thấy dữ liệu phù hợp.
                  </td>
                </tr>
              ) : (
                shown.map(({ row, index }) => (
                  <tr key={index}>
                    {row.map((value, j) => (
                      <td key={j}>
                        {value}
                      </td>
                    ))}

                    <td>
                      <button
                        className="light"
                        onClick={() => openEdit(row, index)}
                      >
                        Sửa
                      </button>

                      <button
                        className="danger"
                        onClick={() => removeRow(index)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>

      {/* MODAL THÊM / SỬA */}
      {modal && (
        <div className="overlay">
          <div className="dialog">
            <h2>
              {editingIndex !== null
                ? "Chỉnh sửa thông tin"
                : "Thêm bản ghi mới"}
            </h2>

            {draft.map((value, i) => (
              <label key={i}>
                {
                  [
                    "Mã / Hạng mục",
                    "Tên / Nội dung",
                    "Phân loại / Trạng thái",
                  ][i]
                }

                <input
                  type="text"
                  value={value}
                  onChange={(e) => {
                    setDraft((prev) =>
                      prev.map((item, j) =>
                        i === j
                          ? e.target.value
                          : item
                      )
                    );
                  }}
                />
              </label>
            ))}

            <div className="actions">
              <button
                className="light"
                onClick={closeModal}
              >
                Hủy
              </button>

              <button onClick={save}>
                {editingIndex !== null
                  ? "Lưu thay đổi"
                  : "Thêm bản ghi"}
              </button>
            </div>

            <p>
              Thao tác này chỉ cập nhật giao diện hiện tại,
              chưa ghi dữ liệu vào database.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
