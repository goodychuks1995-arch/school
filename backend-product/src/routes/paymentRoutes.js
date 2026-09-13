const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const requireAuth = require('../middleware/requireAuth');
const paystackApi = require('../utils/paystack');
const { getArticleById } = require('../models/articleModel');
const { createPayment, findPaymentByReference, updatePaymentStatus } = require('../models/paymentModel');
const { createPurchase, findPurchase } = require('../models/purchaseModel');

// POST /api/payments/initialize — start checkout for one article
router.post('/initialize', requireAuth, async (req, res, next) => {
  try {
    const { articleId } = req.body;
    if (!articleId) {
      const err = new Error('articleId is required');
      err.status = 400;
      throw err;
    }

    const article = await getArticleById(articleId);
    if (!article) {
      const err = new Error('Article not found');
      err.status = 404;
      throw err;
    }

    const alreadyOwned = await findPurchase(req.user.id, articleId);
    if (alreadyOwned) {
      const err = new Error('You already own this item');
      err.status = 409;
      throw err;
    }

    const reference = `pn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    await createPayment({
      userId: req.user.id,
      articleId,
      amountKobo: article.price_kobo,
      paystackReference: reference,
    });

    const paystackRes = await paystackApi.post('/transaction/initialize', {
      email: req.user.email,
      amount: article.price_kobo,
      reference,
      metadata: { user_id: req.user.id, article_id: articleId },
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
    });

    res.json({
      authorization_url: paystackRes.data.data.authorization_url,
      reference,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/verify/:reference — fallback check for right after the redirect,
// in case the webhook hasn't landed yet
router.get('/verify/:reference', requireAuth, async (req, res, next) => {
  try {
    const paystackRes = await paystackApi.get(`/transaction/verify/${req.params.reference}`);
    const { status, reference } = paystackRes.data.data;

    if (status === 'success') {
      const payment = await findPaymentByReference(reference);
      if (payment && payment.status !== 'success') {
        await updatePaymentStatus(reference, 'success');
        await createPurchase({ userId: payment.user_id, articleId: payment.article_id, paymentId: payment.id });
      }
    }

    res.json({ status });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
