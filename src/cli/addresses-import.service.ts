import * as fs from 'node:fs';
import * as os from 'node:os';
import * as http from 'node:http';
import * as https from 'node:https';
import * as path from 'node:path';
import { TextDecoder } from 'node:util';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';
import * as unzipper from 'unzipper';

import type { AppConfig } from '@/config/configuration';
import type { AddressSearchResult } from '@/modules/addresses/types/addresses.types';
import { AppLoggerService } from '@/infrastructure/observability/logger.service';

type Defaults = Readonly<{
  chunkSize: number;
  downloadLogEveryMs: number;
  insertLogEveryMs: number;
  commitEveryBatches: number;
  dropIndexesDuringImport: boolean;
  countLinesForPercent: boolean;
}>;

// Практичный дефолт для UNNEST-вставки: можно держать батчи крупнее.
const DEFAULTS: Defaults = {
  chunkSize: 5000,
  downloadLogEveryMs: 1500,
  insertLogEveryMs: 1500,
  commitEveryBatches: 40, // коммит раз в N батчей, чтобы транзакция не разрасталась бесконечно
  dropIndexesDuringImport: true,
  countLinesForPercent: false, // pass1 (подсчёт строк) выключен по умолчанию (ускорение)
};

type Format = Readonly<{
  includeMountainPrefixKo: boolean;
  includeUndergroundPrefixKo: boolean;
  includeMountainWordEn: boolean;
  includeUndergroundWordEn: boolean;
}>;

const FORMAT: Format = {
  includeMountainPrefixKo: true,
  includeUndergroundPrefixKo: true,
  includeMountainWordEn: true,
  includeUndergroundWordEn: false,
};

// Prefixes are stored as unicode escapes to avoid non-ascii characters in source.
const KO_MOUNTAIN_PREFIX = '\uC0B0';
const KO_UNDERGROUND_PREFIX = '\uC9C0\uD558';

const FILE_NAME_SUFFIX_ENCODED =
  '%EA%B1%B4%EB%AC%BCDB_%EC%A0%84%EC%B2%B4%EB%B6%84.zip';

type RoadIndexEntry = {
  key: string;
  value: {
    ko: {
      region1: string | null;
      region2: string | null;
      area: string | null;
      roadName: string | null;
    };
    en: {
      region1: string | null;
      region2: string | null;
      area: string | null;
      roadName: string | null;
    };
  };
};

type ZipEntry = {
  path: string;
  type: 'File' | 'Directory';
  stream: () => NodeJS.ReadableStream;
};

type ZipDirectory = {
  files: ZipEntry[];
};

type ImportState = Readonly<{
  month: string;
  status: string | null;
  finishedAt: Date | null;
  expectedCount: number | null;
}>;

type ImportMode = 'upsert' | 'replace';

type ColDef = Readonly<{
  name: string;
  pgArray: string; // например 'text[]', 'float8[]', 'boolean[]'
  pick: (d: AddressSearchResult) => string | number | boolean | null;
}>;

const TABLE_NAMES = {
  current: 'addresses',
  next: 'addresses_next',
  prev: 'addresses_prev',
} as const;

type AddressesTableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES];

