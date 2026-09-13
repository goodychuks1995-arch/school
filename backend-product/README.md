# Subscription Content Backend

Backend API for selling lesson notes / articles / PDFs as **one-time
purchases per item** (not a subscription). Stack: Node.js + Express +
PostgreSQL. Payments: Paystack.

## Project structure

```
src/
  config/db.js              PostgreSQL connection pool
  db/schema.sql              All table definitions
  db/migrate.js               Runs schema.sql against your database
  models/                     Query functions per table (users, articles, payments, purchases)
  middleware/
    requireAuth.js             JWT auth guard
    requireAdminKey.js          Shared-secret guard for admin routes
    errorHandler.js             Centralized error handler
  routes/
    authRoutes.js                signup / login / me
    articleRoutes.js             public catalog + admin create
    paymentRoutes.js             Paystack initialize + verify
    purchaseRoutes.js            "my purchases" list
    downloadRoutes.js            ownership-gated file download
  utils/paystack.js            Paystack API client
  server.js                    App entrypoint (webhook lives here — needs the raw body)
```

## Database schema

- **users** — accounts (name, email, password_hash, role)
- **articles** — title, slug, description, preview_text, private file_path, price_kobo, is_premium
- **payments** — every transaction attempt, keyed by paystack_reference, tied to one article
- **purchases** — source of truth for "does this user own this article" (user_id + article_id, unique)
- **downloads** — download history per user/article

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Create a PostgreSQL database, then copy `.env.example` to `.env` and fill in your values
   (DATABASE_URL, JWT_SECRET, ADMIN_KEY, PAYSTACK keys):

   ```
   cp .env.example .env
   ```

3. Run the migration to create all tables:

   ```
   npm run migrate
   ```

4. Add article files through `POST /api/articles`. Uploaded PDFs/docx files are stored in
   `backend-product/uploads` by default (`FILE_STORAGE_PATH=./uploads`). The frontend
   reads the article metadata after login and receives the protected file through the
   authenticated download route after purchase.

5. Start the server:

   ```
   npm run dev
   ```

6. Confirm it's working:
   ```
   curl http://localhost:5000/api/health
   ```

## API Reference

### Auth

| Method | Route            | Auth | Description            |
| ------ | ---------------- | ---- | ---------------------- |
| POST   | /api/auth/signup | —    | Create an account      |
| POST   | /api/auth/login  | —    | Log in, get a JWT      |
| GET    | /api/auth/me     | JWT  | Get the logged-in user |

### Articles

| Method | Route               | Auth      | Description                                                  |
| ------ | ------------------- | --------- | ------------------------------------------------------------ |
| GET    | /api/articles       | —         | List published articles                                      |
| GET    | /api/articles/:slug | —         | Get one article's metadata (no file_path)                    |
| POST   | /api/articles       | admin key | Create an article and upload its file (`x-admin-key` header) |

Create an article with `multipart/form-data` fields `title`, `slug`, `description`,
`previewText`, and a file field named `file`. Class articles are currently free,
so the backend automatically saves them with price `0` and `is_premium=false`:

```bash
curl -X POST http://localhost:5000/api/articles \
   -H "x-admin-key: YOUR_ADMIN_KEY" \
   -F "title=Biology Notes" \
   -F "slug=biology-notes" \
   -F "description=Revision notes" \
   -F "previewText=An excerpt" \
   -F "file=@./biology-notes.pdf"
```

Uploaded files are stored privately under `FILE_STORAGE_PATH` (default: `./uploads`).
The maximum upload size defaults to 25 MB and can be changed with
`MAX_ARTICLE_FILE_SIZE` in bytes. Existing JSON requests may still provide `filePath`.

### Payments (per-item, one-time)

| Method | Route                           | Auth | Description                                          |
| ------ | ------------------------------- | ---- | ---------------------------------------------------- |
| POST   | /api/payments/initialize        | JWT  | Start checkout for one article, returns Paystack URL |
| POST   | /api/payments/webhook           | —    | Paystack calls this on `charge.success`              |
| GET    | /api/payments/verify/:reference | JWT  | Manual fallback check right after redirect           |

### Purchases & Downloads

| Method | Route                     | Auth | Description                                   |
| ------ | ------------------------- | ---- | --------------------------------------------- |
| GET    | /api/purchases            | JWT  | List everything the user has bought           |
| GET    | /api/downloads/:articleId | JWT  | Download an owned file (403 if not purchased) |

## How a purchase flows end-to-end

1. Frontend calls `POST /api/payments/initialize` with `{ articleId }`.
2. Backend creates a `pending` row in `payments`, calls Paystack, returns `authorization_url`.
3. Frontend redirects the user there to pay.
4. Paystack redirects back to `FRONTEND_URL/payment/callback?reference=...` and
   (usually within seconds) calls `POST /api/payments/webhook`.
5. The webhook verifies the signature, marks the payment `success`, and inserts a row
   into `purchases` — that's what unlocks the download.
6. The callback page can call `GET /api/payments/verify/:reference` as a fallback in
   case it loads before the webhook lands.
7. From then on, `GET /api/downloads/:articleId` succeeds for that user.

## Notes

- `POST /api/articles` is protected by a single shared `ADMIN_KEY` header for now —
  fine while it's just you managing the catalog.
- Articles with `is_premium = false` skip the purchase check entirely in the download
  route, so you can offer some items free if you want.
- The old `plans`/`subscriptions` tables from the earlier subscription-based design
  have been dropped — this schema is entirely per-item ownership via `purchases`.

## Still to do

- React frontend (catalog, checkout button, "my purchases" page)
