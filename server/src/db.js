import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveDbPath(env = process.env) {
  return env.DB_PATH ? path.resolve(env.DB_PATH) : path.join(__dirname, "..", "..", "db", "app.db");
}
const SCHEMA_PATH = path.join(__dirname, "..", "..", "db", "schema.sql");

const REQUIRED_COLUMNS = {
  categories: {
    slug: "TEXT", parent_id: "TEXT", description: "TEXT", seo_title: "TEXT", seo_keywords: "TEXT", seo_description: "TEXT",
  },
  articles: {
    scheduled_at: "TEXT", image_url: "TEXT", seo_title: "TEXT", seo_keywords: "TEXT", canonical_url: "TEXT",
    is_featured: "INTEGER NOT NULL DEFAULT 0",
  },
};

function migrateColumns(db) {
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name));
    if (!existing.size) continue;
    for (const [column, definition] of Object.entries(columns)) {
      if (!existing.has(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }
}

export function createDb() {
  const DB_PATH = resolveDbPath();
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  migrateColumns(db);
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);
  migrateColumns(db);

  return db;
}
