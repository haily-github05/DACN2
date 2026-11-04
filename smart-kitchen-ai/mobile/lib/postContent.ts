// Chức năng: Tách nội dung bài chia sẻ thành các mục, giữ nguyên toàn bộ phần chữ.
const headings = ['THÔNG TIN MÓN', 'DINH DƯỠNG ƯỚC TÍNH / KHẨU PHẦN', 'NGUYÊN LIỆU', 'CÁCH LÀM', 'MẸO NHỎ'];
export function parsePostContent(description: string) {
  const tags: string[] = [];
  const text = description.split('\n').filter(line => {
    if (/^\s*(#[^\s#]+\s*)+$/u.test(line)) {
      tags.push(...(line.match(/#[^\s#]+/gu) || [])); return false;
    }
    return true;
  }).join('\n');
  const sections: { title: string; body: string }[] = [];
  let current = { title: '', body: '' };
  for (const line of text.split('\n')) {
    if (headings.includes(line.trim())) {
      if (current.body.trim()) sections.push({ ...current, body: current.body.trim() });
      current = { title: line.trim(), body: '' };
    } else current.body += `${line}\n`;
  }
  if (current.body.trim()) sections.push({ ...current, body: current.body.trim() });
  return { intro: sections.filter(s => !s.title).map(s => s.body).join('\n\n'), sections: sections.filter(s => s.title), tags: [...new Set(tags)] };
}
