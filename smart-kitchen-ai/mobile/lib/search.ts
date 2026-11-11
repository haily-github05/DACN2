// Chức năng: Tìm kiếm tiếng Việt có/không dấu, không phân biệt hoa thường và nhiều từ khóa.
export function normalizeSearch(value: string | null | undefined): string {
  return (value || "")
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export function matchesSearch(
  query: string,
  ...fields: (string | null | undefined)[]
): boolean {
  const terms = normalizeSearch(query).split(" ").filter(Boolean);
  if (!terms.length) return true;
  const text = normalizeSearch(fields.filter(Boolean).join(" "));
  return terms.every((term) => text.includes(term));
}
