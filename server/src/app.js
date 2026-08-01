import dotenv from "dotenv";
import { fileURLToPath } from "url";
// Ruta explícita: bajo Passenger/serverless el cwd no es server/. En Vercel no
// existe el fichero y las variables llegan por el entorno de la plataforma.
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { nanoid } from "nanoid";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import { all, one, query, tx } from "./db.js";
import { nowIso, slugify, safeJsonParse } from "./utils.js";
import { scrapeAmazonProduct, normalizeAsin, parseAmazonUrl } from "./scrape/amazon.js";
import { generateArticleHtml } from "./services/articleGenerator.js";
import { resolveLlmConfig } from "./services/llmClient.js";
import { getRelatedProducts } from "./services/relatedProducts.js";
import { createAuthMiddleware } from "./auth.js";
import { resolveAffiliateUrl, validateAffiliateUrl } from "./services/affiliate.js";
import { hasAffiliateLinkForAsin, prepareGeneratedArticleHtml, sanitizeArticleHtml } from "./services/articleHtml.js";
import { DEFAULT_DESCRIPTION, SITE_NAME, escapeHtml, renderShell, siteOrigin } from "./services/seoMeta.js";

// En producción sin JWT_SECRET no hay fallback: el login/verify fallará con 500,
// pero la app arranca y /api/health permite diagnosticar qué variable falta.
const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in production: auth routes will fail until it is set");
}
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? null : "dev-secret-123");

export const app = express();
const llmConfig = resolveLlmConfig();
const { authenticate, optionalAuthenticate } = createAuthMiddleware(JWT_SECRET);
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const importLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const generationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const newsletterLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const metricsLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// Express 4 no propaga errores de handlers async; este wrapper los manda al middleware de error.
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Publicación perezosa: sin proceso permanente (serverless) no hay setInterval,
// así que los artículos programados se reconcilian al recibir tráfico, como mucho
// una vez por minuto por instancia.
let lastReconcile = 0;
app.use("/api", (req, _res, next) => {
  const now = Date.now();
  if (now - lastReconcile > 60_000) {
    lastReconcile = now;
    reconcileScheduledArticles().catch((error) => console.warn("[scheduler]", error?.message || error));
  }
  next();
});

app.get("/api/health", ah(async (_req, res) => {
  res.json({
    ok: true,
    time: nowIso(),
    env: {
      jwtSecret: Boolean(process.env.JWT_SECRET),
      databaseUrl: Boolean(process.env.DATABASE_URL),
      amazonStoreId: Boolean(process.env.AMAZON_STORE_ID),
      nodeEnv: process.env.NODE_ENV || "(sin definir)",
    },
  });
}));

// Un artículo en "Sofás" pertenece también a "Salón", "Muebles" y "Hogar y cocina":
// se expanden los ancestros para que aparezca navegando por cualquier nivel del árbol.
async function withAncestorCategories(categoryIds) {
  const ids = new Set((categoryIds || []).filter(Boolean));
  if (!ids.size) return [];
  const parentById = new Map((await all("SELECT id, parent_id FROM categories")).map((row) => [row.id, row.parent_id]));
  for (const id of [...ids]) {
    const visited = new Set([id]);
    let parent = parentById.get(id);
    while (parent && !visited.has(parent)) {
      ids.add(parent);
      visited.add(parent);
      parent = parentById.get(parent);
    }
  }
  return [...ids];
}

// Slugs are UNIQUE per table; append -2, -3... instead of failing the insert.
async function uniqueSlug(table, base, excludeId = null) {
  const root = base || "item";
  let candidate = root;
  for (let i = 2; ; i += 1) {
    const row = excludeId
      ? await one(`SELECT 1 FROM ${table} WHERE slug = $1 AND id != $2`, [candidate, excludeId])
      : await one(`SELECT 1 FROM ${table} WHERE slug = $1`, [candidate]);
    if (!row) return candidate;
    candidate = `${root}-${i}`;
  }
}

// -- AUTH --
app.get("/api/auth/setup-check", ah(async (_req, res) => {
  const existing = await one("SELECT count(*)::int AS count FROM users");
  res.json({ canSetup: existing.count === 0 });
}));

app.post("/api/auth/setup", authLimiter, ah(async (req, res) => {
  const parsed = z.object({
    username: z.string().trim().min(3).max(64),
    password: z.string().min(10).max(128),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "El usuario debe tener al menos 3 caracteres y la contraseña al menos 10" });

  const hash = await bcrypt.hash(parsed.data.password, 10);
  const id = nanoid();
  const created = await tx(async (client) => {
    const existing = await client.query("SELECT count(*)::int AS count FROM users");
    if (existing.rows[0].count > 0) return false;
    await client.query(
      "INSERT INTO users (id, username, password, created_at) VALUES ($1, $2, $3, $4)",
      [id, parsed.data.username, hash, nowIso()]
    );
    return true;
  });
  if (!created) return res.status(403).json({ error: "Setup already completed" });

  res.json({ success: true });
}));

app.post("/api/auth/login", authLimiter, ah(async (req, res) => {
  const parsed = z.object({ username: z.string().min(1).max(64), password: z.string().min(1).max(128) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Credenciales inválidas" });
  const { username, password } = parsed.data;
  const user = await one("SELECT * FROM users WHERE username = $1", [username]);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, username: user.username } });
}));

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

