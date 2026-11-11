// Chức năng: Chuẩn hóa ngày và tạo lưới lịch theo tháng, không lệch múi giờ.
export function isoDay(year: number, month: number, day: number) {
  return (
    String(year).padStart(4, "0") +
    "-" +
    String(month + 1).padStart(2, "0") +
    "-" +
    String(day).padStart(2, "0")
  );
}
export function parseCalendarDate(value?: string) {
  if (!value) return null;
  let text = value.trim();
  const local = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (local)
    text =
      local[3] +
      "-" +
      local[2].padStart(2, "0") +
      "-" +
      local[1].padStart(2, "0");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [year, month, day] = text.split("-").map(Number);
  if (year < 100 || year > 9999) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return { year, month: month - 1, day, iso: text };
}
export function calendarCells(year: number, month: number) {
  const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let day = 1; day <= length; day++) cells.push(isoDay(year, month, day));
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function isSelectableDate(value: string, min?: string, max?: string) {
  const lower = parseCalendarDate(min)?.iso,
    upper = parseCalendarDate(max)?.iso;
  return (!lower || value >= lower) && (!upper || value <= upper);
}
