const express = require('express');
const path = require('path');
const router = express.Router();

const requireAuth = require('../middleware/requireAuth');
const db = require('../config/db');
const { getArticleById } = require('../models/articleModel');
const { findPurchase } = require('../models/purchaseModel');

// GET /api/downloads/:articleId — serves the file only if the user owns it
router.get('/:articleId', requireAuth, async (req, res, next) => {
  try {
    const { articleId } = req.params;

    const article = await getArticleById(articleId);
    if (!article) {
      const err = new Error('Article not found');
      err.status = 404;
      throw err;
    }

    // Free articles skip the ownership check; premium ones require a purchase
    if (article.is_premium) {
      const owns = await findPurchase(req.user.id, articleId);
      if (!owns) {
        const err = new Error('You have not purchased this item');
        err.status = 403;
        throw err;
      }
    }

    await db.query('INSERT INTO downloads (user_id, article_id) VALUES ($1, $2)', [req.user.id, articleId]);

    const filePath = path.resolve(process.env.FILE_STORAGE_PATH || './uploads', article.file_path);
    res.download(filePath, `${article.title}${path.extname(article.file_path)}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
