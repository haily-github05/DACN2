// Kiểm tra thực tế: cùng đợt cộng số lượng, khác hạn dùng tách dòng; luôn rollback.
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const router = require('../src/routes/kitchenRoutes');
(async () => {
  const conn = await db.getConnection();
  try {
    const [[user]] = await conn.query('SELECT user_id FROM users ORDER BY user_id LIMIT 1');
    assert(user);
    await conn.beginTransaction();
    db.getConnection = async () => ({ query: conn.query.bind(conn), beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {} });
    const handler = router.stack.find(l => l.route?.path === '/:userId/pantry' && l.route.methods.post).route.stack[0].handle;
    const body = { name: `TEST-MERGE-${require('node:crypto').randomUUID()}`, category: 'Rau củ', quantity: 2, unit: 'củ', location: 'Bên ngoài', purchaseDate: '2026-11-05', expiryDate: '2026-11-12', note: '', mergeExisting: true };
    const save = async data => {
      let result, failure;
      await handler({ userId: user.user_id, body: data }, { json: value => { result = value.data; } }, error => { failure = error; });
      if (failure) throw failure;
      return result;
    };
    const first = await save(body);
    const second = await save({ ...body, quantity: 3 });
    assert.equal(second.id, first.id);
    assert.equal(second.merged, true);
    const [[row]] = await conn.query('SELECT quantity FROM pantry_items WHERE pantry_item_id=?', [first.id]);
    assert.equal(Number(row.quantity), 5);
    const different = await save({ ...body, expiryDate: '2026-11-13' });
    assert.notEqual(different.id, first.id);
    console.log('PASS MySQL: 2 + 3 = 5, khác hạn dùng tách dòng (rollback)');
  } finally {
    await conn.rollback();
    conn.release();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.end());
