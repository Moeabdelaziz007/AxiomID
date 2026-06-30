-- iqra-core/schema.sql
-- Truth verses storage for D1 + Vectorize RAG pipeline

CREATE TABLE IF NOT EXISTS truth_chapters (
  id INTEGER PRIMARY KEY,          -- Chapter number (1-114)
  name_ar TEXT NOT NULL,           -- Arabic name
  name_en TEXT NOT NULL,           -- English name
  ayat_count INTEGER NOT NULL,     -- Number of verses
  revelation_type TEXT NOT NULL    -- 'meccan' or 'medinan'
);

CREATE TABLE IF NOT EXISTS truth_verses (
  id INTEGER PRIMARY KEY,          -- Global verse ID
  chapter_id INTEGER NOT NULL,     -- Chapter number
  verse_number INTEGER NOT NULL,   -- Verse number within chapter
  text_ar TEXT NOT NULL,           -- Arabic text
  text_en TEXT NOT NULL,           -- English translation
  section INTEGER,                 -- Section number
  page INTEGER,                    -- Mushaf page number
  embedding_id TEXT,               -- Vectorize vector ID (for lookup)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chapter_id) REFERENCES truth_chapters(id),
  UNIQUE(chapter_id, verse_number)
);

-- Index for fast chapter/verse lookup
CREATE INDEX IF NOT EXISTS idx_verses_chapter ON truth_verses(chapter_id);
CREATE INDEX IF NOT EXISTS idx_verses_section ON truth_verses(section);

-- Daily truth rotation
CREATE TABLE IF NOT EXISTS daily_truth (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id INTEGER NOT NULL,
  date TEXT NOT NULL UNIQUE,       -- YYYY-MM-DD
  featured_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (verse_id) REFERENCES truth_verses(id)
);

-- RAG query cache (mirrors KV but persisted)
CREATE TABLE IF NOT EXISTS rag_cache (
  query_hash TEXT PRIMARY KEY,     -- SHA-256 of normalized query
  answer_ar TEXT,
  answer_en TEXT,
  verse_ids TEXT,                  -- JSON array of matched verse IDs
  confidence REAL,
  source TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL         -- TTL: 1 hour from creation
);
