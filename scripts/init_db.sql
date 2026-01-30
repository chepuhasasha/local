CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS addresses (
  id text PRIMARY KEY,
  display_ko text,
  display_en text,
  search_ko text,
  search_en text,
  payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS addresses_search_ko_idx
  ON addresses USING gin (search_ko gin_trgm_ops);

CREATE INDEX IF NOT EXISTS addresses_search_en_idx
  ON addresses USING gin (search_en gin_trgm_ops);
