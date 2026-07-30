import dotenv from "dotenv";
import { fileURLToPath as resolveEnvPath } from "url";
// Ruta explícita: bajo Passenger (producción) el cwd no es server/, y el .env no se encontraría.
dotenv.config({ path: resolveEnvPath(new URL("../.env", import.meta.url)) });
import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import { z } from "zod";

import { createDb } from "./db.js";
import { nowIso, slugify, safeJsonParse } from "./utils.js";
import { scrapeAmazonProduct, normalizeAsin, parseAmazonUrl } from "./scrape/amazon.js";
import { generateArticleHtml } from "./services/articleGenerator.js";
import { resolveLlmConfig } from "./services/llmClient.js";
import { getRelatedProducts } from "./services/relatedProducts.js";
import { createAuthMiddleware } from "./auth.js";
import { resolveAffiliateUrl, validateAffiliateUrl } from "./services/affiliate.js";
import { hasAffiliateLinkForAsin, prepareGeneratedArticleHtml, sanitizeArticleHtml } from "./services/articleHtml.js";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-123";

const PORT = process.env.PORT || 5177;
const app = express();
const db = createDb();
const llmConfig = resolveLlmConfig();
const { authenticate, optionalAuthenticate } = createAuthMiddleware(JWT_SECRET);
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const importLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const generationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const newsletterLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: nowIso() });
});

// Slugs are UNIQUE per table; append -2, -3... instead of failing the insert.
function uniqueSlug(table, base, excludeId = null) {
  const root = base || "item";
  const stmt = excludeId
    ? db.prepare(`SELECT 1 FROM ${table} WHERE slug = ? AND id != ?`)
    : db.prepare(`SELECT 1 FROM ${table} WHERE slug = ?`);
  let candidate = root;
  for (let i = 2; stmt.get(...(excludeId ? [candidate, excludeId] : [candidate])); i += 1) {
    candidate = `${root}-${i}`;
  }
  return candidate;
}

// -- AUTH --
app.get("/api/auth/setup-check", (req, res) => {
  const existing = db.prepare("SELECT count(*) as count FROM users").get();
  res.json({ canSetup: existing.count === 0 });
});

