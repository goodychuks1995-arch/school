const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/requireAuth');
const { listPurchasesForUser } = require('../models/purchaseModel');

// GET /api/purchases — everything the current user has bought
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const purchases = await listPurchasesForUser(req.user.id);
    res.json(purchases);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
