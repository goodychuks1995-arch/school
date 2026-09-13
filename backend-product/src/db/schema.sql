-- ============================================================
-- Subscription Content Platform — Database Schema
-- (Updated: per-item purchases, not a subscription gate)
-- ============================================================

-- The old plans/subscriptions tables were built for a subscription model
-- that's no longer in use. Safe to drop since nothing was ever wired up
-- to write real rows into them (auth/payments weren't built yet).
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plans CASCADE;

-- Users: platform accounts
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(120)        NOT NULL,
    email           VARCHAR(180) UNIQUE NOT NULL,
    password_hash   VARCHAR(255)        NOT NULL,
    role            VARCHAR(20)         NOT NULL DEFAULT 'subscriber', -- 'subscriber' | 'admin'
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Articles: metadata for each lesson note / article / PDF
CREATE TABLE IF NOT EXISTS articles (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(200)  NOT NULL,
    slug            VARCHAR(220)  UNIQUE NOT NULL,
    description     TEXT,
    preview_text    TEXT,                     -- free excerpt shown before purchase
    file_path       VARCHAR(500)  NOT NULL,   -- private storage path, never public URL
    price_kobo      INTEGER       NOT NULL DEFAULT 0,  -- amount in kobo (NGN * 100)
    is_premium      BOOLEAN       NOT NULL DEFAULT FALSE, -- true = must be purchased; false = free
    published       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Payments: a record of every Paystack transaction attempt (one per article purchase)
CREATE TABLE IF NOT EXISTS payments (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id          INTEGER NOT NULL REFERENCES articles(id),
    amount_kobo         INTEGER NOT NULL,
    currency            VARCHAR(10) NOT NULL DEFAULT 'NGN',
    paystack_reference  VARCHAR(150) UNIQUE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|success|failed
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchases: source of truth for "does this user own this article"
CREATE TABLE IF NOT EXISTS purchases (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id      INTEGER NOT NULL REFERENCES articles(id),
    payment_id      INTEGER REFERENCES payments(id),
    purchased_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- Downloads: history of what a user has downloaded
CREATE TABLE IF NOT EXISTS downloads (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id      INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    downloaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
