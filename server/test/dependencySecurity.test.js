import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import axios from "axios";
import { sanitizeArticleHtml } from "../src/services/articleHtml.js";

async function serve(t, app) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  return `http://127.0.0.1:${server.address().port}`;
}

test("Express does not trust every IPv4 client through a mapped IPv6 subnet", async t => {
  // Regresión de GHSA-jqcg-44mw-7w3h: la subred no debe incluir al cliente local.
  const app = express();
  app.set("trust proxy", "::ffff:10.0.0.0/8");
  app.get("/", (req, res) => res.json({ ip: req.ip }));
  const origin = await serve(t, app);
  const response = await fetch(origin, { headers: { "X-Forwarded-For": "203.0.113.10" } });
  assert.equal((await response.json()).ip, "127.0.0.1");
});

test("Axios keeps JSON requests and bounded redirects working after the update", async t => {
  const app = express();
  app.use(express.json());
  app.post("/echo", (req, res) => res.json({ received: req.body }));
  app.get("/redirect", (_req, res) => res.redirect("/result"));
  app.get("/result", (_req, res) => res.json({ ok: true }));
  const origin = await serve(t, app);
  const config = { proxy: false, timeout: 2000 };
  const posted = await axios.post(`${origin}/echo`, { article: "prueba" }, config);
  assert.deepEqual(posted.data, { received: { article: "prueba" } });
  const redirected = await axios.get(`${origin}/redirect`, { ...config, maxRedirects: 1 });
  assert.deepEqual(redirected.data, { ok: true });
  await assert.rejects(axios.get(`${origin}/redirect`, { ...config, maxRedirects: 0 }), error => error.response?.status === 302);
});

test("article sanitization still rejects SVG animation URL lists", () => {
  const input = `<article><p>Texto seguro</p><svg><a><animate attributeName="href" values="#safe;javascript:alert(1)" dur=".01s" fill="freeze"></animate><text>Enlace</text></a></svg></article>`;
  const clean = sanitizeArticleHtml(input);
  assert.match(clean, /Texto seguro/);
  assert.doesNotMatch(clean, /<svg|<animate|javascript:|attributeName|values=/i);
});
