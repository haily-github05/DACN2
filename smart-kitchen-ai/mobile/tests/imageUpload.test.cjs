// Kiểm tra: upload ảnh gửi File/Blob thật thay vì object URI không tương thích Expo 58.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../lib/imageUpload.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function setup(platform, ok = true) {
  const calls = [];
  class NativeFile { constructor(uri) { this.uri = uri; this.name = 'photo.png'; } async bytes() { return new Uint8Array([1]); } }
  class Form { append(key, value, name) { assert(value instanceof Blob || typeof value.bytes === 'function'); this.part = { key, value, name }; } }
  const fetch = async (url, options) => { calls.push({ url, options }); return options ? { ok, json: async () => ok ? { data: { url: '/uploads/pantry/photo.png' } } : { message: 'Ảnh không hợp lệ' } } : { blob: async () => new Blob(['image']) }; };
  const deps = { 'react-native': { Platform: { OS: platform } }, 'expo-file-system': { File: NativeFile }, 'expo/fetch': { fetch }, './api': { getApiBaseUrl: () => 'http://backend' }, './auth': { getAuthUser: async () => ({ token: 'token' }), getCurrentUserId: async () => 7 } };
  const exports = {};
  new Function('require', 'exports', 'FormData', code)(name => deps[name], exports, Form);
  return { upload: exports.uploadImage, calls, NativeFile };
}
test('native uploads an Expo File with original filename and bearer token', async () => {
  const { upload, calls, NativeFile } = setup('ios');
  assert.equal(await upload('file:///photo.png', 'pantry'), '/uploads/pantry/photo.png');
  assert.equal(calls[0].url, 'http://backend/api/kitchen/7/pantry/image');
  assert(calls[0].options.body.part.value instanceof NativeFile);
  assert.equal(calls[0].options.body.part.name, 'photo.png');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token');
});
test('web uploads Blob and supports the posts endpoint', async () => {
  const { upload, calls } = setup('web');
  await upload('blob:preview', 'posts');
  assert(calls[1].options.body.part.value instanceof Blob);
  assert.equal(calls[1].url, 'http://backend/api/kitchen/7/posts/image');
});
test('backend upload rejection is shown instead of saving without the image', async () => {
  const { upload } = setup('ios', false);
  await assert.rejects(upload('file:///photo.png', 'pantry'), /Ảnh không hợp lệ/);
});
