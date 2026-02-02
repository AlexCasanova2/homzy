import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "db", "app.db");
const db = new Database(dbPath);

const info = db.prepare("PRAGMA table_info(categories)").all();
console.log("Categories columns:", JSON.stringify(info, null, 2));

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("All tables:", tables.map(t => t.name).join(", "));

db.close();
