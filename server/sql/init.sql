-- Schema initialization for lost-n-found
-- Creates users, items, claims tables and useful indexes

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  item_name TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  date INTEGER NOT NULL,
  contact_info TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'resolved')),
  image_url TEXT,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  item_id TEXT NOT NULL REFERENCES items(id),
  claimer_id TEXT NOT NULL REFERENCES users(id),
  evidence_text TEXT NOT NULL,
  evidence_image_url TEXT,
  ai_score REAL,
  text_similarity REAL,
  image_similarity REAL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'manual_review')),
  reason TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_item_id ON claims(item_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimer_id ON claims(claimer_id);
