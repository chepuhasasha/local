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
    const base = index * 6;
    values.push(
      doc.id,
      doc.display?.ko ?? null,
      doc.display?.en ?? null,
      doc.search?.ko ?? null,
      doc.search?.en ?? null,
      JSON.stringify(doc),
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
  });

  const sql = `
    INSERT INTO addresses (
      id,
      display_ko,
      display_en,
      search_ko,
      search_en,
      payload
    )
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (id) DO UPDATE SET
      display_ko = EXCLUDED.display_ko,
      display_en = EXCLUDED.display_en,
      search_ko = EXCLUDED.search_ko,
      search_en = EXCLUDED.search_en,
      payload = EXCLUDED.payload
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
