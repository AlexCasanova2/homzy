import { all } from "../db.js";

export async function getRelatedProducts({ categoryId, excludeId, limit = 3 }) {
  if (!categoryId) return [];
  return all(
    `SELECT id, asin, title, price, rating, reviews, url, category_id
     FROM products
     WHERE category_id = $1 AND id != $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [categoryId, excludeId || "", limit]
  );
}
