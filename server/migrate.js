import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "db", "app.db");
const db = new Database(dbPath);

console.log("Checking database for migrations...");

try {
    // Check if categories needs parent_id
    const info = db.prepare("PRAGMA table_info(categories)").all();
    if (!info.find(c => c.name === "parent_id")) {
        console.log("Adding parent_id to categories table...");
        db.prepare("ALTER TABLE categories ADD COLUMN parent_id TEXT").run();
    }

    // Check if article_categories table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='article_categories'").get();
    if (!tables) {
        console.log("Creating article_categories table...");
        db.prepare(`
      CREATE TABLE article_categories (
        article_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        PRIMARY KEY (article_id, category_id),
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `).run();
    }

    console.log("Migration completed successfully.");
} catch (error) {
    console.error("Migration failed:", error);
} finally {
    db.close();
}
