const db = require('../config/db');

async function createPurchase({ userId, articleId, paymentId }) {
  const result = await db.query(
    `INSERT INTO purchases (user_id, article_id, payment_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, article_id) DO NOTHING
     RETURNING *`,
    [userId, articleId, paymentId]
  );
  return result.rows[0] || null;
}

async function findPurchase(userId, articleId) {
  const result = await db.query(
    'SELECT * FROM purchases WHERE user_id = $1 AND article_id = $2',
    [userId, articleId]
  );
  return result.rows[0] || null;
}

async function listPurchasesForUser(userId) {
  const result = await db.query(
    `SELECT p.id AS purchase_id, a.id AS article_id, a.title, a.slug, a.price_kobo, p.purchased_at
     FROM purchases p
     JOIN articles a ON a.id = p.article_id
     WHERE p.user_id = $1
     ORDER BY p.purchased_at DESC`,
    [userId]
  );
  return result.rows;
}

module.exports = { createPurchase, findPurchase, listPurchasesForUser };
