-- Tavily API key pool stored in Cloudflare D1 (SQLite).
-- Migrating from KV avoids the KV free-plan operation quotas, especially the
-- per-request list() that the KV version ran on every key-pool pick.

CREATE TABLE IF NOT EXISTS keys (
  api_key            TEXT    NOT NULL PRIMARY KEY,
  status             TEXT    NOT NULL DEFAULT 'active',  -- 'active' | 'exhausted'
  last_used_at       INTEGER NOT NULL DEFAULT 0,          -- unix seconds; LRU ordering key
  status_changed_at  INTEGER NOT NULL DEFAULT 0,          -- basis for monthly reset
  cooldown_until     INTEGER NOT NULL DEFAULT 0,          -- 429 Retry-After window
  added_at           INTEGER NOT NULL DEFAULT 0,
  note               TEXT    NOT NULL DEFAULT '',
  credit_limit       REAL    NOT NULL DEFAULT 0,
  credit_remaining   REAL    NOT NULL DEFAULT 0,
  credit_synced_at   INTEGER NOT NULL DEFAULT 0
);

-- Hot-path lookup: pick the least-recently-used active, non-cooled key.
CREATE INDEX IF NOT EXISTS idx_keys_pick
  ON keys (status, cooldown_until, last_used_at);