app.post("/api/auth/setup", authLimiter, async (req, res) => {
  const parsed = z.object({
    username: z.string().trim().min(3).max(64),
    password: z.string().min(10).max(128),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "El usuario debe tener al menos 3 caracteres y la contraseña al menos 10" });

  const hash = await bcrypt.hash(parsed.data.password, 10);
  const id = nanoid();
  const created = db.transaction(() => {
    const existing = db.prepare("SELECT count(*) as count FROM users").get();
    if (existing.count > 0) return false;
    db.prepare("INSERT INTO users (id, username, password, created_at) VALUES (?, ?, ?, ?)")
      .run(id, parsed.data.username, hash, nowIso());
    return true;
  })();
  if (!created) return res.status(403).json({ error: "Setup already completed" });

  res.json({ success: true });
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const parsed = z.object({ username: z.string().min(1).max(64), password: z.string().min(1).max(128) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Credenciales inválidas" });
  const { username, password } = parsed.data;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

// -- NEWSLETTER --
app.post("/api/newsletter/subscribe", newsletterLimiter, (req, res) => {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Email inválido" });

  try {
    const id = nanoid();
    db.prepare("INSERT INTO newsletter_subscribers (id, email, created_at) VALUES (?, ?, ?)").run(id, parsed.data.email, nowIso());
    res.json({ success: true });
  } catch (err) {
    if (err.message.includes("UNIQUE")) return res.json({ success: true }); // Silent success
    res.status(500).json({ error: "Error registering" });
  }
});

app.get("/api/newsletter/subscribers", authenticate, (_req, res) => {
  const rows = db.prepare("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC").all();
  res.json(rows);
});

// Products
app.get("/api/products", authenticate, (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM products ORDER BY created_at DESC")
    .all()
    .map((row) => ({
      ...row,
      features: safeJsonParse(row.features, []),
      images: safeJsonParse(row.images, []),
      details: safeJsonParse(row.details, null),
      categoryId: row.category_id,
      createdAt: row.created_at,
    }));
  res.json(rows);
});

app.post("/api/products/import", importLimiter, authenticate, async (req, res) => {
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

    const stmt = db.prepare(
      `INSERT INTO products
       (id, asin, title, price, rating, reviews, features, images, description, details, url, category_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(asin) DO UPDATE SET
         title = excluded.title, price = excluded.price, rating = excluded.rating, reviews = excluded.reviews,
         features = excluded.features, images = excluded.images, url = excluded.url,
         description = COALESCE(excluded.description, products.description),
         details = COALESCE(excluded.details, products.details),
         category_id = COALESCE(excluded.category_id, products.category_id)`
    );

    stmt.run(
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
      createdAt
    );

    const stored = db.prepare("SELECT * FROM products WHERE asin = ?").get(product.asin || asin);
    res.json({ ...stored, ...product, id: stored.id, categoryId: stored.category_id, createdAt: stored.created_at });
  } catch (error) {
    console.error("Scrape error:", error?.message || error);
    res.status(error?.message?.includes("Amazon marketplace") ? 400 : 502).json({ error: error?.message || "scraping failed" });
  }
});

app.delete("/api/products/:id", authenticate, (req, res) => {
  const linkedArticles = db.prepare("SELECT count(*) as count FROM articles WHERE product_id = ?").get(req.params.id);
  if (linkedArticles.count > 0) {
    return res.status(409).json({ error: `El producto tiene ${linkedArticles.count} artículo(s) vinculado(s). Elimínalos o desvincúlalos primero.` });
  }
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// Categories
app.get("/api/categories", (_req, res) => {
  const rows = db.prepare("SELECT * FROM categories ORDER BY name").all();
  res.json(rows);
});

app.post("/api/categories", authenticate, (req, res) => {
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
  const slug = uniqueSlug("categories", parsed.data.slug || slugify(name));
  const createdAt = nowIso();
  const parentId = parsed.data.parentId || null;

  try {
    db.prepare(
      `INSERT INTO categories 
       (id, name, slug, parent_id, created_at, description, seo_title, seo_keywords, seo_description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      name,
      slug,
      parentId,
      createdAt,
      parsed.data.description || null,
      parsed.data.seoTitle || null,
      parsed.data.seoKeywords || null,
      parsed.data.seoDescription || null
    );
    res.json({ id, name, slug, parentId, createdAt });
  } catch (err) {
    if (err.message.includes("no such column: description")) {
      // Fallback for missing column if migration didn't run for 'description' - though we should fix migration
      // Ideally we should have ensured columns exist.
      // For now, let's just log and fail or retry without description? 
      // Better to assume migration ran. I'll add description to migration next if needed.
      console.error("DB Error (missing col?):", err);
      return res.status(500).json({ error: "Database error" });
    }
    throw err;
  }
});

app.put("/api/categories/:id", authenticate, (req, res) => {
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
  const finalSlug = uniqueSlug("categories", slug || slugify(name), req.params.id);

  db.prepare(
    `UPDATE categories 
     SET name = ?, description = ?, parent_id = ?, slug = ?, seo_title = ?, seo_keywords = ?, seo_description = ?
     WHERE id = ?`
  ).run(name, description || null, parentId || null, finalSlug, seoTitle || null, seoKeywords || null, seoDescription || null, req.params.id);

  res.json({ ok: true });
});

app.get("/api/categories/slug/:slug", (req, res) => {
  const customSlug = req.params.slug;
  const category = db.prepare("SELECT * FROM categories WHERE slug = ?").get(customSlug);
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json(category);
});

// Tags
app.get("/api/tags", authenticate, (_req, res) => {
  const rows = db.prepare("SELECT * FROM tags ORDER BY name").all();
  res.json(rows);
});

app.post("/api/tags", authenticate, (req, res) => {
  const schema = z.object({ name: z.string().min(2) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = nanoid();
  const name = parsed.data.name;
  const slug = uniqueSlug("tags", slugify(name));
  const createdAt = nowIso();

  db.prepare("INSERT INTO tags (id, name, slug, created_at) VALUES (?, ?, ?, ?)").run(
    id,
    name,
    slug,
    createdAt
  );

  res.json({ id, name, slug, createdAt });
});

// Affiliate links
app.get("/api/affiliate-links", authenticate, (_req, res) => {
  const rows = db.prepare("SELECT * FROM affiliate_links ORDER BY created_at DESC").all();
  res.json(rows);
});

app.post("/api/affiliate-links", authenticate, (req, res) => {
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

  db.prepare(
    "INSERT INTO affiliate_links (id, name, asin, url, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, parsed.data.name, asin, parsed.data.url, createdAt);

  res.json({ id, createdAt, ...parsed.data, asin });
});

// Articles
app.get("/api/articles", optionalAuthenticate, (req, res) => {
  const status = req.query.status;
  const categoryId = req.query.categoryId;
  const params = [];

  let query = "SELECT * FROM articles";
  const clauses = [];

  if (!req.user) {
    clauses.push("status = 'published'");
  } else if (status) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (categoryId) {
    clauses.push("(category_id = ? OR EXISTS (SELECT 1 FROM article_categories ac WHERE ac.article_id = articles.id AND ac.category_id = ?))");
    params.push(categoryId, categoryId);
  }
  if (clauses.length) {
    query += ` WHERE ${clauses.join(" AND ")}`;
  }
  query += " ORDER BY created_at DESC";

  const rows = db.prepare(query).all(...params).map((row) => ({
    ...row,
    html: sanitizeArticleHtml(row.html),
  }));
  res.json(rows);
});

app.get("/api/articles/:idOrSlug", optionalAuthenticate, (req, res) => {
  const visibility = req.user ? "" : " AND status = 'published'";
  const row = db.prepare(`SELECT * FROM articles WHERE (id = ? OR slug = ?)${visibility}`).get(req.params.idOrSlug, req.params.idOrSlug);
  if (!row) return res.status(404).json({ error: "not found" });

  const id = row.id;

  const tags = db.prepare(
    `SELECT t.id FROM tags t
     INNER JOIN article_tags at ON at.tag_id = t.id
     WHERE at.article_id = ?`
  ).all(id).map(t => t.id);

  const categoryIds = db.prepare(
    `SELECT category_id FROM article_categories WHERE article_id = ?`
  ).all(id).map(c => c.category_id);

  res.json({ ...row, html: sanitizeArticleHtml(row.html), tags, categoryIds });
});

app.post("/api/articles", authenticate, (req, res) => {
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
  const slug = uniqueSlug("articles", parsed.data.slug || slugify(parsed.data.title));
  const mainCategoryId = parsed.data.categoryIds?.[0] || null;
  const cleanHtml = sanitizeArticleHtml(parsed.data.html);
  if (cleanHtml.trim().length < 10) return res.status(400).json({ error: "Article HTML is empty after sanitization" });
  const productAsin = parsed.data.productId
    ? db.prepare("SELECT asin FROM products WHERE id = ?").get(parsed.data.productId)?.asin
    : null;
  if (parsed.data.status === "published" && parsed.data.productId && (!productAsin || !hasAffiliateLinkForAsin(cleanHtml, productAsin))) {
    return res.status(400).json({ error: "Monetized articles require a tracked Amazon link for their product before publication" });
  }

  db.transaction(() => {
    db.prepare(
      `INSERT INTO articles
       (id, title, slug, status, html, meta_description, product_id, category_id, created_at, updated_at, published_at, scheduled_at, image_url, seo_title, seo_keywords, canonical_url, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, parsed.data.title, slug, parsed.data.status, cleanHtml, parsed.data.metaDescription || null,
      parsed.data.productId || null, mainCategoryId, createdAt, updatedAt,
      parsed.data.status === "published" ? createdAt : null, parsed.data.scheduledAt || null,
      parsed.data.imageUrl || null, parsed.data.seoTitle || null, parsed.data.seoKeywords || null,
      parsed.data.canonicalUrl || null, parsed.data.isFeatured ? 1 : 0
    );
    if (parsed.data.isFeatured) db.prepare("UPDATE articles SET is_featured = 0 WHERE id != ?").run(id);
    const tagStmt = db.prepare("INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)");
    (parsed.data.tags || []).forEach((tagId) => tagStmt.run(id, tagId));
    const catStmt = db.prepare("INSERT OR IGNORE INTO article_categories (article_id, category_id) VALUES (?, ?)");
    (parsed.data.categoryIds || []).forEach((catId) => catStmt.run(id, catId));
  })();

  res.json({ id, slug, createdAt, updatedAt });
});

app.put("/api/articles/:id", authenticate, (req, res) => {
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

  const existing = db.prepare("SELECT * FROM articles WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "not found" });

  const updatedAt = nowIso();
  const title = parsed.data.title ?? existing.title;
  const requestedSlug = parsed.data.slug ?? (parsed.data.title ? slugify(parsed.data.title) : existing.slug);
  const slug = uniqueSlug("articles", requestedSlug, req.params.id);

  // Use the first category as the main category_id for the articles table
  const mainCategoryId = parsed.data.categoryIds?.[0] ?? existing.category_id;
  const cleanHtml = parsed.data.html === undefined ? existing.html : sanitizeArticleHtml(parsed.data.html);
  if (cleanHtml.trim().length < 10) return res.status(400).json({ error: "Article HTML is empty after sanitization" });
  const status = parsed.data.status ?? existing.status;
  const scheduledAt = parsed.data.scheduledAt ?? existing.scheduled_at;
  if (status === "scheduled" && (!scheduledAt || !Number.isFinite(Date.parse(scheduledAt)) || new Date(scheduledAt) <= new Date())) {
    return res.status(400).json({ error: "Scheduled articles require a future ISO date" });
  }
  const productAsin = existing.product_id
    ? db.prepare("SELECT asin FROM products WHERE id = ?").get(existing.product_id)?.asin
    : null;
  if (status === "published" && existing.product_id && (!productAsin || !hasAffiliateLinkForAsin(cleanHtml, productAsin))) {
    return res.status(400).json({ error: "Monetized articles require a tracked Amazon link for their product before publication" });
  }

  db.transaction(() => {
    db.prepare(
      `UPDATE articles
       SET title = ?, slug = ?, status = ?, html = ?, meta_description = ?, category_id = ?, updated_at = ?, published_at = ?, scheduled_at = ?, image_url = ?, seo_title = ?, seo_keywords = ?, canonical_url = ?, is_featured = ?
       WHERE id = ?`
    ).run(
      title, slug, status, cleanHtml, parsed.data.metaDescription ?? existing.meta_description, mainCategoryId, updatedAt,
      (status === "published" && existing.status !== "published") ? updatedAt : existing.published_at,
      scheduledAt || null, parsed.data.imageUrl ?? existing.image_url,
      parsed.data.seoTitle ?? existing.seo_title, parsed.data.seoKeywords ?? existing.seo_keywords,
      parsed.data.canonicalUrl ?? existing.canonical_url,
      parsed.data.isFeatured !== undefined ? (parsed.data.isFeatured ? 1 : 0) : (existing.is_featured || 0), req.params.id
    );
    if (parsed.data.isFeatured) db.prepare("UPDATE articles SET is_featured = 0 WHERE id != ?").run(req.params.id);
    if (parsed.data.tags) {
      db.prepare("DELETE FROM article_tags WHERE article_id = ?").run(req.params.id);
      const tagStmt = db.prepare("INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)");
      parsed.data.tags.forEach((tagId) => tagStmt.run(req.params.id, tagId));
    }
    if (parsed.data.categoryIds) {
      db.prepare("DELETE FROM article_categories WHERE article_id = ?").run(req.params.id);
      const catStmt = db.prepare("INSERT OR IGNORE INTO article_categories (article_id, category_id) VALUES (?, ?)");
      parsed.data.categoryIds.forEach((catId) => catStmt.run(req.params.id, catId));
    }
  })();

  res.json({ id: req.params.id, updatedAt, success: true });
});

app.delete("/api/articles/:id", authenticate, (req, res) => {
  const result = db.prepare("DELETE FROM articles WHERE id = ?").run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// Generate article (auto)
app.post("/api/generate-article", generationLimiter, authenticate, async (req, res) => {
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
    const dbProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(parsed.data.productId);
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

  const affiliateLinks = db.prepare("SELECT * FROM affiliate_links ORDER BY created_at ASC, id ASC").all();
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
  const categoryName = categoryId
    ? db.prepare("SELECT name FROM categories WHERE id = ?").get(categoryId)?.name || null
    : null;
  const related = getRelatedProducts(db, {
    categoryId,
    excludeId: product.id,
    limit: 3,
  }).map((item) => ({
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
        product, relatedProducts: related, affiliateLink: finalAffiliateLink, category: categoryName, llm: { enabled: false },
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
    const finalSlug = uniqueSlug("articles", finalResult.slug || slugify(title));

    try {
      db.transaction(() => {
        db.prepare(
          `INSERT INTO articles
           (id, title, slug, status, html, meta_description, product_id, category_id, created_at, updated_at, image_url, seo_title, seo_keywords)
           VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id, title, finalSlug, "draft", finalHtml, finalResult.metaDescription || null, product.id || null,
          categoryId || null, createdAt, updatedAt, product.images?.[0] || null,
          finalResult.seoTitle || null, finalResult.seoKeywords || null
        );
        if (categoryId) {
          db.prepare("INSERT OR IGNORE INTO article_categories (article_id, category_id) VALUES (?, ?)").run(id, categoryId);
        }
      })();
    } catch (dbErr) {
      console.error("[generate-article] DB Insert Error:", dbErr);
      return res.status(500).json({ error: "Fallo al guardar el borrador en la base de datos." });
    }

    res.json({ id, title, slug: finalSlug, status: "draft", ...finalResult });
  } catch (error) {
    console.error("Generation error:", error?.message || error);
    return res.status(500).json({ error: "Fallo al generar el artículo." });
  }
});

// Publish
function publishArticle(articleId) {
  const article = db.prepare("SELECT * FROM articles WHERE id = ?").get(articleId);
  if (!article) return { status: 404, error: "Article not found" };
  const cleanHtml = sanitizeArticleHtml(article.html);
  if (cleanHtml.trim().length < 10) return { status: 400, error: "Article HTML is empty after sanitization" };
  const productAsin = article.product_id
    ? db.prepare("SELECT asin FROM products WHERE id = ?").get(article.product_id)?.asin
    : null;
  if (article.product_id && (!productAsin || !hasAffiliateLinkForAsin(cleanHtml, productAsin))) {
    return { status: 400, error: "Monetized articles require a tracked Amazon link for their product before publication" };
  }
  const publishedAt = nowIso();
  const result = db.prepare(
    "UPDATE articles SET status = 'published', html = ?, published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?"
  ).run(cleanHtml, publishedAt, publishedAt, articleId);
  return result.changes ? { status: 200 } : { status: 404, error: "Article not found" };
}

app.post("/api/publish-article", authenticate, (req, res) => {
  const schema = z.object({ articleId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = publishArticle(parsed.data.articleId);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json({ ok: true });
});

function reconcileScheduledArticles() {
  const due = db.prepare(
    "SELECT id FROM articles WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND datetime(scheduled_at) <= datetime(?)"
  ).all(nowIso());
  for (const article of due) {
    const result = publishArticle(article.id);
    if (result.error) console.warn(`[scheduler] ${article.id}: ${result.error}`);
  }
}

reconcileScheduledArticles();
setInterval(reconcileScheduledArticles, 60_000).unref();

app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found" }));

if (process.env.NODE_ENV === "production") {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(currentDir, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