// -- MÉTRICAS PROPIAS --
// Registro anónimo: sin IP, sin user-agent, sin cookies. Solo qué se vio o se clicó.
app.post("/api/metrics/track", metricsLimiter, ah(async (req, res) => {
  const parsed = z.object({
    type: z.enum(["view", "affiliate_click"]),
    path: z.string().max(300).optional(),
    articleId: z.string().max(64).nullable().optional(),
    context: z.string().max(40).nullable().optional(),
    referrer: z.string().max(300).nullable().optional(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid event" });

  // Ruido de gestión, no audiencia: navegación que sale del propio panel de admin
  // (previsualizar artículos, "Ver Web Pública") o de un entorno local. Se acepta con
  // 204 pero no se registra, para que la analítica solo cuente lectores reales.
  const referrer = parsed.data.referrer || "";
  if (/\/admin($|[/?#])|^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/i.test(referrer)) {
    return res.status(204).end();
  }

  await query(
    "INSERT INTO page_events (id, type, path, article_id, context, referrer, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      nanoid(),
      parsed.data.type,
      parsed.data.path || null,
      parsed.data.articleId || null,
      parsed.data.context || null,
      parsed.data.referrer || null,
      nowIso(),
    ]
  );
  res.status(204).end();
}));

app.get("/api/metrics/summary", authenticate, ah(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const totals = await one(
    `SELECT
       count(*) FILTER (WHERE type = 'view')::int AS views,
       count(*) FILTER (WHERE type = 'affiliate_click')::int AS clicks
     FROM page_events WHERE created_at >= $1`,
    [since]
  );

  const byDay = await all(
    `SELECT substring(created_at, 1, 10) AS day,
            count(*) FILTER (WHERE type = 'view')::int AS views,
            count(*) FILTER (WHERE type = 'affiliate_click')::int AS clicks
     FROM page_events WHERE created_at >= $1
     GROUP BY day ORDER BY day`,
    [since]
  );

  const byArticle = await all(
    `SELECT e.article_id, a.title, a.slug,
            count(*) FILTER (WHERE e.type = 'view')::int AS views,
            count(*) FILTER (WHERE e.type = 'affiliate_click')::int AS clicks
     FROM page_events e
     LEFT JOIN articles a ON a.id = e.article_id
     WHERE e.created_at >= $1 AND e.article_id IS NOT NULL
     GROUP BY e.article_id, a.title, a.slug
     ORDER BY 4 DESC
     LIMIT 50`,
    [since]
  );

  // Rutas más vistas, incluidas las que no son artículos (home, categorías, búsqueda).
  const byPath = await all(
    `SELECT path,
            count(*) FILTER (WHERE type = 'view')::int AS views,
            count(*) FILTER (WHERE type = 'affiliate_click')::int AS clicks
     FROM page_events
     WHERE created_at >= $1 AND path IS NOT NULL
     GROUP BY path
     ORDER BY views DESC
     LIMIT 25`,
    [since]
  );

  // Origen del tráfico por dominio del referrer; sin referrer = acceso directo.
  const byReferrer = await all(
    `SELECT coalesce(nullif(substring(referrer from '^https?://([^/]+)'), ''), 'Directo') AS source,
            count(*)::int AS views
     FROM page_events
     WHERE created_at >= $1 AND type = 'view'
     GROUP BY source
     ORDER BY views DESC
     LIMIT 15`,
    [since]
  );

  // Qué CTA genera los clics de afiliado (botón final, enlace en texto, etc.).
  const byContext = await all(
    `SELECT coalesce(nullif(context, ''), 'sin contexto') AS context,
            count(*)::int AS clicks
     FROM page_events
     WHERE created_at >= $1 AND type = 'affiliate_click'
     GROUP BY context
     ORDER BY clicks DESC
     LIMIT 20`,
    [since]
  );

  res.json({ days, totals, byDay, byArticle, byPath, byReferrer, byContext });
}));

// -- NEWSLETTER --
app.post("/api/newsletter/subscribe", newsletterLimiter, ah(async (req, res) => {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Email inválido" });

  try {
    const id = nanoid();
    await query("INSERT INTO newsletter_subscribers (id, email, created_at) VALUES ($1, $2, $3)", [id, parsed.data.email, nowIso()]);
    res.json({ success: true });
  } catch (err) {
    if (String(err?.code) === "23505") return res.json({ success: true }); // duplicado: éxito silencioso
    throw err;
  }
}));

app.get("/api/newsletter/subscribers", authenticate, ah(async (_req, res) => {
  res.json(await all("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC"));
}));

// Products
app.get("/api/products", authenticate, ah(async (_req, res) => {
  // article: el artículo vinculado más reciente, para enlazarlo desde el admin.
  const rows = (await all(
    `SELECT p.*,
       (SELECT jsonb_build_object('id', a.id, 'slug', a.slug, 'status', a.status, 'title', a.title)
        FROM articles a WHERE a.product_id = p.id
        ORDER BY a.created_at DESC LIMIT 1) AS article
     FROM products p ORDER BY p.created_at DESC`
  )).map((row) => ({
    ...row,
    features: safeJsonParse(row.features, []),
    images: safeJsonParse(row.images, []),
    details: safeJsonParse(row.details, null),
    categoryId: row.category_id,
    createdAt: row.created_at,
  }));
  res.json(rows);
}));

app.post("/api/products/import", importLimiter, authenticate, ah(async (req, res) => {
  const schema = z.object({
    url: z.string().url().optional(),
    asin: z.string().min(5).optional(),
    marketplace: z.string().url().optional(),
    categoryId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { url, asin, marketplace, categoryId } = parsed.data;
  try {
    if (url) parseAmazonUrl(url);
    if (marketplace) parseAmazonUrl(marketplace);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  const targetUrl = url || (asin && marketplace ? `${marketplace}/dp/${asin}` : null);

  if (!targetUrl) {
    return res.status(400).json({ error: "url o asin+marketplace requeridos" });
  }

  try {
    const product = await scrapeAmazonProduct(targetUrl);
    const id = nanoid();
    const createdAt = nowIso();

    const stored = await one(
      `INSERT INTO products
       (id, asin, title, price, rating, reviews, features, images, description, details, url, category_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (asin) DO UPDATE SET
         title = EXCLUDED.title, price = EXCLUDED.price, rating = EXCLUDED.rating, reviews = EXCLUDED.reviews,
         features = EXCLUDED.features, images = EXCLUDED.images, url = EXCLUDED.url,
         description = COALESCE(EXCLUDED.description, products.description),
         details = COALESCE(EXCLUDED.details, products.details),
         category_id = COALESCE(EXCLUDED.category_id, products.category_id)
       RETURNING *`,
      [
        id,
        product.asin || asin,
        product.title || "",
        product.price,
        product.rating,
        product.reviews,
        JSON.stringify(product.features || []),
        JSON.stringify(product.images || []),
        product.description || null,
        product.details ? JSON.stringify(product.details) : null,
        product.url || targetUrl,
        categoryId || null,
        createdAt,
      ]
    );

    res.json({ ...stored, ...product, id: stored.id, categoryId: stored.category_id, createdAt: stored.created_at });
  } catch (error) {
    console.error("Scrape error:", error?.message || error);
    res.status(error?.message?.includes("Amazon marketplace") ? 400 : 502).json({ error: error?.message || "scraping failed" });
  }
}));

app.delete("/api/products/:id", authenticate, ah(async (req, res) => {
  const linkedArticles = await one("SELECT count(*)::int AS count FROM articles WHERE product_id = $1", [req.params.id]);
  if (linkedArticles.count > 0) {
    return res.status(409).json({ error: `El producto tiene ${linkedArticles.count} artículo(s) vinculado(s). Elimínalos o desvincúlalos primero.` });
  }
  const result = await query("DELETE FROM products WHERE id = $1", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
}));

// Categories
app.get("/api/categories", ah(async (_req, res) => {
  res.json(await all("SELECT * FROM categories ORDER BY name"));
}));

app.post("/api/categories", authenticate, ah(async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    parentId: z.string().nullable().optional(),
    seoTitle: z.string().optional(),
    seoKeywords: z.string().optional(),
    seoDescription: z.string().optional(),
    slug: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = nanoid();
  const name = parsed.data.name;
  const slug = await uniqueSlug("categories", parsed.data.slug || slugify(name));
  const createdAt = nowIso();
  const parentId = parsed.data.parentId || null;

  await query(
    `INSERT INTO categories
     (id, name, slug, parent_id, created_at, description, seo_title, seo_keywords, seo_description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      name,
      slug,
      parentId,
      createdAt,
      parsed.data.description || null,
      parsed.data.seoTitle || null,
      parsed.data.seoKeywords || null,
      parsed.data.seoDescription || null,
    ]
  );
  res.json({ id, name, slug, parentId, createdAt });
}));

app.put("/api/categories/:id", authenticate, ah(async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    parentId: z.string().nullable().optional(),
    slug: z.string().optional(),
    seoTitle: z.string().optional(),
    seoKeywords: z.string().optional(),
    seoDescription: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, description, parentId, slug, seoTitle, seoKeywords, seoDescription } = parsed.data;
  const finalSlug = await uniqueSlug("categories", slug || slugify(name), req.params.id);

  await query(
    `UPDATE categories
     SET name = $1, description = $2, parent_id = $3, slug = $4, seo_title = $5, seo_keywords = $6, seo_description = $7
     WHERE id = $8`,
    [name, description || null, parentId || null, finalSlug, seoTitle || null, seoKeywords || null, seoDescription || null, req.params.id]
  );

  res.json({ ok: true });
}));

app.get("/api/categories/slug/:slug", ah(async (req, res) => {
  const category = await one("SELECT * FROM categories WHERE slug = $1", [req.params.slug]);
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json(category);
}));

// Tags
app.get("/api/tags", authenticate, ah(async (_req, res) => {
  res.json(await all("SELECT * FROM tags ORDER BY name"));
}));

app.post("/api/tags", authenticate, ah(async (req, res) => {
  const schema = z.object({ name: z.string().min(2) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = nanoid();
  const name = parsed.data.name;
  const slug = await uniqueSlug("tags", slugify(name));
  const createdAt = nowIso();

  await query("INSERT INTO tags (id, name, slug, created_at) VALUES ($1, $2, $3, $4)", [id, name, slug, createdAt]);

  res.json({ id, name, slug, createdAt });
}));

// Affiliate links
app.get("/api/affiliate-links", authenticate, ah(async (_req, res) => {
  res.json(await all("SELECT * FROM affiliate_links ORDER BY created_at DESC"));
}));

app.post("/api/affiliate-links", authenticate, ah(async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    asin: z.string().min(5),
    url: z.string().url(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const asin = normalizeAsin(parsed.data.asin);
  if (!asin || !validateAffiliateUrl(parsed.data.url, asin)) {
    return res.status(400).json({ error: "Affiliate URL must be a tracked Amazon URL for this ASIN" });
  }

  const id = nanoid();
  const createdAt = nowIso();

  await query("INSERT INTO affiliate_links (id, name, asin, url, created_at) VALUES ($1, $2, $3, $4, $5)", [id, parsed.data.name, asin, parsed.data.url, createdAt]);

  res.json({ id, createdAt, ...parsed.data, asin });
}));

// Articles
app.get("/api/articles", optionalAuthenticate, ah(async (req, res) => {
  const status = req.query.status;
  const categoryId = req.query.categoryId;
  const params = [];

  let sql = "SELECT * FROM articles";
  const clauses = [];

  if (!req.user) {
    clauses.push("status = 'published'");
  } else if (status) {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }
  if (categoryId) {
    params.push(categoryId);
    const idx = params.length;
    clauses.push(`(category_id = $${idx} OR EXISTS (SELECT 1 FROM article_categories ac WHERE ac.article_id = articles.id AND ac.category_id = $${idx}))`);
  }
  if (clauses.length) {
    sql += ` WHERE ${clauses.join(" AND ")}`;
  }
  sql += " ORDER BY created_at DESC";

  const rows = (await all(sql, params)).map((row) => ({
    ...row,
    html: sanitizeArticleHtml(row.html),
  }));
  res.json(rows);
}));

// Artículos relacionados: primero los de la misma subcategoría y, si no hay suficientes,
// se sube por la cadena de categorías superiores. Devuelve solo los campos de la tarjeta
// (sin el HTML del artículo) para que la petición sea barata.
app.get("/api/articles/:idOrSlug/related", ah(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 3, 1), 12);

  const article = await one(
    "SELECT id, category_id FROM articles WHERE (id = $1 OR slug = $1) AND status = 'published'",
    [req.params.idOrSlug]
  );
  if (!article) return res.status(404).json({ error: "not found" });

  const CARD_FIELDS = "a.id, a.slug, a.title, a.image_url, a.meta_description, a.category_id, a.published_at, a.created_at";

  // depth 1 = la propia subcategoría del artículo; cada salto al padre suma 1, así que
  // ordenar por la profundidad mínima da primero la coincidencia más específica.
  const byCategory = article.category_id
    ? await all(
        `WITH RECURSIVE chain AS (
           SELECT id, parent_id, 1 AS depth FROM categories WHERE id = $2
           UNION ALL
           SELECT c.id, c.parent_id, ch.depth + 1
           FROM categories c JOIN chain ch ON c.id = ch.parent_id
           WHERE ch.depth < 10
         )
         SELECT ${CARD_FIELDS}, min(ch.depth)::int AS match_depth
         FROM articles a
         JOIN chain ch ON a.category_id = ch.id OR EXISTS (
           SELECT 1 FROM article_categories ac WHERE ac.article_id = a.id AND ac.category_id = ch.id
         )
         WHERE a.status = 'published' AND a.id <> $1
         GROUP BY a.id
         ORDER BY match_depth ASC, coalesce(a.published_at, a.created_at) DESC
         LIMIT $3`,
        [article.id, article.category_id, limit]
      )
    : [];

  // Sin categoría o con muy pocos hermanos: se completa con los más recientes para no
  // dejar la sección coja al final del artículo.
  let rows = byCategory;
  if (rows.length < limit) {
    const excluded = [article.id, ...rows.map((row) => row.id)];
    const filler = await all(
      `SELECT ${CARD_FIELDS}, NULL::int AS match_depth
       FROM articles a
       WHERE a.status = 'published' AND a.id <> ALL($1)
       ORDER BY coalesce(a.published_at, a.created_at) DESC
       LIMIT $2`,
      [excluded, limit - rows.length]
    );
    rows = [...rows, ...filler];
  }

  res.json(rows);
}));

app.get("/api/articles/:idOrSlug", optionalAuthenticate, ah(async (req, res) => {
  const visibility = req.user ? "" : " AND status = 'published'";
  const row = await one(`SELECT * FROM articles WHERE (id = $1 OR slug = $1)${visibility}`, [req.params.idOrSlug]);
  if (!row) return res.status(404).json({ error: "not found" });

  const id = row.id;

  const tags = (await all(
    `SELECT t.id FROM tags t
     INNER JOIN article_tags at ON at.tag_id = t.id
     WHERE at.article_id = $1`,
    [id]
  )).map((t) => t.id);

  const categoryIds = (await all("SELECT category_id FROM article_categories WHERE article_id = $1", [id])).map((c) => c.category_id);

  // Resumen del producto vinculado para datos estructurados (JSON-LD) en el cliente.
  const productRow = row.product_id
    ? await one("SELECT title, price, rating, reviews, asin, images FROM products WHERE id = $1", [row.product_id])
    : null;
  const product = productRow ? { ...productRow, images: safeJsonParse(productRow.images, []) } : null;

  res.json({ ...row, html: sanitizeArticleHtml(row.html), tags, categoryIds, product });
}));

app.post("/api/articles", authenticate, ah(async (req, res) => {
  const schema = z.object({
    title: z.string().min(3),
    html: z.string().min(10),
    metaDescription: z.string().optional(),
    status: z.enum(["draft", "published", "scheduled"]).default("draft"),
    categoryIds: z.array(z.string()).optional(),
    productId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    scheduledAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
    imageUrl: z.string().url().optional().or(z.literal("")),
    slug: z.string().optional(),
    seoTitle: z.string().optional(),
    seoKeywords: z.string().optional(),
    canonicalUrl: z.string().url().optional().or(z.literal("")),
    isFeatured: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (parsed.data.status === "scheduled" && (!parsed.data.scheduledAt || new Date(parsed.data.scheduledAt) <= new Date())) {
    return res.status(400).json({ error: "Scheduled articles require a future ISO date" });
  }

  const id = nanoid();
  const createdAt = nowIso();
  const updatedAt = createdAt;
  const slug = await uniqueSlug("articles", parsed.data.slug || slugify(parsed.data.title));
  const mainCategoryId = parsed.data.categoryIds?.[0] || null;
  const articleCategoryIds = await withAncestorCategories(parsed.data.categoryIds);
  const cleanHtml = sanitizeArticleHtml(parsed.data.html);
  if (cleanHtml.trim().length < 10) return res.status(400).json({ error: "Article HTML is empty after sanitization" });
  const productAsin = parsed.data.productId
    ? (await one("SELECT asin FROM products WHERE id = $1", [parsed.data.productId]))?.asin
    : null;
  if (parsed.data.status === "published" && parsed.data.productId && (!productAsin || !hasAffiliateLinkForAsin(cleanHtml, productAsin))) {
    return res.status(400).json({ error: "Monetized articles require a tracked Amazon link for their product before publication" });
  }

  await tx(async (client) => {
    await client.query(
      `INSERT INTO articles
       (id, title, slug, status, html, meta_description, product_id, category_id, created_at, updated_at, published_at, scheduled_at, image_url, seo_title, seo_keywords, canonical_url, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        id, parsed.data.title, slug, parsed.data.status, cleanHtml, parsed.data.metaDescription || null,
        parsed.data.productId || null, mainCategoryId, createdAt, updatedAt,
        parsed.data.status === "published" ? createdAt : null, parsed.data.scheduledAt || null,
        parsed.data.imageUrl || null, parsed.data.seoTitle || null, parsed.data.seoKeywords || null,
        parsed.data.canonicalUrl || null, parsed.data.isFeatured ? 1 : 0,
      ]
    );
    if (parsed.data.isFeatured) await client.query("UPDATE articles SET is_featured = 0 WHERE id != $1", [id]);
    for (const tagId of parsed.data.tags || []) {
      await client.query("INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, tagId]);
    }
    for (const catId of articleCategoryIds) {
      await client.query("INSERT INTO article_categories (article_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, catId]);
    }
  });

  res.json({ id, slug, createdAt, updatedAt });
}));

app.put("/api/articles/:id", authenticate, ah(async (req, res) => {
  const schema = z.object({
    title: z.string().min(3).optional(),
    html: z.string().min(10).optional(),
    metaDescription: z.string().optional(),
    status: z.enum(["draft", "published", "scheduled"]).optional(),
    categoryIds: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    scheduledAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
    imageUrl: z.string().url().optional().or(z.literal("")),
    slug: z.string().optional(),
    seoTitle: z.string().optional(),
    seoKeywords: z.string().optional(),
    canonicalUrl: z.string().url().optional().or(z.literal("")),
    isFeatured: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await one("SELECT * FROM articles WHERE id = $1", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "not found" });

  const updatedAt = nowIso();
  const title = parsed.data.title ?? existing.title;
  const requestedSlug = parsed.data.slug ?? (parsed.data.title ? slugify(parsed.data.title) : existing.slug);
  const slug = await uniqueSlug("articles", requestedSlug, req.params.id);

  const mainCategoryId = parsed.data.categoryIds?.[0] ?? existing.category_id;
  const cleanHtml = parsed.data.html === undefined ? existing.html : sanitizeArticleHtml(parsed.data.html);
  if (cleanHtml.trim().length < 10) return res.status(400).json({ error: "Article HTML is empty after sanitization" });
  const status = parsed.data.status ?? existing.status;
  const scheduledAt = parsed.data.scheduledAt ?? existing.scheduled_at;
  if (status === "scheduled" && (!scheduledAt || !Number.isFinite(Date.parse(scheduledAt)) || new Date(scheduledAt) <= new Date())) {
    return res.status(400).json({ error: "Scheduled articles require a future ISO date" });
  }
  const productAsin = existing.product_id
    ? (await one("SELECT asin FROM products WHERE id = $1", [existing.product_id]))?.asin
    : null;
  if (status === "published" && existing.product_id && (!productAsin || !hasAffiliateLinkForAsin(cleanHtml, productAsin))) {
    return res.status(400).json({ error: "Monetized articles require a tracked Amazon link for their product before publication" });
  }

  await tx(async (client) => {
    await client.query(
      `UPDATE articles
       SET title = $1, slug = $2, status = $3, html = $4, meta_description = $5, category_id = $6, updated_at = $7, published_at = $8, scheduled_at = $9, image_url = $10, seo_title = $11, seo_keywords = $12, canonical_url = $13, is_featured = $14
       WHERE id = $15`,
      [
        title, slug, status, cleanHtml, parsed.data.metaDescription ?? existing.meta_description, mainCategoryId, updatedAt,
        (status === "published" && existing.status !== "published") ? updatedAt : existing.published_at,
        scheduledAt || null, parsed.data.imageUrl ?? existing.image_url,
        parsed.data.seoTitle ?? existing.seo_title, parsed.data.seoKeywords ?? existing.seo_keywords,
        parsed.data.canonicalUrl ?? existing.canonical_url,
        parsed.data.isFeatured !== undefined ? (parsed.data.isFeatured ? 1 : 0) : (existing.is_featured || 0),
        req.params.id,
      ]
    );
    if (parsed.data.isFeatured) await client.query("UPDATE articles SET is_featured = 0 WHERE id != $1", [req.params.id]);
    if (parsed.data.tags) {
      await client.query("DELETE FROM article_tags WHERE article_id = $1", [req.params.id]);
      for (const tagId of parsed.data.tags) {
        await client.query("INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [req.params.id, tagId]);
      }
    }
    if (parsed.data.categoryIds) {
      await client.query("DELETE FROM article_categories WHERE article_id = $1", [req.params.id]);
      for (const catId of await withAncestorCategories(parsed.data.categoryIds)) {
        await client.query("INSERT INTO article_categories (article_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [req.params.id, catId]);
      }
    }
  });

  res.json({ id: req.params.id, updatedAt, success: true });
}));

app.delete("/api/articles/:id", authenticate, ah(async (req, res) => {
  const result = await query("DELETE FROM articles WHERE id = $1", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
}));

// Generate article (auto)
app.post("/api/generate-article", generationLimiter, authenticate, ah(async (req, res) => {
  const schema = z.object({
    product: z
      .object({
        id: z.string().optional(),
        asin: z.string().optional(),
        title: z.string().optional(),
        price: z.string().optional(),
        rating: z.number().nullable().optional(),
        reviews: z.number().nullable().optional(),
        features: z.array(z.string()).optional(),
        images: z.array(z.string()).optional(),
        description: z.string().nullable().optional(),
        details: z.record(z.string()).nullable().optional(),
        url: z.string().url().optional(),
        categoryId: z.string().optional(),
      })
      .optional(),
    productId: z.string().optional(),
    affiliateLinkId: z.string().optional(),
    categoryId: z.string().optional(),
    saveDraft: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  let product = parsed.data.product || null;

  if (!product && parsed.data.productId) {
    const dbProduct = await one("SELECT * FROM products WHERE id = $1", [parsed.data.productId]);
    if (!dbProduct) return res.status(404).json({ error: "product not found" });
    product = {
      ...dbProduct,
      features: safeJsonParse(dbProduct.features, []),
      images: safeJsonParse(dbProduct.images, []),
      details: safeJsonParse(dbProduct.details, null),
      categoryId: dbProduct.category_id,
    };
  }

  if (!product) return res.status(400).json({ error: "product required" });

  const affiliateLinks = await all("SELECT * FROM affiliate_links ORDER BY created_at ASC, id ASC");
  let marketplace;
  try {
    marketplace = product.url ? parseAmazonUrl(product.url).origin : undefined;
  } catch {
    marketplace = undefined;
  }
  const finalAffiliateLink = resolveAffiliateUrl({
    asin: product.asin,
    links: affiliateLinks,
    affiliateLinkId: parsed.data.affiliateLinkId,
    storeId: process.env.AMAZON_STORE_ID,
    marketplace,
  });
  if (!finalAffiliateLink) {
    return res.status(400).json({ error: "No tracked Amazon affiliate URL is available for this product; configure AMAZON_STORE_ID or a matching affiliate link" });
  }

  const categoryId = parsed.data.categoryId || product.categoryId || product.category_id;
  const categoryRow = categoryId
    ? await one("SELECT name, slug FROM categories WHERE id = $1", [categoryId])
    : null;
  const categoryName = categoryRow?.name || null;
  const categorySlug = categoryRow?.slug || null;
  const related = (await getRelatedProducts({
    categoryId,
    excludeId: product.id,
    limit: 3,
  })).map((item) => ({
    ...item,
    categoryId: item.category_id,
    affiliateUrl: resolveAffiliateUrl({
      asin: item.asin,
      links: affiliateLinks,
      storeId: process.env.AMAZON_STORE_ID,
      marketplace: (() => {
        try { return item.url ? parseAmazonUrl(item.url).origin : undefined; } catch { return undefined; }
      })(),
    }),
  }));

  let result;
  try {
    result = await generateArticleHtml({
      product,
      relatedProducts: related,
      affiliateLink: finalAffiliateLink,
      category: categoryName,
      categorySlug,
      llm: { enabled: llmConfig.enabled, config: llmConfig },
      locale: "es-ES",
      tone: "cercano-profesional",
    });
    let finalResult = result;
    const allowedAffiliateUrls = [finalAffiliateLink, ...related.map((item) => item.affiliateUrl)].filter(Boolean);
    try {
      finalResult = { ...result, html: prepareGeneratedArticleHtml(result.html, finalAffiliateLink, allowedAffiliateUrls) };
    } catch {
      const fallback = await generateArticleHtml({
        product, relatedProducts: related, affiliateLink: finalAffiliateLink, category: categoryName, categorySlug, llm: { enabled: false },
      });
      finalResult = { ...fallback, html: prepareGeneratedArticleHtml(fallback.html, finalAffiliateLink, allowedAffiliateUrls) };
    }

    if (parsed.data.saveDraft === false) {
      return res.json(finalResult);
    }

    const id = nanoid();
    const createdAt = nowIso();
    const updatedAt = createdAt;
    const title = (finalResult.seoTitle || product.title || "Articulo generado").slice(0, 200);
    const finalHtml = finalResult.html;
    const finalSlug = await uniqueSlug("articles", finalResult.slug || slugify(title));

    // category_id conserva la hoja (para migas de pan); article_categories guarda toda la rama.
    const articleCategoryIds = await withAncestorCategories([categoryId]);

    try {
      await tx(async (client) => {
        await client.query(
          `INSERT INTO articles
           (id, title, slug, status, html, meta_description, product_id, category_id, created_at, updated_at, image_url, seo_title, seo_keywords)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            id, title, finalSlug, "draft", finalHtml, finalResult.metaDescription || null, product.id || null,
            categoryId || null, createdAt, updatedAt, product.images?.[0] || null,
            finalResult.seoTitle || null, finalResult.seoKeywords || null,
          ]
        );
        for (const catId of articleCategoryIds) {
          await client.query("INSERT INTO article_categories (article_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, catId]);
        }
      });
    } catch (dbErr) {
      console.error("[generate-article] DB Insert Error:", dbErr);
      return res.status(500).json({ error: "Fallo al guardar el borrador en la base de datos." });
    }

    res.json({ id, title, slug: finalSlug, status: "draft", ...finalResult });
  } catch (error) {
    console.error("Generation error:", error?.message || error);
    return res.status(500).json({ error: "Fallo al generar el artículo." });
  }
}));

// Publish
async function publishArticle(articleId) {
  const article = await one("SELECT * FROM articles WHERE id = $1", [articleId]);
  if (!article) return { status: 404, error: "Article not found" };
  const cleanHtml = sanitizeArticleHtml(article.html);
  if (cleanHtml.trim().length < 10) return { status: 400, error: "Article HTML is empty after sanitization" };
  const productAsin = article.product_id
    ? (await one("SELECT asin FROM products WHERE id = $1", [article.product_id]))?.asin
    : null;
  if (article.product_id && (!productAsin || !hasAffiliateLinkForAsin(cleanHtml, productAsin))) {
    return { status: 400, error: "Monetized articles require a tracked Amazon link for their product before publication" };
  }
  const publishedAt = nowIso();
  const result = await query(
    "UPDATE articles SET status = 'published', html = $1, published_at = COALESCE(published_at, $2), updated_at = $3 WHERE id = $4",
    [cleanHtml, publishedAt, publishedAt, articleId]
  );
  return result.rowCount ? { status: 200 } : { status: 404, error: "Article not found" };
}

app.post("/api/publish-article", authenticate, ah(async (req, res) => {
  const schema = z.object({ articleId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await publishArticle(parsed.data.articleId);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json({ ok: true });
}));

async function reconcileScheduledArticles() {
  const due = await all(
    "SELECT id FROM articles WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= $1",
    [nowIso()]
  );
  for (const article of due) {
    const result = await publishArticle(article.id);
    if (result.error) console.warn(`[scheduler] ${article.id}: ${result.error}`);
  }
}

// -- SEO: HTML con metas reales, sitemap y robots --
// La SPA escribe title y metas por JavaScript, así que el HTML inicial era idéntico para
// todas las URLs. Google renderiza JS pero tarde y peor; los crawlers de redes sociales
// no lo ejecutan nunca. Estas rutas devuelven el mismo bundle con el <head> ya resuelto.

// Cachea en CDN pero revalida en segundo plano: al publicar un artículo la meta se
// actualiza sin esperar a que expire.
const HTML_CACHE = "public, max-age=0, s-maxage=600, stale-while-revalidate=86400";

function truncate(value, max = 160) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

async function sendShell(req, res, meta) {
  try {
    const html = await renderShell(req, meta);
    res.set("Content-Type", "text/html; charset=utf-8").set("Cache-Control", HTML_CACHE).send(html);
  } catch (error) {
    // Si el shell no se puede cargar, mejor que la plataforma sirva el estático de
    // siempre que devolver un 500 y tumbar la página.
    console.error("SEO shell failed:", error?.message || error);
    res.redirect(302, "/index.html");
  }
}

app.get("/analisis/:slug", ah(async (req, res) => {
  const article = await one(
    `SELECT title, slug, seo_title, meta_description, seo_keywords, canonical_url, image_url
     FROM articles WHERE slug = $1 AND status = 'published'`,
    [req.params.slug]
  );
  const origin = siteOrigin(req);

  if (!article) {
    return sendShell(req, res, {
      title: `Análisis no encontrado | ${SITE_NAME}`,
      description: "Este análisis no existe o ya no está disponible.",
      robots: "noindex, follow",
    });
  }

  await sendShell(req, res, {
    title: article.seo_title || `${article.title} | ${SITE_NAME}`,
    description: truncate(article.meta_description) || DEFAULT_DESCRIPTION,
    keywords: article.seo_keywords || "",
    canonical: article.canonical_url || `${origin}/analisis/${article.slug}`,
    image: article.image_url || "",
    type: "article",
  });
}));

app.get("/categoria/:slug", ah(async (req, res) => {
  const category = await one("SELECT name, slug FROM categories WHERE slug = $1", [req.params.slug]);
  const origin = siteOrigin(req);

  if (!category) {
    return sendShell(req, res, {
      title: `Categoría no encontrada | ${SITE_NAME}`,
      description: "Esta categoría no existe o ha cambiado de dirección.",
      robots: "noindex, follow",
    });
  }

  await sendShell(req, res, {
    title: `${category.name}: análisis y opiniones | ${SITE_NAME}`,
    description: `Todos nuestros análisis de ${category.name.toLowerCase()}: especificaciones, pros, contras y para quién es cada producto.`,
    canonical: `${origin}/categoria/${category.slug}`,
  });
}));

app.get("/categorias", ah(async (req, res) => {
  await sendShell(req, res, {
    title: `Categorías | ${SITE_NAME}`,
    description: "Explora todos los análisis de Homzy organizados por categoría.",
    canonical: `${siteOrigin(req)}/categorias`,
  });
}));

// Los resultados de búsqueda no aportan nada al índice y generan URLs infinitas.
app.get("/buscar", ah(async (req, res) => {
  await sendShell(req, res, {
    title: `Buscar análisis | ${SITE_NAME}`,
    description: "Busca entre todos los análisis de producto publicados en Homzy.",
    robots: "noindex, follow",
  });
}));

app.get("/sitemap.xml", ah(async (req, res) => {
  const origin = siteOrigin(req);

  const articles = await all(
    `SELECT slug, published_at, created_at FROM articles
     WHERE status = 'published' AND slug IS NOT NULL
     ORDER BY coalesce(published_at, created_at) DESC`
  );

  // Solo categorías con artículos publicados: una categoría vacía en el sitemap es una
  // página sin contenido que Google acaba marcando como de baja calidad.
  const categories = await all(
    `SELECT c.slug, max(coalesce(a.published_at, a.created_at)) AS lastmod
     FROM categories c
     JOIN article_categories ac ON ac.category_id = c.id
     JOIN articles a ON a.id = ac.article_id AND a.status = 'published'
     WHERE c.slug IS NOT NULL
     GROUP BY c.slug
     ORDER BY c.slug`
  );

  const newestArticle = articles[0]?.published_at || articles[0]?.created_at || null;
  const day = (value) => (value ? new Date(value).toISOString().slice(0, 10) : null);

  const urls = [
    { loc: `${origin}/`, lastmod: day(newestArticle), changefreq: "daily", priority: "1.0" },
    { loc: `${origin}/categorias`, lastmod: day(newestArticle), changefreq: "weekly", priority: "0.5" },
    ...categories.map((category) => ({
      loc: `${origin}/categoria/${category.slug}`,
      lastmod: day(category.lastmod),
      changefreq: "weekly",
      priority: "0.7",
    })),
    ...articles.map((article) => ({
      loc: `${origin}/analisis/${article.slug}`,
      lastmod: day(article.published_at || article.created_at),
      changefreq: "monthly",
      priority: "0.9",
    })),
  ];

  const body = urls
    .map(({ loc, lastmod, changefreq, priority }) =>
      [
        "  <url>",
        `    <loc>${escapeHtml(loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n");

  res
    .set("Content-Type", "application/xml; charset=utf-8")
    .set("Cache-Control", HTML_CACHE)
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
}));

app.get("/robots.txt", (req, res) => {
  const origin = siteOrigin(req);
  res
    .set("Content-Type", "text/plain; charset=utf-8")
    .set("Cache-Control", HTML_CACHE)
    .send(
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "Disallow: /login",
        "Disallow: /buscar",
        "",
        `Sitemap: ${origin}/sitemap.xml`,
        "",
      ].join("\n")
    );
});

app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found" }));

// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  console.error("Unhandled error:", error?.message || error);
  res.status(500).json({ error: "Internal server error" });
});

export { reconcileScheduledArticles };
