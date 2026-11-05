const assert = require("node:assert/strict");
const express = require("express");
const db = require("../src/config/db");
const app = express();
app.use(express.json());
app.use("/api/kitchen", require("../src/routes/kitchenRoutes"));
let server;
(async () => {
  const [users] = await db.query("SELECT user_id FROM users ORDER BY user_id LIMIT 1");
  assert.ok(users.length, "Cần ít nhất một tài khoản để kiểm tra API");
  server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api/kitchen`;
  for (const endpoint of ["public-recipes", "public-ingredients", "public-posts"]) {
    const response = await fetch(`${base}/${endpoint}`);
    const body = await response.json();
    assert.equal(response.status,200,body.message);
    assert.ok(Array.isArray(body.data));
    if (endpoint === "public-recipes") assert.ok(body.data.every(r => r.match === 0 && r.ingredients.every(i => !i.available)));
    else if(endpoint === "public-ingredients") assert.ok(body.data.every(i => !i.inPantry));
    else assert.ok(body.data.every(p => p.visibility === "PUBLIC" && !p.isOwner && !p.liked && !p.saved));
    console.log(`PASS GUEST GET ${endpoint}`);
  }
  const user = users[0].user_id;
  const headers = { Authorization: `Bearer ${require("../src/services/sessionService").createToken(user)}` };
  for (const endpoint of ["recipes", "shopping", "plans", "posts", "favorites", "activity", "notifications", "ingredients"]) {
    const response = await fetch(`${base}/${user}/${endpoint}`, { headers });
    const body = await response.json();
    assert.equal(response.status, 200, `${endpoint}: ${body.message}`);
    assert.equal(body.success, true);
    assert.ok(body.data && typeof body.data === "object");
    console.log(`PASS GET ${endpoint}`);
  }
  for (const [path, method, data] of [
    [`0/recipes`, "GET"],
    [`${user}/pantry`, "POST", {quantity:-1}],
    [`${user}/shopping`, "POST", {quantity:"không hợp lệ"}],
    [`${user}/plans`, "PUT", {"2026-02-30":{breakfast:null}}],
    [`${user}/posts`, "POST", {title:""}],
    [`${user}/favorites/1`, "PUT", {saved:"yes"}],
  ]) {
    const response = await fetch(`${base}/${path}`, {method,headers:{"Content-Type":"application/json",...headers},...(data ? {body:JSON.stringify(data)} : {})});
    assert.equal(response.status, 400, path);
    console.log(`PASS validation ${path.split("/").slice(1).join("/")}`);
  }
})().catch(error => {console.error(error);process.exitCode=1;}).finally(async()=>{if(server) await new Promise(resolve=>server.close(resolve));await db.end();});
