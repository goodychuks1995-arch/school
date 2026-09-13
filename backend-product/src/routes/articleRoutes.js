const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const { getAllArticles, getArticleBySlug, createArticle } = require('../models/articleModel');
const requireAdminKey = require('../middleware/requireAdminKey');

const storageRoot = path.resolve(process.env.FILE_STORAGE_PATH || './uploads');
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      fs.mkdirSync(storageRoot, { recursive: true });
      callback(null, storageRoot);
    },
    filename: (req, file, callback) => {
      callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: {
    fileSize: Number(process.env.MAX_ARTICLE_FILE_SIZE || 25 * 1024 * 1024),
  },
});

// GET /api/articles — public list (title, description, preview only)
router.get('/', async (req, res, next) => {
  try {
    const articles = await getAllArticles();
    res.json(articles);
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/:slug — single article metadata
// (actual file download lives at GET /api/downloads/:articleId, gated on ownership)
router.get('/:slug', async (req, res, next) => {
  try {
    const article = await getArticleBySlug(req.params.slug);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    // Don't leak the private file_path — that's only ever resolved server-side in the download route
    const { file_path, ...safeArticle } = article;
    res.json(safeArticle);
  } catch (err) {
    next(err);
  }
});

// POST /api/articles — admin-only, guarded by the x-admin-key header
router.post('/', requireAdminKey, upload.single('file'), async (req, res, next) => {
  let uploadedFilePath;
  try {
    const { title, slug, description, previewText, filePath } = req.body;
    uploadedFilePath = req.file
      ? path.relative(storageRoot, req.file.path).replace(/\\/g, '/')
      : filePath;

    if (!title || !slug || !uploadedFilePath) {
      const err = new Error('title, slug, and file are required');
      err.status = 400;
      throw err;
    }

    const article = await createArticle({
      title,
      slug,
      description,
      previewText,
      filePath: uploadedFilePath,
      priceKobo: 0,
      isPremium: false,
    });
    res.status(201).json(article);
  } catch (err) {
    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    next(err);
  }
});

module.exports = router;
