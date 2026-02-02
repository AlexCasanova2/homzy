export function getRelatedProducts(db, { categoryId, excludeId, limit = 3 }) {
  if (!categoryId) return [];
  const stmt = db.prepare(
    `SELECT id, title, price, rating, reviews, url
     FROM products
     WHERE category_id = ? AND id != ?
     ORDER BY created_at DESC
     LIMIT ?`
  );
  return stmt.all(categoryId, excludeId || "", limit);
}
