// Kiểm tra: Lịch chọn ngày, năm nhuận và giới hạn ngày mua/hạn dùng.
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ts=require("typescript");
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,"../lib/calendar.ts"),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const api={};new Function("exports",code)(api);
test("calendar includes leap day only in leap years",()=>{
 assert.equal(api.calendarCells(2024,1).filter(Boolean).length,29);
 assert.equal(api.calendarCells(2025,1).filter(Boolean).length,28);
});
test("weeks start on Monday and keep empty leading cells",()=>{
 const cells=api.calendarCells(2026,2);
 assert.equal(cells[6],"2026-03-01");
 assert.equal(cells.length%7,0);
});
test("both supported input formats produce the same date",()=>{
 assert.equal(api.parseCalendarDate("5/11/2026").iso,"2026-11-05");
 assert.equal(api.parseCalendarDate("2026-11-05").iso,"2026-11-05");
});
test("invalid calendar dates cannot be parsed",()=>{
 assert.equal(api.parseCalendarDate("2025-02-29"),null);
 assert.equal(api.parseCalendarDate("31/04/2026"),null);
 assert.equal(api.parseCalendarDate(""),null);
});
test("expiry cannot precede purchase; boundary dates remain selectable",()=>{
 assert.equal(api.isSelectableDate("2026-11-04","05/11/2026"),false);
 assert.equal(api.isSelectableDate("2026-11-05","2026-11-05"),true);
 assert.equal(api.isSelectableDate("2026-11-07",undefined,"2026-11-06"),false);
});
