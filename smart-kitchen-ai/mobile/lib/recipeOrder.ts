// Chức năng: Sắp xếp danh sách món A–Z theo tiếng Việt, giữ nguyên dữ liệu đầu vào.
const vietnameseNames = new Intl.Collator('vi', { numeric: true });
export function sortRecipesByName<T>(items: readonly T[], name: (item: T) => string): T[] {
  return [...items].sort((a, b) => vietnameseNames.compare(name(a).trim(), name(b).trim()));
}
