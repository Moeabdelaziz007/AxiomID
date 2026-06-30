-- iqra-core/schema.sql
-- Truth verses storage for D1 + Vectorize RAG pipeline

CREATE TABLE IF NOT EXISTS truth_surahs (
  id INTEGER PRIMARY KEY,          -- Surah number (1-114)
  name_ar TEXT NOT NULL,           -- Arabic name
  name_en TEXT NOT NULL,           -- English name
  ayat_count INTEGER NOT NULL,     -- Number of verses
  revelation_type TEXT NOT NULL    -- 'meccan' or 'medinan'
);

CREATE TABLE IF NOT EXISTS truth_verses (
  id INTEGER PRIMARY KEY,          -- Global verse ID
  surah_id INTEGER NOT NULL,       -- Surah number
  verse_number INTEGER NOT NULL,   -- Verse number within surah
  text_ar TEXT NOT NULL,           -- Arabic text
  text_en TEXT NOT NULL,           -- English translation
  juz INTEGER,                     -- Juz number (1-30)
  page INTEGER,                    -- Mushaf page number
  embedding_id TEXT,               -- Vectorize vector ID (for lookup)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (surah_id) REFERENCES truth_surahs(id),
  UNIQUE(surah_id, verse_number)
);

-- Index for fast surah/verse lookup
CREATE INDEX IF NOT EXISTS idx_verses_surah ON truth_verses(surah_id);
CREATE INDEX IF NOT EXISTS idx_verses_juz ON truth_verses(juz);

-- Daily ayah rotation
CREATE TABLE IF NOT EXISTS daily_ayah (
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
