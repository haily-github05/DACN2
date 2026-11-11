// Hộp thoại liệt kê công thức sử dụng nguyên liệu được chọn.
// Mở từng món để xem nguyên liệu, định lượng và hướng dẫn nấu.
import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { ApiError, apiRequest, imageUrl } from "../lib/adminApi";
import type { CatalogIngredient } from "../lib/adminApi";
type Recipe = {
  id: string;
  name: string;
  description: string;
  image: string;
  active: boolean;
  minutes: number;
  servings: number;
  ingredients: { name: string; quantity: number; unit: string }[];
  steps: { number: number; instruction: string }[];
};
export default function IngredientRecipes({
  token,
  ingredient,
  onClose,
  onUnauthorized,
}: {
  token: string;
  ingredient: CatalogIngredient;
  onClose: () => void;
  onUnauthorized: (message: string) => void;
}) {
  const [items, setItems] = useState<Recipe[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setItems([]);
    apiRequest<{ items: Recipe[] }>(
      `/api/admin/ingredients/${ingredient.id}/recipes`,
      token,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setItems(data.items);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && [401, 403].includes(err.status))
          unauthorized.current(err.message);
        else
          setError(
            err instanceof Error ? err.message : "Không tải được công thức.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [ingredient.id, token, reload]);
  return (
    <Modal title={`Công thức dùng ${ingredient.name}`} onClose={onClose}>
      {loading ? (
        <p role="status">Đang tải công thức…</p>
      ) : error ? (
        <div className="data-error" role="alert">
          {error}
          <button
            className="text-button"
            onClick={() => setReload((n) => n + 1)}
          >
            Thử lại
          </button>
        </div>
      ) : (
        <div className="ingredient-recipes">
          {!items.length ? (
            <p>Chưa có công thức sử dụng nguyên liệu này.</p>
          ) : (
            items.map((recipe) => (
              <details key={recipe.id}>
                <summary>
                  {recipe.image && (
                    <img
                      className="ingredient-thumb"
                      src={imageUrl(recipe.image)}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  )}
                  <span>
                    <strong>{recipe.name}</strong>
                    <small>
                      {recipe.minutes} phút · {recipe.servings} khẩu phần ·{" "}
                      {recipe.active ? "Hoạt động" : "Ngừng hoạt động"}
                    </small>
                  </span>
                </summary>
                <p>{recipe.description}</p>
                <h3>Nguyên liệu</h3>
                <ul>
                  {recipe.ingredients.map((item, index) => (
                    <li key={index}>
                      {item.name}: {item.quantity} {item.unit}
                    </li>
                  ))}
                </ul>
                <h3>Cách làm</h3>
                {recipe.steps.length ? (
                  recipe.steps.map((step) => (
                    <p className="ingredient-recipe-step" key={step.number}>
                      <strong>Bước {step.number}</strong>
                      <br />
                      {step.instruction}
                    </p>
                  ))
                ) : (
                  <p>Chưa có hướng dẫn.</p>
                )}
              </details>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}
