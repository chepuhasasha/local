CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS addresses (
  id text PRIMARY KEY,
  x double precision,
  y double precision,
  display_ko text,
  display_en text,
  search_ko text,
  search_en text,
  road_ko_region1 text,
  road_ko_region2 text,
  road_ko_region3 text,
  road_ko_road_name text,
  road_ko_building_no text,
  road_ko_is_underground boolean,
  road_ko_full text,
  road_en_region1 text,
  road_en_region2 text,
  road_en_region3 text,
  road_en_road_name text,
  road_en_building_no text,
  road_en_is_underground boolean,
  road_en_full text,
  road_code text,
  road_local_area_serial text,
  road_postal_code text,
  road_building_name_ko text,
  parcel_ko_region1 text,
  parcel_ko_region2 text,
  parcel_ko_region3 text,
  parcel_ko_region4 text,
  parcel_ko_is_mountain_lot boolean,
  parcel_ko_main_no text,
  parcel_ko_sub_no text,
  parcel_ko_parcel_no text,
  parcel_ko_full text,
  parcel_en_region1 text,
  parcel_en_region2 text,
  parcel_en_region3 text,
  parcel_en_region4 text,
  parcel_en_is_mountain_lot boolean,
  parcel_en_main_no text,
  parcel_en_sub_no text,
  parcel_en_parcel_no text,
  parcel_en_full text,
  parcel_legal_area_code text
);

CREATE INDEX IF NOT EXISTS addresses_search_ko_idx
  ON addresses USING gin (search_ko gin_trgm_ops);

CREATE INDEX IF NOT EXISTS addresses_search_en_idx
  ON addresses USING gin (search_en gin_trgm_ops);
