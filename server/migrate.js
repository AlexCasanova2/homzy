import "dotenv/config";
import { createDb, resolveDbPath } from "./src/db.js";

console.log(`Checking database migrations at ${resolveDbPath()}...`);

try {
    const db = createDb();
    db.close();
    console.log("Migration completed successfully.");
} catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
}
