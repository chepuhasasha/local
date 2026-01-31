const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DEFAULT_BATCH_SIZE = 1000;

/**
 * Читает аргументы командной строки и возвращает папку с чанками.
 * @returns {string}
 */
function getInputDir() {
  const raw = process.argv[2];
  return raw ? path.resolve(raw) : path.resolve("out");
}

/**
 * Читает аргументы командной строки и возвращает размер пакета вставки.
 * @returns {number}
 */
function getBatchSize() {
  const raw = Number(process.argv[3]);
  if (Number.isFinite(raw) && raw > 0) {
    return Math.trunc(raw);
  }
  return DEFAULT_BATCH_SIZE;
}

/**
 * Создаёт пул подключений Postgres из переменных окружения.
 * @returns {Pool}
 */
function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : undefined,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });
}

/**
 * Загружает JSON файл и возвращает список документов.
 * @param {string} filePath
 * @returns {Array<object>}
 */
function loadDocuments(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const payload = JSON.parse(raw);
  if (!payload || !Array.isArray(payload.documents)) {
    return [];
  }
  return payload.documents;
}

/**
 * Вставляет документы в базу данных.
 * @param {Pool} pool
 * @param {Array<object>} documents
 * @returns {Promise<void>}
 */
async function insertDocuments(pool, documents) {
  if (documents.length === 0) {
    return;
  }

  const values = [];
  const placeholders = documents.map((doc, index) => {
    const base = index * 44;
    values.push(
      doc.id,
      doc.x ?? null,
      doc.y ?? null,
      doc.display?.ko ?? null,
      doc.display?.en ?? null,
      doc.search?.ko ?? null,
      doc.search?.en ?? null,
      doc.road?.ko?.region1 ?? null,
      doc.road?.ko?.region2 ?? null,
      doc.road?.ko?.region3 ?? null,
      doc.road?.ko?.roadName ?? null,
      doc.road?.ko?.buildingNo ?? null,
      doc.road?.ko?.isUnderground ?? null,
      doc.road?.ko?.full ?? null,
      doc.road?.en?.region1 ?? null,
      doc.road?.en?.region2 ?? null,
      doc.road?.en?.region3 ?? null,
      doc.road?.en?.roadName ?? null,
      doc.road?.en?.buildingNo ?? null,
      doc.road?.en?.isUnderground ?? null,
      doc.road?.en?.full ?? null,
      doc.road?.codes?.roadCode ?? null,
      doc.road?.codes?.localAreaSerial ?? null,
      doc.road?.codes?.postalCode ?? null,
      doc.road?.building?.nameKo ?? null,
      doc.parcel?.ko?.region1 ?? null,
      doc.parcel?.ko?.region2 ?? null,
      doc.parcel?.ko?.region3 ?? null,
      doc.parcel?.ko?.region4 ?? null,
      doc.parcel?.ko?.isMountainLot ?? null,
      doc.parcel?.ko?.mainNo ?? null,
      doc.parcel?.ko?.subNo ?? null,
      doc.parcel?.ko?.parcelNo ?? null,
      doc.parcel?.ko?.full ?? null,
      doc.parcel?.en?.region1 ?? null,
      doc.parcel?.en?.region2 ?? null,
      doc.parcel?.en?.region3 ?? null,
      doc.parcel?.en?.region4 ?? null,
      doc.parcel?.en?.isMountainLot ?? null,
      doc.parcel?.en?.mainNo ?? null,
      doc.parcel?.en?.subNo ?? null,
      doc.parcel?.en?.parcelNo ?? null,
      doc.parcel?.en?.full ?? null,
      doc.parcel?.codes?.legalAreaCode ?? null,
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17}, $${base + 18}, $${base + 19}, $${base + 20}, $${base + 21}, $${base + 22}, $${base + 23}, $${base + 24}, $${base + 25}, $${base + 26}, $${base + 27}, $${base + 28}, $${base + 29}, $${base + 30}, $${base + 31}, $${base + 32}, $${base + 33}, $${base + 34}, $${base + 35}, $${base + 36}, $${base + 37}, $${base + 38}, $${base + 39}, $${base + 40}, $${base + 41}, $${base + 42}, $${base + 43}, $${base + 44})`;
  });

  const sql = `
    INSERT INTO addresses (
      id,
      x,
      y,
      display_ko,
      display_en,
      search_ko,
      search_en,
      road_ko_region1,
      road_ko_region2,
      road_ko_region3,
      road_ko_road_name,
      road_ko_building_no,
      road_ko_is_underground,
      road_ko_full,
      road_en_region1,
      road_en_region2,
      road_en_region3,
      road_en_road_name,
      road_en_building_no,
      road_en_is_underground,
      road_en_full,
      road_code,
      road_local_area_serial,
      road_postal_code,
      road_building_name_ko,
      parcel_ko_region1,
      parcel_ko_region2,
      parcel_ko_region3,
      parcel_ko_region4,
      parcel_ko_is_mountain_lot,
      parcel_ko_main_no,
      parcel_ko_sub_no,
      parcel_ko_parcel_no,
      parcel_ko_full,
      parcel_en_region1,
      parcel_en_region2,
      parcel_en_region3,
      parcel_en_region4,
      parcel_en_is_mountain_lot,
      parcel_en_main_no,
      parcel_en_sub_no,
      parcel_en_parcel_no,
      parcel_en_full,
      parcel_legal_area_code
    )
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (id) DO UPDATE SET
      x = EXCLUDED.x,
      y = EXCLUDED.y,
      display_ko = EXCLUDED.display_ko,
      display_en = EXCLUDED.display_en,
      search_ko = EXCLUDED.search_ko,
      search_en = EXCLUDED.search_en,
      road_ko_region1 = EXCLUDED.road_ko_region1,
      road_ko_region2 = EXCLUDED.road_ko_region2,
      road_ko_region3 = EXCLUDED.road_ko_region3,
      road_ko_road_name = EXCLUDED.road_ko_road_name,
      road_ko_building_no = EXCLUDED.road_ko_building_no,
      road_ko_is_underground = EXCLUDED.road_ko_is_underground,
      road_ko_full = EXCLUDED.road_ko_full,
      road_en_region1 = EXCLUDED.road_en_region1,
      road_en_region2 = EXCLUDED.road_en_region2,
      road_en_region3 = EXCLUDED.road_en_region3,
      road_en_road_name = EXCLUDED.road_en_road_name,
      road_en_building_no = EXCLUDED.road_en_building_no,
      road_en_is_underground = EXCLUDED.road_en_is_underground,
      road_en_full = EXCLUDED.road_en_full,
      road_code = EXCLUDED.road_code,
      road_local_area_serial = EXCLUDED.road_local_area_serial,
      road_postal_code = EXCLUDED.road_postal_code,
      road_building_name_ko = EXCLUDED.road_building_name_ko,
      parcel_ko_region1 = EXCLUDED.parcel_ko_region1,
      parcel_ko_region2 = EXCLUDED.parcel_ko_region2,
      parcel_ko_region3 = EXCLUDED.parcel_ko_region3,
      parcel_ko_region4 = EXCLUDED.parcel_ko_region4,
      parcel_ko_is_mountain_lot = EXCLUDED.parcel_ko_is_mountain_lot,
      parcel_ko_main_no = EXCLUDED.parcel_ko_main_no,
      parcel_ko_sub_no = EXCLUDED.parcel_ko_sub_no,
      parcel_ko_parcel_no = EXCLUDED.parcel_ko_parcel_no,
      parcel_ko_full = EXCLUDED.parcel_ko_full,
      parcel_en_region1 = EXCLUDED.parcel_en_region1,
      parcel_en_region2 = EXCLUDED.parcel_en_region2,
      parcel_en_region3 = EXCLUDED.parcel_en_region3,
      parcel_en_region4 = EXCLUDED.parcel_en_region4,
      parcel_en_is_mountain_lot = EXCLUDED.parcel_en_is_mountain_lot,
      parcel_en_main_no = EXCLUDED.parcel_en_main_no,
      parcel_en_sub_no = EXCLUDED.parcel_en_sub_no,
      parcel_en_parcel_no = EXCLUDED.parcel_en_parcel_no,
      parcel_en_full = EXCLUDED.parcel_en_full,
      parcel_legal_area_code = EXCLUDED.parcel_legal_area_code
  `;

  await pool.query(sql, values);
}

/**
 * Разбивает массив документов на пакеты.
 * @param {Array<object>} documents
 * @param {number} batchSize
 * @returns {Array<Array<object>>}
 */
function splitIntoBatches(documents, batchSize) {
  const batches = [];
  for (let i = 0; i < documents.length; i += batchSize) {
    batches.push(documents.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Загружает все чанки из папки и пишет их в Postgres.
 * @param {string} dir
 * @param {number} batchSize
 * @returns {Promise<void>}
 */
async function loadAllChunks(dir, batchSize) {
  const pool = createPool();
  try {
    const files = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".json"))
      .sort();

    for (const file of files) {
      const filePath = path.join(dir, file);
      const documents = loadDocuments(filePath);
      const batches = splitIntoBatches(documents, batchSize);

      for (const batch of batches) {
        await insertDocuments(pool, batch);
      }

      process.stdout.write(
        `[load] ${file} docs=${documents.length} batches=${batches.length}\n`,
      );
    }
  } finally {
    await pool.end();
  }
}

/**
 * Основная точка входа для загрузки адресов.
 * @returns {Promise<void>}
 */
async function main() {
  const dir = getInputDir();
  const batchSize = getBatchSize();
  await loadAllChunks(dir, batchSize);
}

main().catch((error) => {
  process.stderr.write(`${error?.message || error}\n`);
  process.exit(1);
});
