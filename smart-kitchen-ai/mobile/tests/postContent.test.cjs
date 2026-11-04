// Kiểm tra: Giữ đủ nội dung công thức và tách đúng hashtag từ bài đăng.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../lib/postContent.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const api={};new Function('exports',code)(api);
test('recipe details retain all steps including paragraphs',()=>{
 const value=api.parsePostContent('Món ngon\n\nTHÔNG TIN MÓN\n20 phút · 2 người\n\nNGUYÊN LIỆU\n• Trứng — 2 quả\n\nCÁCH LÀM\n1. Sơ chế\nRửa rau\n\n2. Nấu\nChiên trứng\n\n#BếpNhà #MónNgon');
 assert.equal(value.intro,'Món ngon');
 assert.equal(value.sections.length,3);
 assert.match(value.sections[2].body,/2\. Nấu\nChiên trứng/);
 assert.deepEqual(value.tags,['#BếpNhà','#MónNgon']);
});
test('plain posts and inline hashtags retain their original text',()=>{
 const value=api.parsePostContent('Mẹo #nấuăn\n\nMột đoạn chia sẻ.');
 assert.equal(value.intro,'Mẹo #nấuăn\n\nMột đoạn chia sẻ.');
 assert.equal(value.sections.length,0);
});
