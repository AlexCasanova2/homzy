// Migración una sola vez: SQLite local (db/app.db) → Postgres (Supabase).
// Uso: node migrate-to-supabase.js   (desde server/, con DATABASE_URL en server/.env)
// Es idempotente: aplica el esquema y copia filas con ON CONFLICT DO NOTHING.
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, ".env") });

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL en server/.env");
  process.exit(1);
}

const sqlitePath = path.join(here, "..", "db", "app.db");
if (!fs.existsSync(sqlitePath)) {
  console.error(`No existe la base SQLite en ${sqlitePath}`);
  process.exit(1);
}

const sqlite = new Database(sqlitePath, { readonly: true });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, ssl: { rejectUnauthorized: false } });

// El orden respeta las claves foráneas.
const TABLES = [
  { name: "users", columns: ["id", "username", "password", "created_at"] },
  { name: "categories", columns: ["id", "name", "slug", "parent_id", "description", "seo_title", "seo_keywords", "seo_description", "created_at"] },
  { name: "tags", columns: ["id", "name", "slug", "created_at"] },
  { name: "products", columns: ["id", "asin", "title", "price", "rating", "reviews", "features", "images", "description", "details", "url", "category_id", "created_at"] },
  { name: "affiliate_links", columns: ["id", "name", "asin", "url", "created_at"] },
  { name: "articles", columns: ["id", "title", "slug", "status", "html", "meta_description", "product_id", "category_id", "created_at", "updated_at", "published_at", "scheduled_at", "image_url", "seo_title", "seo_keywords", "canonical_url", "is_featured"] },
  { name: "article_categories", columns: ["article_id", "category_id"] },
  { name: "article_tags", columns: ["article_id", "tag_id"] },
  { name: "newsletter_subscribers", columns: ["id", "email", "created_at"] },
];

async function main() {
  console.log("Aplicando esquema Postgres...");
  const schema = fs.readFileSync(path.join(here, "..", "db", "schema.pg.sql"), "utf8");
  await pool.query(schema);

  for (const table of TABLES) {
    const rows = sqlite.prepare(`SELECT * FROM ${table.name}`).all();
    let copied = 0;
    for (const row of rows) {
      const values = table.columns.map((column) => row[column] ?? null);
      const placeholders = table.columns.map((_, i) => `$${i + 1}`).join(", ");
      const result = await pool.query(
        `INSERT INTO ${table.name} (${table.columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      );
      copied += result.rowCount;
    }
    console.log(`${table.name}: ${rows.length} filas en SQLite, ${copied} copiadas`);
  }

  const check = await pool.query("SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM products) AS products, (SELECT count(*) FROM articles) AS articles");
  console.log("Estado final en Postgres:", check.rows[0]);
  await pool.end();
  sqlite.close();
  console.log("Migración completada.");
}

main().catch((error) => {
  console.error("Migración fallida:", error.message);
  process.exit(1);
});
