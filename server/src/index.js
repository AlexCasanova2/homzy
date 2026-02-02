import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { nanoid } from "nanoid";
import { z } from "zod";

import { createDb } from "./db.js";
import { nowIso, slugify, safeJsonParse } from "./utils.js";
import { scrapeAmazonProduct } from "./scrape/amazon.js";
import { generateArticleHtml } from "./services/articleGenerator.js";
import { resolveLlmConfig } from "./services/llmClient.js";
import { getRelatedProducts } from "./services/relatedProducts.js";

const PORT = process.env.PORT || 5177;

const app = express();
const db = createDb();
const llmConfig = resolveLlmConfig();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: nowIso() });
});

app.get("/", (_req, res) => {
  res.status(200).send("Backend OK. En desarrollo usa el frontend en http://localhost:5173 o 5174.");
});

// Products
app.get("/api/products", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM products ORDER BY created_at DESC")
    .all()
    .map((row) => ({
      ...row,
      features: safeJsonParse(row.features, []),
      images: safeJsonParse(row.images, []),
    }));
  res.json(rows);
});

app.post("/api/products/import", async (req, res) => {
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
  const targetUrl = url || (asin && marketplace ? `${marketplace}/dp/${asin}` : null);

  if (!targetUrl) {
    return res.status(400).json({ error: "url o asin+marketplace requeridos" });
  }

  try {
    const product = await scrapeAmazonProduct(targetUrl);
    const id = nanoid();
    const createdAt = nowIso();

    const stmt = db.prepare(
      `INSERT OR REPLACE INTO products
       (id, asin, title, price, rating, reviews, features, images, url, category_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      product.url || targetUrl,
      categoryId || null,
      createdAt
    );

    res.json({ id, ...product, categoryId, createdAt });
  } catch (error) {
    console.error("Scrape error:", error?.message || error);
    res.status(500).json({ error: error?.message || "scraping failed" });
  }
});

// Categories
app.get("/api/categories", (_req, res) => {
  const rows = db.prepare("SELECT * FROM categories ORDER BY name").all();
  res.json(rows);
});

app.post("/api/categories", (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    parentId: z.string().nullable().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = nanoid();
  const name = parsed.data.name;
  const slug = slugify(name);
  const createdAt = nowIso();
  const parentId = parsed.data.parentId || null;

  db.prepare(
    "INSERT INTO categories (id, name, slug, parent_id, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name, slug, parentId, createdAt);

  res.json({ id, name, slug, parentId, createdAt });
});

// Tags
app.get("/api/tags", (_req, res) => {
  const rows = db.prepare("SELECT * FROM tags ORDER BY name").all();
  res.json(rows);
});

app.post("/api/tags", (req, res) => {
  const schema = z.object({ name: z.string().min(2) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = nanoid();
  const name = parsed.data.name;
  const slug = slugify(name);
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
app.get("/api/affiliate-links", (_req, res) => {
  const rows = db.prepare("SELECT * FROM affiliate_links ORDER BY created_at DESC").all();
  res.json(rows);
});

app.post("/api/affiliate-links", (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    asin: z.string().min(5),
    url: z.string().url(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = nanoid();
  const createdAt = nowIso();

  db.prepare(
    "INSERT INTO affiliate_links (id, name, asin, url, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, parsed.data.name, parsed.data.asin, parsed.data.url, createdAt);

  res.json({ id, createdAt, ...parsed.data });
});

// Articles
app.get("/api/articles", (req, res) => {
  const status = req.query.status;
  const categoryId = req.query.categoryId;
  const params = [];

  let query = "SELECT * FROM articles";
  const clauses = [];

  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (categoryId) {
    clauses.push("category_id = ?");
    params.push(categoryId);
  }
  if (clauses.length) {
    query += ` WHERE ${clauses.join(" AND ")}`;
  }
  query += " ORDER BY created_at DESC";

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

app.get("/api/articles/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM articles WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "not found" });

  const tags = db.prepare(
    `SELECT t.id FROM tags t
     INNER JOIN article_tags at ON at.tag_id = t.id
     WHERE at.article_id = ?`
  ).all(req.params.id).map(t => t.id);

  const categoryIds = db.prepare(
    `SELECT category_id FROM article_categories WHERE article_id = ?`
  ).all(req.params.id).map(c => c.category_id);

  res.json({ ...row, tags, categoryIds });
});

app.post("/api/articles", (req, res) => {
  const schema = z.object({
    title: z.string().min(3),
    html: z.string().min(10),
    metaDescription: z.string().optional(),
    status: z.enum(["draft", "published", "scheduled"]).default("draft"),
    categoryIds: z.array(z.string()).optional(),
    productId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    scheduledAt: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = nanoid();
  const createdAt = nowIso();
  const updatedAt = createdAt;
  const slug = slugify(parsed.data.title);

  db.prepare(
    `INSERT INTO articles
     (id, title, slug, status, html, meta_description, product_id, category_id, created_at, updated_at, published_at, scheduled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    parsed.data.title,
    slug,
    parsed.data.status,
    parsed.data.html,
    parsed.data.metaDescription || null,
    parsed.data.productId || null,
    parsed.data.categoryId || null,
    createdAt,
    updatedAt,
    parsed.data.status === "published" ? createdAt : null,
    parsed.data.scheduledAt || null
  );

  const tags = parsed.data.tags || [];
  const tagStmt = db.prepare(
    "INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)"
  );
  tags.forEach((tagId) => tagStmt.run(id, tagId));

  const categoryIds = parsed.data.categoryIds || [];
  const catStmt = db.prepare(
    "INSERT OR IGNORE INTO article_categories (article_id, category_id) VALUES (?, ?)"
  );
  categoryIds.forEach((catId) => catStmt.run(id, catId));

  res.json({ id, slug, createdAt, updatedAt });
});

app.put("/api/articles/:id", (req, res) => {
  const schema = z.object({
    title: z.string().min(3).optional(),
    html: z.string().min(10).optional(),
    metaDescription: z.string().optional(),
    status: z.enum(["draft", "published", "scheduled"]).optional(),
    categoryIds: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    scheduledAt: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = db.prepare("SELECT * FROM articles WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "not found" });

  const updatedAt = nowIso();
  const title = parsed.data.title ?? existing.title;
  const slug = slugify(title);

  db.prepare(
    `UPDATE articles
     SET title = ?, slug = ?, status = ?, html = ?, meta_description = ?, category_id = ?, updated_at = ?, published_at = ?, scheduled_at = ?
     WHERE id = ?`
  ).run(
    title,
    slug,
    parsed.data.status ?? existing.status,
    parsed.data.html ?? existing.html,
    parsed.data.metaDescription ?? existing.meta_description,
    parsed.data.categoryId ?? existing.category_id,
    updatedAt,
    parsed.data.status === "published" ? updatedAt : existing.published_at,
    parsed.data.scheduledAt ?? existing.scheduled_at,
    req.params.id
  );

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

  res.json({ id: req.params.id, updatedAt, success: true });
});

app.delete("/api/articles/:id", (req, res) => {
  db.prepare("DELETE FROM articles WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Generate article (auto)
app.post("/api/generate-article", async (req, res) => {
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
    };
  }

  if (!product) return res.status(400).json({ error: "product required" });

  const affiliate = parsed.data.affiliateLinkId
    ? db.prepare("SELECT * FROM affiliate_links WHERE id = ?").get(parsed.data.affiliateLinkId)
    : null;

  const related = getRelatedProducts(db, {
    categoryId: parsed.data.categoryId || product.categoryId,
    excludeId: product.id,
    limit: 3,
  });

  let html;
  try {
    html = await generateArticleHtml({
      product,
      relatedProducts: related,
      affiliateLink: affiliate?.url,
      category: parsed.data.categoryId || product.categoryId,
      llm: { enabled: llmConfig.enabled, config: llmConfig },
      locale: "es-ES",
      tone: "cercano-profesional",
    });
  } catch (error) {
    console.error("LLM error:", error?.message || error);
    return res.status(500).json({ error: "Fallo al generar el artículo con LLM." });
  }

  if (parsed.data.saveDraft === false) {
    return res.json({ html });
  }

  const id = nanoid();
  const createdAt = nowIso();
  const updatedAt = createdAt;
  const title = product.title || "Articulo generado";
  const slug = slugify(title);

  db.prepare(
    `INSERT INTO articles
     (id, title, slug, status, html, meta_description, product_id, category_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title,
    slug,
    "draft",
    html,
    null,
    product.id || null,
    parsed.data.categoryId || product.categoryId || null,
    createdAt,
    updatedAt
  );

  res.json({ id, title, slug, status: "draft", html });
});

// Publish
app.post("/api/publish-article", (req, res) => {
  const schema = z.object({ articleId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updatedAt = nowIso();
  db.prepare(
    "UPDATE articles SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?"
  ).run(updatedAt, updatedAt, parsed.data.articleId);

  res.json({ ok: true });
});

// Static serve client build (optional)
const clientDist = new URL("../../client/dist", import.meta.url);
app.use(express.static(clientDist.pathname));

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
