-- Migration 003: Add cache table for external Chess.com API responses

CREATE TABLE IF NOT EXISTS chess_api_cache (
  cache_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  cached_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chess_api_cache_cached_at
ON chess_api_cache(cached_at);