@Injectable()
export class AddressesImportService {
  private static readonly INSERT_COLS_PER_ROW = 44;
  private static readonly IMPORT_LOCK_KEY = 9127341;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(AddressesImportService.name);
  }

  /**
   * Запускает импорт адресов по текущему месяцу, используя advisory lock.
   */
  async runImport(): Promise<void> {
    const month = this.getMonthFromEnv();
    const lockRunner = this.dataSource.createQueryRunner();
    await lockRunner.connect();

    let hasLock = false;

    try {
      hasLock = await this.tryAcquireImportLock(lockRunner);
      if (!hasLock) {
        this.logger.log('[import] advisory lock not acquired -> skip');
        return;
      }

      await this.ensureSchema();

      const state = await this.getImportState(month);
      if (state?.status === 'completed') {
        this.logger.log(
          `[import] import completed for ${month} -> loader skipped`,
        );
        return;
      }

      await this.loadAddresses(month);
    } finally {
      if (hasLock) {
        await this.releaseImportLock(lockRunner);
      }
      await lockRunner.release();
    }
  }

  /**
   * Получает режим импорта из переменных окружения.
   */
  private getImportModeFromEnv(): ImportMode {
    const config = this.getAddressesImportConfig();
    const raw = config?.mode ?? 'upsert';
    return raw === 'replace' ? 'replace' : 'upsert';
  }

  /**
   * Возвращает значения параметров импорта из переменных окружения.
   */
  private getDefaultsFromEnv(): Defaults {
    const config = this.getAddressesImportConfig();
    const asInt = (v: number | null | undefined, fallback: number) => {
      const n = v ?? NaN;
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
    };

    const asBool = (v: boolean | null | undefined, fallback: boolean) => {
      return typeof v === 'boolean' ? v : fallback;
    };

    return {
      chunkSize: asInt(config?.chunkSize, DEFAULTS.chunkSize),
      downloadLogEveryMs: asInt(
        config?.downloadLogEveryMs,
        DEFAULTS.downloadLogEveryMs,
      ),
      insertLogEveryMs: asInt(
        config?.insertLogEveryMs,
        DEFAULTS.insertLogEveryMs,
      ),
      commitEveryBatches: asInt(
        config?.commitEveryBatches,
        DEFAULTS.commitEveryBatches,
      ),
      dropIndexesDuringImport: asBool(
        config?.dropIndexes,
        DEFAULTS.dropIndexesDuringImport,
      ),
      countLinesForPercent: asBool(
        config?.countLinesForPercent,
        DEFAULTS.countLinesForPercent,
      ),
    };
  }

  /**
   * Формирует SQL-описание колонок таблицы адресов.
   */
  private getAddressesColumnsSql(): string {
    return `
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
    `;
  }

  /**
   * Создаёт таблицы и расширения, необходимые для импорта адресов.
   */
  private async ensureSchema(): Promise<void> {
    await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    const columns = this.getAddressesColumnsSql();

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.current} (
        ${columns}
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.next} (
        ${columns}
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.prev} (
        ${columns}
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS address_import_state (
        month text PRIMARY KEY,
        status text,
        finished_at timestamptz,
        expected_count integer
      )
    `);
  }

  /**
   * Создаёт индексы поиска для указанной таблицы адресов.
   */
  private async ensureIndexes(tableName: AddressesTableName): Promise<void> {
    const { koIndex, enIndex } = this.getSearchIndexNames(tableName);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS ${koIndex}
      ON ${tableName} USING gin (search_ko gin_trgm_ops)
    `);

    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS ${enIndex}
      ON ${tableName} USING gin (search_en gin_trgm_ops)
    `);
  }

  /**
   * Удаляет индексы поиска для указанной таблицы адресов.
   */
  private async dropIndexes(tableName: AddressesTableName): Promise<void> {
    const { koIndex, enIndex } = this.getSearchIndexNames(tableName);
    await this.dataSource.query(`DROP INDEX IF EXISTS ${koIndex}`);
    await this.dataSource.query(`DROP INDEX IF EXISTS ${enIndex}`);
  }

  /**
   * Возвращает имена индексов поиска для указанной таблицы.
   */
  private getSearchIndexNames(tableName: AddressesTableName): {
    koIndex: string;
    enIndex: string;
  } {
    return {
      koIndex: `${tableName}_search_ko_idx`,
      enIndex: `${tableName}_search_en_idx`,
    };
  }

  /**
   * Загружает состояние импорта для конкретного месяца.
   */
  private async getImportState(month: string): Promise<ImportState | null> {
    const rawRows: unknown = await this.dataSource.query(
      `
        SELECT month, status, finished_at, expected_count
        FROM address_import_state
        WHERE month = $1
        LIMIT 1
      `,
      [month],
    );

    const rows = Array.isArray(rawRows)
      ? rawRows.flatMap(
          (
            row,
          ): Array<{
            month: string;
            status: string | null;
            finished_at: string | Date | null;
            expected_count: number | null;
          }> => {
            if (!row || typeof row !== 'object') return [];
            const record = row as Record<string, unknown>;
            const monthValue = record.month;
            if (typeof monthValue !== 'string') return [];

            const statusValue =
              typeof record.status === 'string' ? record.status : null;

            const finishedValue =
              typeof record.finished_at === 'string' ||
              record.finished_at instanceof Date
                ? record.finished_at
                : null;

            const expectedValue =
              typeof record.expected_count === 'number'
                ? record.expected_count
                : null;

            return [
              {
                month: monthValue,
                status: statusValue,
                finished_at: finishedValue,
                expected_count: expectedValue,
              },
            ];
          },
        )
      : [];

    const row = rows[0];
    if (!row) return null;

    return {
      month: row.month,
      status: row.status ?? null,
      finishedAt: row.finished_at ? new Date(row.finished_at) : null,
      expectedCount:
        typeof row.expected_count === 'number' ? row.expected_count : null,
    };
  }

  /**
   * Сохраняет состояние импорта для конкретного месяца.
   */
  private async setImportState(params: {
    month: string;
    status: string;
    finishedAt: Date | null;
    expectedCount: number | null;
  }): Promise<void> {
    await this.dataSource.query(
      `
        INSERT INTO address_import_state (month, status, finished_at, expected_count)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (month)
        DO UPDATE SET
          status = EXCLUDED.status,
          finished_at = EXCLUDED.finished_at,
          expected_count = EXCLUDED.expected_count
      `,
      [params.month, params.status, params.finishedAt, params.expectedCount],
    );
  }

  /**
   * Возвращает точное количество строк в указанной таблице адресов.
   */
  private async getAddressesCountExact(
    tableName: AddressesTableName,
  ): Promise<bigint> {
    const t0 = Date.now();

    const rawRows: unknown = await this.dataSource.query(
      `SELECT COUNT(*)::bigint AS cnt FROM ${tableName}`,
    );

    const rows: Array<{ cnt: string | number | bigint }> = Array.isArray(
      rawRows,
    )
      ? rawRows.map((row) => {
          if (row && typeof row === 'object' && 'cnt' in row) {
            const record = row as Record<string, unknown>;
            const cntValue = record.cnt;
            if (
              typeof cntValue === 'string' ||
              typeof cntValue === 'number' ||
              typeof cntValue === 'bigint'
            ) {
              return { cnt: cntValue };
            }
          }
          return { cnt: '0' };
        })
      : [];

    const cntRaw = rows[0]?.cnt ?? '0';

    let cnt: bigint;
    try {
      cnt = typeof cntRaw === 'number' ? BigInt(cntRaw) : BigInt(cntRaw);
    } catch {
      cnt = 0n;
    }

    this.logger.log(
      `[import] COUNT(*) done in ${Date.now() - t0}ms (cnt=${cnt.toString()})`,
    );
    return cnt;
  }

  /**
   * Берёт advisory lock, чтобы импорт был единственным в кластере.
   */
  private async tryAcquireImportLock(qr: QueryRunner): Promise<boolean> {
    const rawRows: unknown = await qr.query(
      `SELECT pg_try_advisory_lock($1) AS locked`,
      [AddressesImportService.IMPORT_LOCK_KEY],
    );

    const rows: Array<{ locked: boolean }> = Array.isArray(rawRows)
      ? rawRows.flatMap((row) => {
          if (!row || typeof row !== 'object') return [];
          const record = row as Record<string, unknown>;
          if (typeof record.locked !== 'boolean') return [];
          return [{ locked: record.locked }];
        })
      : [];

    return rows[0]?.locked === true;
  }

  /**
   * Освобождает advisory lock после завершения импорта.
   */
  private async releaseImportLock(qr: QueryRunner): Promise<void> {
    await qr.query(`SELECT pg_advisory_unlock($1)`, [
      AddressesImportService.IMPORT_LOCK_KEY,
    ]);
  }

  /**
   * Готовит таблицу для следующего слепка адресов.
   */
  private async prepareNextTable(): Promise<void> {
    await this.dataSource.query(`TRUNCATE TABLE ${TABLE_NAMES.next}`);
  }

  /**
   * Переключает таблицы адресов на новый слепок атомарно.
   */
  private async swapTables(): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      await qr.query(`DROP TABLE IF EXISTS ${TABLE_NAMES.prev}`);
      await qr.query(
        `ALTER TABLE ${TABLE_NAMES.current} RENAME TO ${TABLE_NAMES.prev}`,
      );
      await qr.query(
        `ALTER TABLE ${TABLE_NAMES.next} RENAME TO ${TABLE_NAMES.current}`,
      );
      await qr.query(
        `ALTER INDEX IF EXISTS ${this.getSearchIndexNames(TABLE_NAMES.current).koIndex} RENAME TO ${this.getSearchIndexNames(TABLE_NAMES.prev).koIndex}`,
      );
      await qr.query(
        `ALTER INDEX IF EXISTS ${this.getSearchIndexNames(TABLE_NAMES.current).enIndex} RENAME TO ${this.getSearchIndexNames(TABLE_NAMES.prev).enIndex}`,
      );
      await qr.query(
        `ALTER INDEX IF EXISTS ${this.getSearchIndexNames(TABLE_NAMES.next).koIndex} RENAME TO ${this.getSearchIndexNames(TABLE_NAMES.current).koIndex}`,
      );
      await qr.query(
        `ALTER INDEX IF EXISTS ${this.getSearchIndexNames(TABLE_NAMES.next).enIndex} RENAME TO ${this.getSearchIndexNames(TABLE_NAMES.current).enIndex}`,
      );
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * Выполняет полный импорт адресов в теневую таблицу и переключает её после успеха.
   */
  private async loadAddresses(month: string): Promise<void> {
    const decoder = this.createDecoder();
    if (!decoder) throw new Error('Decoder not available.');

    const defaults = this.getDefaultsFromEnv();
    const importMode = this.getImportModeFromEnv();
    const url = this.buildZipUrl(month);
    const targetTable = TABLE_NAMES.next;

    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'addr-'));
    const zipPath = path.join(tmpDir, `${month}.zip`);

    this.logger.log(`[load] month=${month}`);
    this.logger.log(`[load] temp_dir=${tmpDir}`);
    this.logger.log(
      `[load] mode=${importMode} chunk_size=${defaults.chunkSize} commit_every_batches=${defaults.commitEveryBatches}`,
    );

    let expectedCount: number | null = null;

    await this.setImportState({
      month,
      status: 'in_progress',
      finishedAt: null,
      expectedCount: null,
    });

    let qr: QueryRunner | null = null;

    try {
      await this.prepareNextTable();
      await this.downloadToFileWithProgress(
        url,
        zipPath,
        defaults.downloadLogEveryMs,
      );

      if (defaults.dropIndexesDuringImport) {
        this.logger.log('[load] dropping search indexes on shadow table...');
        await this.dropIndexes(targetTable);
      }

      // pass1 (необязательно): подсчёт строк для процента
      if (defaults.countLinesForPercent) {
        this.logger.log(
          '[load] counting total lines in build_*.txt (pass 1)...',
        );
        const tCount0 = Date.now();
        const totalLines = await this.countTotalBuildLines(zipPath);
        expectedCount = totalLines;

        await this.setImportState({
          month,
          status: 'in_progress',
          finishedAt: null,
          expectedCount,
        });

        this.logger.log(
          `[load] total_lines=${totalLines} (pass 1 in ${Date.now() - tCount0}ms)`,
        );
      }

      this.logger.log('[load] opening zip (pass 2)...');
      const zip = await this.openZip(zipPath);

      const roadEntry = this.pickRoadEntry(zip.files);
      const buildEntries = this.pickBuildEntries(zip.files);

      if (!roadEntry) throw new Error('road_code_total*.txt not found in zip.');
      if (buildEntries.length === 0)
        throw new Error('build_*.txt not found in zip.');

      this.logger.log(
        `[load] files: road=1 build=${buildEntries.length} (pass 2)`,
      );

      // Build road index (синхронный callback, без await на строку)
      const roadIndex = new Map<string, RoadIndexEntry['value']>();

      this.logger.log('[load] building road index...');
      const tRoad0 = Date.now();
      await this.forEachLineFromReadableSync(
        roadEntry.stream(),
        decoder,
        (line) => {
          const cols = line.split('|');
          if (cols.length < 5) return;

          const idx = this.indexRoadRow(cols);
          if (!idx) return;

          if (!roadIndex.has(idx.key)) roadIndex.set(idx.key, idx.value);
        },
      );
      this.logger.log(
        `[load] road index size=${roadIndex.size} (${Date.now() - tRoad0}ms)`,
      );

      // QueryRunner: одна сессия, ускоренные настройки
      qr = this.dataSource.createQueryRunner();
      await qr.connect();

      // Не ставим statement_timeout на импорт
      await qr.query(`SET statement_timeout = 0`);

      // Ускорение коммитов (по ситуации; если важнее надёжность, выключи через env и убери строку)
      await qr.query(`SET synchronous_commit = off`);

      await qr.startTransaction();

      let processed = 0;
      let inserted = 0;
      let batchCountSinceCommit = 0;

      let lastLogAt = Date.now() - defaults.insertLogEveryMs;
      const tStart = Date.now();

      const logProgress = (final = false) => {
        const now = Date.now();
        const elapsedSec = Math.max(0.001, (now - tStart) / 1000);
        const speed = (processed / elapsedSec).toFixed(0);

        const total = expectedCount ?? null;
        const pct =
          total && total > 0 ? ((processed / total) * 100).toFixed(2) : null;

        this.logger.log(
          `[load] processed=${processed}` +
            (total ? `/${total} (${pct}%)` : '') +
            ` inserted=${inserted} speed=${speed}/s` +
            (final ? ' done' : ''),
        );
      };

      const maybeLog = () => {
        const now = Date.now();
        if (now - lastLogAt >= defaults.insertLogEveryMs) {
          lastLogAt = now;
          logProgress(false);
        }
      };

      // Основной цикл по build_*.txt: await только на flush (батч) и коммиты
      for (const entry of buildEntries) {
        this.logger.log(`[load] processing ${entry.path}...`);

        const res = await this.processBuildFileBatched({
          entry,
          decoder,
          roadIndex,
          chunkSize: defaults.chunkSize,
          onBatch: async (batch) => {
            await this.insertDocuments(batch, qr!, importMode, targetTable);
            inserted += batch.length;

            batchCountSinceCommit += 1;
            if (batchCountSinceCommit >= defaults.commitEveryBatches) {
              await qr!.commitTransaction();
              await qr!.startTransaction();
              batchCountSinceCommit = 0;
            }
          },
          onLineProcessed: () => {
            processed += 1;
            maybeLog();
          },
        });

        // res.processedLines уже учтены через onLineProcessed, res возвращаем для диагностики (если надо)
        void res;
      }

      await qr.commitTransaction();

      logProgress(true);

      this.logger.log('[load] verifying exact count on shadow table...');
      const after = await this.getAddressesCountExact(targetTable);
      this.logger.log(`[load] shadow_count_after=${after.toString()}`);

      if (after <= 0n) {
        throw new Error('Shadow table is empty after import.');
      }

      this.logger.log('[load] ensuring search indexes on shadow table...');
      await this.ensureIndexes(targetTable);

      this.logger.log('[load] swapping tables...');
      await this.swapTables();

      await this.setImportState({
        month,
        status: 'completed',
        finishedAt: new Date(),
        expectedCount,
      });
    } catch (error) {
      try {
        if (qr) {
          try {
            await qr.rollbackTransaction();
          } catch {
            // ignore
          }
        }
      } finally {
        await this.setImportState({
          month,
          status: 'failed',
          finishedAt: new Date(),
          expectedCount,
        });
      }
      throw error;
    } finally {
      if (qr) {
        try {
          await qr.release();
        } catch {
          // ignore
        }
      }
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
      this.logger.log('[load] temp files removed');
    }
  }

  /**
   * Возвращает месяц выгрузки адресов (YYYYMM).
   */
  private getMonthFromEnv(): string {
    const config = this.getAddressesImportConfig();
    const raw = config?.month;
    if (raw && /^\d{6}$/.test(raw)) return raw;

    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}${m}`;
  }

  /**
   * Возвращает конфигурацию импорта адресов из ConfigService.
   */
  private getAddressesImportConfig(): AppConfig['addressesImport'] | null {
    const raw: unknown = this.configService.get('addressesImport', {
      infer: true,
    });
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    return raw as AppConfig['addressesImport'];
  }

  /**
   * Формирует URL архива с данными адресов за указанный месяц.
   */
  private buildZipUrl(monthYYYYMM: string): string {
    const year = monthYYYYMM.slice(0, 4);
    const params = new URLSearchParams({
      regYmd: year,
      reqType: 'ALLRDNM',
      ctprvnCd: '00',
      stdde: monthYYYYMM,
      fileName: `${monthYYYYMM}_${FILE_NAME_SUFFIX_ENCODED}`,
      realFileName: `${monthYYYYMM}ALLRDNM00.zip`,
      intFileNo: '0',
      intNum: '0',
      _Html5: 'true',
      _StartOffset: '0',
      _EndOffset: '149056343',
    });
    return `https://business.juso.go.kr/api/jst/download?${params.toString()}`;
  }

  /**
   * Подбирает подходящую кодировку для файлов выгрузки адресов.
   */
  private createDecoder(): TextDecoder | null {
    const encodings = ['windows-949', 'cp949', 'euc-kr', 'utf-8'] as const;
    for (const enc of encodings) {
      try {
        const dec = new TextDecoder(enc);
        dec.decode(new Uint8Array([0x41]));
        return dec;
      } catch {
        // try next
      }
    }
    return null;
  }

  /**
   * Возвращает HTTP или HTTPS клиент для указанного URL.
   */
  private getHttpLib(urlObj: URL): typeof http | typeof https {
    return urlObj.protocol === 'https:' ? https : http;
  }

  /**
   * Вычисляет процент завершённости по текущему и общему объёму.
   */
  private pct(done: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.max(0, Math.min(100, (done / total) * 100));
  }

  /**
   * Преобразует количество байтов в человекочитаемую строку.
   */
  private humanBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
    let i = 0;
    let value = bytes;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i += 1;
    }
    const normalized = i === 0 ? `${Math.round(value)}` : value.toFixed(1);
    return `${normalized} ${units[i]}`;
  }

  /**
   * Выполняет HEAD-запрос и возвращает длину содержимого.
   */
  private headContentLength(url: string, maxRedirects = 5): Promise<number> {
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const lib = this.getHttpLib(urlObj);

      const req = lib.request(
        {
          method: 'HEAD',
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          headers: { 'User-Agent': 'node', Accept: '*/*' },
        },
        (res) => {
          const code = res.statusCode ?? 0;

          if (
            code >= 300 &&
            code < 400 &&
            res.headers.location &&
            maxRedirects > 0
          ) {
            res.resume();
            const next = new URL(res.headers.location, urlObj).toString();
            resolve(this.headContentLength(next, maxRedirects - 1));
            return;
          }

          const len = Number(res.headers['content-length'] ?? 0);
          res.resume();
          resolve(Number.isFinite(len) ? len : 0);
        },
      );

      req.on('error', () => resolve(0));
      req.end();
    });
  }

  /**
   * Скачивает архив в файл и логирует прогресс.
   */
  private async downloadToFileWithProgress(
    url: string,
    destPath: string,
    logEveryMs: number,
    redirects = 5,
  ): Promise<void> {
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    const totalFromHead = await this.headContentLength(url);

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const lib = this.getHttpLib(urlObj);

      const req = lib.get(
        {
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          headers: { 'User-Agent': 'node', Accept: '*/*' },
        },
        (res) => {
          const code = res.statusCode ?? 0;

          if (
            code >= 300 &&
            code < 400 &&
            res.headers.location &&
            redirects > 0
          ) {
            res.resume();
            const next = new URL(res.headers.location, urlObj).toString();
            resolve(
              this.downloadToFileWithProgress(
                next,
                destPath,
                logEveryMs,
                redirects - 1,
              ),
            );
            return;
          }

          if (code !== 200) {
            res.resume();
            reject(new Error(`HTTP ${code}`));
            return;
          }

          const contentLen = Number(res.headers['content-length'] ?? 0);
          const total = contentLen > 0 ? contentLen : totalFromHead;

          let downloaded = 0;
          let lastLogAt = Date.now() - logEveryMs;

          this.logger.log(
            `[download] start total=${total > 0 ? this.humanBytes(total) : '?'}`,
          );

          const out = fs.createWriteStream(destPath);
          out.on('error', reject);

          res.on('data', (chunk: Buffer) => {
            downloaded += chunk.length;

            const now = Date.now();
            if (now - lastLogAt >= logEveryMs) {
              lastLogAt = now;

              const hasTotal = total > 0;
              const percent = hasTotal
                ? this.pct(downloaded, total).toFixed(1)
                : '?';
              const totalStr = hasTotal ? this.humanBytes(total) : '?';

              this.logger.log(
                `[download] ${percent}% (${this.humanBytes(downloaded)}/${totalStr})`,
              );
            }
          });

          out.on('finish', () => {
            const hasTotal = total > 0;
            const percent = hasTotal
              ? this.pct(downloaded, total).toFixed(1)
              : '?';
            const totalStr = hasTotal ? this.humanBytes(total) : '?';

            this.logger.log(
              `[download] done ${percent}% (${this.humanBytes(downloaded)}/${totalStr})`,
            );
            resolve();
          });

          res.pipe(out);
        },
      );

      req.on('error', reject);
    });
  }

  /**
   * Открывает zip-архив и возвращает список файлов.
   */
  private async openZip(zipPath: string): Promise<ZipDirectory> {
    const api = unzipper as unknown as {
      Open: { file: (p: string) => Promise<ZipDirectory> };
    };
    return api.Open.file(zipPath);
  }

  /**
   * Выбирает файл со справочником дорог внутри архива.
   */
  private pickRoadEntry(files: ZipEntry[]): ZipEntry | null {
    const candidates = files.filter((f) => {
      if (f.type !== 'File') return false;
      const base = path.basename(f.path);
      return /road_code_total/i.test(base) && /\.txt$/i.test(base);
    });

    return candidates.length > 0 ? candidates[0] : null;
  }

  /**
   * Возвращает список файлов с адресными строками, отсортированный по имени.
   */
  private pickBuildEntries(files: ZipEntry[]): ZipEntry[] {
    return files
      .filter((f) => {
        if (f.type !== 'File') return false;
        const base = path.basename(f.path);
        return base.startsWith('build_') && /\.txt$/i.test(base);
      })
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  // Быстрый проход: callback синхронный, нет await на каждую строку
  /**
   * Проходит поток построчно без await на каждой строке.
   */
  private async forEachLineFromReadableSync(
    readable: NodeJS.ReadableStream,
    decoder: TextDecoder,
    onLine: (line: string) => void,
  ): Promise<void> {
    const stream = readable as NodeJS.ReadableStream & AsyncIterable<Buffer>;
    let remainder = '';

    for await (const chunk of stream) {
      const text = decoder.decode(chunk, { stream: true });
      const data = remainder + text;
      const parts = data.split('\n');
      remainder = parts.pop() ?? '';

      for (let line of parts) {
        line = line.replace(/\r$/, '');
        if (line.length === 0) continue;
        if (line.charCodeAt(0) === 0xfeff) line = line.slice(1);
        onLine(line);
      }
    }

    const tail = decoder.decode(new Uint8Array(), { stream: false });
    const last = (remainder + tail).replace(/\r$/, '');
    if (last.length > 0) onLine(last);
  }

  /**
   * Считает количество строк в потоке.
   */
  private async countLinesFromReadable(
    readable: NodeJS.ReadableStream,
  ): Promise<number> {
    const stream = readable as NodeJS.ReadableStream & AsyncIterable<Buffer>;

    let count = 0;
    let sawAny = false;
    let lastByteIsNewline = false;

    for await (const chunk of stream) {
      sawAny = sawAny || chunk.length > 0;

      for (const b of chunk) {
        if (b === 10) count += 1;
      }

      lastByteIsNewline = chunk.length > 0 && chunk[chunk.length - 1] === 10;
    }

    if (sawAny && !lastByteIsNewline) count += 1;
    return count;
  }

  /**
   * Считает общее количество строк в файлах build_*.txt.
   */
  private async countTotalBuildLines(zipPath: string): Promise<number> {
    const zip = await this.openZip(zipPath);
    const buildEntries = this.pickBuildEntries(zip.files);

    let total = 0;
    for (const entry of buildEntries) {
      total += await this.countLinesFromReadable(entry.stream());
    }
    return total;
  }

  /**
   * Нормализует значение к строке или null.
   */
  private norm(value: unknown): string | null {
    if (value === null || value === undefined) return null;

    let raw: string;
    switch (typeof value) {
      case 'string':
        raw = value;
        break;
      case 'number':
      case 'boolean':
      case 'bigint':
        raw = value.toString();
        break;
      default:
        return null;
    }

    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  /**
   * Склеивает части строки, отбрасывая пустые элементы.
   */
  private joinParts(parts: Array<string | null | undefined>): string {
    const normalized = parts
      .map((p) => (p ?? '').trim())
      .filter((p) => p.length > 0);

    return normalized.join(' ');
  }

  /**
   * Формирует номер строения из основной и дополнительной частей.
   */
  private makeNumber(main: string | null, sub: string | null): string | null {
    if (!main) return null;
    if (sub && sub !== '0') return `${main}-${sub}`;
    return main;
  }

  /**
   * Дополняет массив колонок до нужной длины.
   */
  private padCols(cols: string[], minLen: number): string[] {
    if (cols.length >= minLen) return cols;
    return [...cols, ...Array.from({ length: minLen - cols.length }, () => '')];
  }

  /**
   * Строит индекс справочника дорог по строке.
   */
  private indexRoadRow(cols: string[]): RoadIndexEntry | null {
    const row = this.padCols(cols, 20);

    const districtCode = this.norm(row[0]);
    const roadNo = this.norm(row[1]);
    const localAreaSerial = this.norm(row[4]);

    const roadCode = districtCode && roadNo ? `${districtCode}${roadNo}` : null;
    if (!roadCode || !localAreaSerial) return null;

    return {
      key: `${roadCode}|${localAreaSerial}`,
      value: {
        ko: {
          region1: this.norm(row[5]),
          region2: this.norm(row[6]),
          area: this.norm(row[9]),
          roadName: this.norm(row[2]),
        },
        en: {
          region1: this.norm(row[15]),
          region2: this.norm(row[16]),
          area: this.norm(row[17]),
          roadName: this.norm(row[3]),
        },
      },
    };
  }

  /**
   * Преобразует строку build_*.txt в объект адреса.
   */
  private buildToDoc(
    cols: string[],
    roadIndex: Map<string, RoadIndexEntry['value']>,
  ): AddressSearchResult | null {
    const row = this.padCols(cols, 31);

    const id = this.norm(row[15]);
    const roadCode = this.norm(row[8]);
    const localAreaSerial = this.norm(row[16]);
    const buildingMainNo = this.norm(row[11]);

    if (!id || !roadCode || !localAreaSerial || !buildingMainNo) return null;

    const legalAreaCode = this.norm(row[0]);

    const parcelKo = {
      region1: this.norm(row[1]),
      region2: this.norm(row[2]),
      region3: this.norm(row[3]),
      region4: this.norm(row[4]),
    };

    const isMountainLot = this.norm(row[5]) === '1';
    const mainNo = this.norm(row[6]);
    const subNo = this.norm(row[7]);
    const parcelNoRaw = this.makeNumber(mainNo, subNo);

    const isUnderground = this.norm(row[10]) === '1';
    const buildingSubNo = this.norm(row[12]);
    const buildingNoRaw = this.makeNumber(buildingMainNo, buildingSubNo);

    const postalCode = this.norm(row[27]) ?? this.norm(row[19]);

    const buildingNameKo =
      this.norm(row[25]) ?? this.norm(row[13]) ?? this.norm(row[14]);

    const dict = roadIndex.get(`${roadCode}|${localAreaSerial}`);

    const roadKo = {
      region1: dict?.ko.region1 ?? parcelKo.region1 ?? null,
      region2: dict?.ko.region2 ?? parcelKo.region2 ?? null,
      area: dict?.ko.area ?? parcelKo.region3 ?? null,
      roadName: this.norm(row[9]) ?? dict?.ko.roadName ?? null,
    };

    const roadEn = {
      region1: dict?.en.region1 ?? null,
      region2: dict?.en.region2 ?? null,
      area: dict?.en.area ?? null,
      roadName: dict?.en.roadName ?? null,
    };

    const buildingNoKo =
      isUnderground && FORMAT.includeUndergroundPrefixKo && buildingNoRaw
        ? `${KO_UNDERGROUND_PREFIX}${buildingNoRaw}`
        : buildingNoRaw;

    const buildingNoEn =
      isUnderground && FORMAT.includeUndergroundWordEn && buildingNoRaw
        ? `Underground ${buildingNoRaw}`
        : buildingNoRaw;

    const parcelNoKo =
      isMountainLot && FORMAT.includeMountainPrefixKo && parcelNoRaw
        ? `${KO_MOUNTAIN_PREFIX}${parcelNoRaw}`
        : parcelNoRaw;

    const parcelNoEn =
      isMountainLot && FORMAT.includeMountainWordEn && parcelNoRaw
        ? `Mountain ${parcelNoRaw}`
        : parcelNoRaw;

    const roadFullKo =
      this.joinParts([
        roadKo.region1,
        roadKo.region2,
        roadKo.area,
        roadKo.roadName,
        buildingNoKo,
      ]) || null;

    const roadFullEn =
      roadEn.region1 && roadEn.region2 && roadEn.roadName && buildingNoEn
        ? this.joinParts([
            roadEn.region1,
            roadEn.region2,
            roadEn.area,
            roadEn.roadName,
            buildingNoEn,
          ]) || null
        : null;

    const parcelFullKo =
      this.joinParts([
        parcelKo.region1,
        parcelKo.region2,
        parcelKo.region3,
        parcelKo.region4,
        parcelNoKo,
      ]) || null;

    const parcelFullEn =
      roadEn.region1 && roadEn.region2 && roadEn.area && parcelNoEn
        ? this.joinParts([
            roadEn.region1,
            roadEn.region2,
            roadEn.area,
            parcelNoEn,
          ]) || null
        : null;

    const displayKo = roadFullKo ?? parcelFullKo;
    const displayEn = roadFullEn ?? parcelFullEn;

    const searchKoRaw = this.joinParts([
      roadFullKo,
      parcelFullKo,
      postalCode,
      buildingNameKo,
    ]).toLowerCase();

    const searchEnRaw = this.joinParts([
      roadFullEn,
      parcelFullEn,
      postalCode,
    ]).toLowerCase();

    const searchKo = searchKoRaw.length > 0 ? searchKoRaw : null;
    const searchEn = searchEnRaw.length > 0 ? searchEnRaw : null;

    return {
      id,
      x: null,
      y: null,
      display: { ko: displayKo, en: displayEn },
      road: {
        ko: {
          region1: roadKo.region1,
          region2: roadKo.region2,
          region3: roadKo.area,
          roadName: roadKo.roadName,
          buildingNo: buildingNoKo,
          isUnderground,
          full: roadFullKo,
        },
        en: {
          region1: roadEn.region1,
          region2: roadEn.region2,
          region3: roadEn.area,
          roadName: roadEn.roadName,
          buildingNo: buildingNoEn,
          isUnderground,
          full: roadFullEn,
        },
        codes: { roadCode, localAreaSerial, postalCode },
        building: { nameKo: buildingNameKo },
      },
      parcel: {
        ko: {
          region1: parcelKo.region1,
          region2: parcelKo.region2,
          region3: parcelKo.region3,
          region4: parcelKo.region4,
          isMountainLot,
          mainNo,
          subNo,
          parcelNo: parcelNoKo,
          full: parcelFullKo,
        },
        en: {
          region1: roadEn.region1,
          region2: roadEn.region2,
          region3: roadEn.area,
          region4: null,
          isMountainLot,
          mainNo,
          subNo,
          parcelNo: parcelNoEn,
          full: parcelFullEn,
        },
        codes: { legalAreaCode },
      },
      search: { ko: searchKo, en: searchEn },
    };
  }

  /**
   * Возвращает описание колонок для батчевой вставки.
   */
  private buildInsertCols(): readonly ColDef[] {
    const cols: readonly ColDef[] = [
      { name: 'id', pgArray: 'text[]', pick: (d) => d.id },
      { name: 'x', pgArray: 'float8[]', pick: (d) => d.x ?? null },
      { name: 'y', pgArray: 'float8[]', pick: (d) => d.y ?? null },
      {
        name: 'display_ko',
        pgArray: 'text[]',
        pick: (d) => d.display.ko ?? null,
      },
      {
        name: 'display_en',
        pgArray: 'text[]',
        pick: (d) => d.display.en ?? null,
      },
      {
        name: 'search_ko',
        pgArray: 'text[]',
        pick: (d) => d.search.ko ?? null,
      },
      {
        name: 'search_en',
        pgArray: 'text[]',
        pick: (d) => d.search.en ?? null,
      },

      {
        name: 'road_ko_region1',
        pgArray: 'text[]',
        pick: (d) => d.road.ko.region1 ?? null,
      },
      {
        name: 'road_ko_region2',
        pgArray: 'text[]',
        pick: (d) => d.road.ko.region2 ?? null,
      },
      {
        name: 'road_ko_region3',
        pgArray: 'text[]',
        pick: (d) => d.road.ko.region3 ?? null,
      },
      {
        name: 'road_ko_road_name',
        pgArray: 'text[]',
        pick: (d) => d.road.ko.roadName ?? null,
      },
      {
        name: 'road_ko_building_no',
        pgArray: 'text[]',
        pick: (d) => d.road.ko.buildingNo ?? null,
      },
      {
        name: 'road_ko_is_underground',
        pgArray: 'boolean[]',
        pick: (d) => d.road.ko.isUnderground ?? null,
      },
      {
        name: 'road_ko_full',
        pgArray: 'text[]',
        pick: (d) => d.road.ko.full ?? null,
      },

      {
        name: 'road_en_region1',
        pgArray: 'text[]',
        pick: (d) => d.road.en.region1 ?? null,
      },
      {
        name: 'road_en_region2',
        pgArray: 'text[]',
        pick: (d) => d.road.en.region2 ?? null,
      },
      {
        name: 'road_en_region3',
        pgArray: 'text[]',
        pick: (d) => d.road.en.region3 ?? null,
      },
      {
        name: 'road_en_road_name',
        pgArray: 'text[]',
        pick: (d) => d.road.en.roadName ?? null,
      },
      {
        name: 'road_en_building_no',
        pgArray: 'text[]',
        pick: (d) => d.road.en.buildingNo ?? null,
      },
      {
        name: 'road_en_is_underground',
        pgArray: 'boolean[]',
        pick: (d) => d.road.en.isUnderground ?? null,
      },
      {
        name: 'road_en_full',
        pgArray: 'text[]',
        pick: (d) => d.road.en.full ?? null,
      },

      {
        name: 'road_code',
        pgArray: 'text[]',
        pick: (d) => d.road.codes.roadCode ?? null,
      },
      {
        name: 'road_local_area_serial',
        pgArray: 'text[]',
        pick: (d) => d.road.codes.localAreaSerial ?? null,
      },
      {
        name: 'road_postal_code',
        pgArray: 'text[]',
        pick: (d) => d.road.codes.postalCode ?? null,
      },
      {
        name: 'road_building_name_ko',
        pgArray: 'text[]',
        pick: (d) => d.road.building.nameKo ?? null,
      },

      {
        name: 'parcel_ko_region1',
        pgArray: 'text[]',
        pick: (d) => d.parcel.ko.region1 ?? null,
      },
      {
        name: 'parcel_ko_region2',
        pgArray: 'text[]',
        pick: (d) => d.parcel.ko.region2 ?? null,
      },
      {
        name: 'parcel_ko_region3',
        pgArray: 'text[]',
        pick: (d) => d.parcel.ko.region3 ?? null,
      },
      {
        name: 'parcel_ko_region4',
        pgArray: 'text[]',
        pick: (d) => d.parcel.ko.region4 ?? null,
      },
      {
        name: 'parcel_ko_is_mountain_lot',
        pgArray: 'boolean[]',
        pick: (d) => d.parcel.ko.isMountainLot ?? null,
      },
      {
        name: 'parcel_ko_main_no',
        pgArray: 'text[]',
        pick: (d) => d.parcel.ko.mainNo ?? null,
      },
      {
        name: 'parcel_ko_sub_no',
        pgArray: 'text[]',
        pick: (d) => d.parcel.ko.subNo ?? null,
      },
      {
        name: 'parcel_ko_parcel_no',
        pgArray: 'text[]',
        pick: (d) => d.parcel.ko.parcelNo ?? null,
      },
      {
        name: 'parcel_ko_full',
        pgArray: 'text[]',
        pick: (d) => d.parcel.ko.full ?? null,
      },

      {
        name: 'parcel_en_region1',
        pgArray: 'text[]',
        pick: (d) => d.parcel.en.region1 ?? null,
      },
      {
        name: 'parcel_en_region2',
        pgArray: 'text[]',
        pick: (d) => d.parcel.en.region2 ?? null,
      },
      {
        name: 'parcel_en_region3',
        pgArray: 'text[]',
        pick: (d) => d.parcel.en.region3 ?? null,
      },
      {
        name: 'parcel_en_region4',
        pgArray: 'text[]',
        pick: (d) => d.parcel.en.region4 ?? null,
      },
      {
        name: 'parcel_en_is_mountain_lot',
        pgArray: 'boolean[]',
        pick: (d) => d.parcel.en.isMountainLot ?? null,
      },
      {
        name: 'parcel_en_main_no',
        pgArray: 'text[]',
        pick: (d) => d.parcel.en.mainNo ?? null,
      },
      {
        name: 'parcel_en_sub_no',
        pgArray: 'text[]',
        pick: (d) => d.parcel.en.subNo ?? null,
      },
      {
        name: 'parcel_en_parcel_no',
        pgArray: 'text[]',
        pick: (d) => d.parcel.en.parcelNo ?? null,
      },
      {
        name: 'parcel_en_full',
        pgArray: 'text[]',
        pick: (d) => d.parcel.en.full ?? null,
      },

      {
        name: 'parcel_legal_area_code',
        pgArray: 'text[]',
        pick: (d) => d.parcel.codes.legalAreaCode ?? null,
      },
    ] as const;

    if (cols.length !== AddressesImportService.INSERT_COLS_PER_ROW) {
      throw new Error(
        `Insert columns mismatch: got ${cols.length}, expected ${AddressesImportService.INSERT_COLS_PER_ROW}`,
      );
    }

    return cols;
  }

  /**
   * Формирует SQL для вставки батча через UNNEST.
   */
  private buildUnnestSql(
    cols: readonly ColDef[],
    mode: ImportMode,
    tableName: AddressesTableName,
  ): string {
    const colNames = cols.map((c) => c.name).join(', ');
    const unnestArgs = cols.map((c, i) => `$${i + 1}::${c.pgArray}`).join(', ');

    if (mode === 'replace') {
      // В replace режиме table уже TRUNCATE, конфликтов быть не должно.
      return `
        INSERT INTO ${tableName} (${colNames})
        SELECT * FROM UNNEST(${unnestArgs})
      `;
    }

    const updates = cols
      .filter((c) => c.name !== 'id')
      .map((c) => `${c.name} = EXCLUDED.${c.name}`)
      .join(', ');

    return `
      INSERT INTO ${tableName} (${colNames})
      SELECT * FROM UNNEST(${unnestArgs})
      ON CONFLICT (id) DO UPDATE SET ${updates}
    `;
  }

  // Батчевый разбор build файла: нет await на каждую строку.
  /**
   * Обрабатывает файл build_*.txt батчами и вызывает колбэки по мере обработки.
   */
  private async processBuildFileBatched(params: {
    entry: ZipEntry;
    decoder: TextDecoder;
    roadIndex: Map<string, RoadIndexEntry['value']>;
    chunkSize: number;
    onBatch: (batch: AddressSearchResult[]) => Promise<void>;
    onLineProcessed: () => void;
  }): Promise<{ processedLines: number }> {
    const stream = params.entry.stream() as NodeJS.ReadableStream &
      AsyncIterable<Buffer>;

    let remainder = '';
    let processedLines = 0;

    let buffer: AddressSearchResult[] = [];

    const flush = async () => {
      if (buffer.length === 0) return;
      const batch = buffer;
      buffer = [];
      await params.onBatch(batch);
    };

    for await (const chunk of stream) {
      const text = params.decoder.decode(chunk, { stream: true });
      const data = remainder + text;
      const parts = data.split('\n');
      remainder = parts.pop() ?? '';

      for (let line of parts) {
        line = line.replace(/\r$/, '');
        if (!line) continue;
        if (line.charCodeAt(0) === 0xfeff) line = line.slice(1);

        processedLines += 1;
        params.onLineProcessed();

        const cols = line.split('|');
        if (cols.length < 16) continue;

        const doc = this.buildToDoc(cols, params.roadIndex);
        if (!doc) continue;

        buffer.push(doc);

        if (buffer.length >= params.chunkSize) {
          await flush();
        }
      }
    }

    const tail = params.decoder.decode(new Uint8Array(), { stream: false });
    const last = (remainder + tail).replace(/\r$/, '');
    if (last) {
      processedLines += 1;
      params.onLineProcessed();

      const cols = last.split('|');
      if (cols.length >= 16) {
        const doc = this.buildToDoc(cols, params.roadIndex);
        if (doc) buffer.push(doc);
      }
    }

    await flush();

    return { processedLines };
  }

  // Вставка батча через UNNEST (фиксированное число параметров: 44 массива)
  /**
   * Вставляет батч документов в указанную таблицу адресов.
   */
  private async insertDocuments(
    documents: AddressSearchResult[],
    qr: QueryRunner,
    mode: ImportMode,
    tableName: AddressesTableName,
  ): Promise<void> {
    if (documents.length === 0) return;

    const cols = this.buildInsertCols();
    const sql = this.buildUnnestSql(cols, mode, tableName);

    const arrays = cols.map(
      () => [] as Array<string | number | boolean | null>,
    );

    for (const doc of documents) {
      for (let i = 0; i < cols.length; i++) {
        arrays[i].push(cols[i].pick(doc));
      }
    }

    await qr.query(sql, arrays);
  }
}
