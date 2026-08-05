-- PAI-DRV D1 Schema — Google Drive clone metadata
-- Run: npx wrangler d1 execute pai-drv --file=schema.sql

CREATE TABLE IF NOT EXISTS files (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  folder_id    TEXT,
  size         INTEGER NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  owner_did    TEXT NOT NULL,
  r2_key       TEXT NOT NULL,
  share_token  TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS folders (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  parent_id  TEXT,
  owner_did  TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  did        TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_files_owner ON files(owner_did);
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_share ON files(share_token);
CREATE INDEX IF NOT EXISTS idx_folders_owner ON folders(owner_did);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
