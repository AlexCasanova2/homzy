-- Esquema Postgres (Supabase) para homzy affiliate.
-- Las fechas se guardan como TEXT ISO-8601 (igual que en SQLite): comparan
-- correctamente como cadenas y evita tocar toda la lógica de fechas del server.

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id TEXT REFERENCES categories(id),
  description TEXT,
  seo_title TEXT,
  seo_keywords TEXT,
  seo_description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  asin TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  price TEXT,
  rating REAL,
  reviews INTEGER,
  features TEXT,
  images TEXT,
  description TEXT,
  details TEXT,
  url TEXT,
  category_id TEXT REFERENCES categories(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliate_links (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  asin TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  html TEXT NOT NULL,
  meta_description TEXT,
  product_id TEXT REFERENCES products(id),
  category_id TEXT REFERENCES categories(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  scheduled_at TEXT,
  image_url TEXT,
  seo_title TEXT,
  seo_keywords TEXT,
  canonical_url TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS article_categories (
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, category_id)
);

CREATE TABLE IF NOT EXISTS article_tags (
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_status_scheduled_at ON articles(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
