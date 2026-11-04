const test = require("node:test");
const assert = require("node:assert/strict");
const dbPath = require.resolve("../src/config/db");
const calls = [];
require.cache[dbPath] = { id:dbPath, filename:dbPath, loaded:true, exports:{ query:async (sql, values) => {
  calls.push({sql,values});
  if (sql.includes("AS cooked")) return [[{cooked:"2",saved:"3",shared:"1"}]];
  return [[{days_ago:0},{days_ago:1},{days_ago:3}]];
} } };
const { getProfileStats, cookingStreak } = require("../src/services/profileStatsService");
test("profile counts use the signed-in user's ID for each source", async()=>{
  const result = await getProfileStats(7);
  assert.deepEqual(result,{cooked:2,saved:3,shared:1,streak:2});
  assert.deepEqual(calls[0].values,[7,7,7,7,7]);
  assert.deepEqual(calls[1].values,[7]);
  assert.match(calls[0].sql,/COUNT\(DISTINCT recipe_id\)/);
});
test("cooking streak handles repeated days, gaps, and inactive users",()=>{
  assert.equal(cookingStreak([]),0);
  assert.equal(cookingStreak([0,0,1,2,4]),3);
  assert.equal(cookingStreak([1,2,3]),3);
  assert.equal(cookingStreak([2,3]),0);
  assert.equal(cookingStreak([-1,0,1]),2);
});
