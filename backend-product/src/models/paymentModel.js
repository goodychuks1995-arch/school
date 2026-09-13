const db = require('../config/db');

async function createPayment({ userId, articleId, amountKobo, currency = 'NGN', paystackReference, status = 'pending' }) {
  const result = await db.query(
    `INSERT INTO payments (user_id, article_id, amount_kobo, currency, paystack_reference, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, articleId, amountKobo, currency, paystackReference, status]
  );
  return result.rows[0];
}

async function findPaymentByReference(paystackReference) {
  const result = await db.query('SELECT * FROM payments WHERE paystack_reference = $1', [paystackReference]);
  return result.rows[0] || null;
}

async function updatePaymentStatus(paystackReference, status) {
  const result = await db.query(
    `UPDATE payments SET status = $2 WHERE paystack_reference = $1 RETURNING *`,
    [paystackReference, status]
  );
  return result.rows[0] || null;
}

module.exports = { createPayment, findPaymentByReference, updatePaymentStatus };
