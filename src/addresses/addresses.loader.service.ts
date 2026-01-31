import * as fs from 'node:fs';
import * as os from 'node:os';
import * as http from 'node:http';
import * as https from 'node:https';
import * as path from 'node:path';
import { TextDecoder } from 'node:util';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as unzipper from 'unzipper';

import type { AddressSearchResult } from './addresses.types';

type Defaults = Readonly<{
  chunkSize: number;
  downloadLogEveryMs: number;
  insertLogEveryMs: number;
}>;

const DEFAULTS: Defaults = {
  chunkSize: 1000,
  downloadLogEveryMs: 1500,
  insertLogEveryMs: 1500,
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

@Injectable()
export class AddressesLoaderService implements OnApplicationBootstrap {
  private static readonly INSERT_COLS_PER_ROW = 44;
  private readonly logger = new Logger(AddressesLoaderService.name);

  /**
   * Создаёт сервис загрузки адресов и подключается к источнику данных.
   */
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Запускает загрузчик при старте приложения и следит за наличием данных.
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('[bootstrap] start');

    await this.ensureSchema();

    // Exact count (can take time on big tables) — log start/end to avoid “silent pause”.
    this.logger.log('[bootstrap] checking existing data (exact COUNT(*))...');
    const existing = await this.getAddressesCountExact();
    this.logger.log(`[bootstrap] addresses_count=${existing.toString()}`);

    if (existing > 0n) {
      this.logger.log('[bootstrap] data exists -> loader skipped');
      return;
    }

    this.logger.log('[bootstrap] no data -> starting loader');
    await this.loadAddresses();
    this.logger.log('[bootstrap] loader finished');
  }

  /**
   * Гарантирует наличие схемы и индексов для адресов.
   */
  private async ensureSchema(): Promise<void> {
    await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await this.dataSource.query(`
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
      )
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS addresses_search_ko_idx
      ON addresses USING gin (search_ko gin_trgm_ops)
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS addresses_search_en_idx
      ON addresses USING gin (search_en gin_trgm_ops)
    `);
  }

  /**
   * Получает точное количество адресов в таблице.
   */
  private async getAddressesCountExact(): Promise<bigint> {
    const t0 = Date.now();

    const rawRows: unknown = await this.dataSource.query(
      `SELECT COUNT(*)::bigint AS cnt FROM addresses`,
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
      `[bootstrap] COUNT(*) done in ${Date.now() - t0}ms (cnt=${cnt.toString()})`,
    );
    return cnt;
  }

  /**
   * Загружает и импортирует адресные данные из архива.
   */
  private async loadAddresses(): Promise<void> {
    const month = this.getMonthFromEnv();
    const decoder = this.createDecoder();
    if (!decoder) throw new Error('Decoder not available.');

    const url = this.buildZipUrl(month);

    // Put temp zip outside project folder to avoid watch-triggered restarts
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'addr-'));
    const zipPath = path.join(tmpDir, `${month}.zip`);

    this.logger.log(`[load] month=${month}`);
    this.logger.log(`[load] temp_dir=${tmpDir}`);

    try {
      await this.downloadToFileWithProgress(
        url,
        zipPath,
        DEFAULTS.downloadLogEveryMs,
      );

      this.logger.log('[load] counting total lines in build_*.txt (pass 1)...');
      const tCount0 = Date.now();
      const totalLines = await this.countTotalBuildLines(zipPath);
      this.logger.log(
        `[load] total_lines=${totalLines} (pass 1 in ${Date.now() - tCount0}ms)`,
      );

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

      const roadIndex = new Map<string, RoadIndexEntry['value']>();

      this.logger.log('[load] building road index...');
      const tRoad0 = Date.now();
      await this.forEachLineFromReadable(
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

      const buffer: AddressSearchResult[] = [];
      let inserted = 0;
      let processed = 0;
      let lastInsertLogAt = Date.now() - DEFAULTS.insertLogEveryMs;

      const logProgress = (final = false): void => {
        const pct =
          totalLines > 0 ? ((processed / totalLines) * 100).toFixed(2) : '0.00';
        this.logger.log(
          `[load] processed=${processed}/${totalLines} (${pct}%) inserted=${inserted}${
            final ? ' done' : ''
          }`,
        );
      };

      for (const entry of buildEntries) {
        this.logger.log(`[load] processing ${entry.path}...`);

        await this.forEachLineFromReadable(
          entry.stream(),
          decoder,
          async (line) => {
            processed += 1;

            const cols = line.split('|');
            if (cols.length < 16) {
              this.maybeLogInsertProgress(
                logProgress,
                () => lastInsertLogAt,
                (v) => {
                  lastInsertLogAt = v;
                },
              );
              return;
            }

            const doc = this.buildToDoc(cols, roadIndex);
            if (!doc) {
              this.maybeLogInsertProgress(
                logProgress,
                () => lastInsertLogAt,
                (v) => {
                  lastInsertLogAt = v;
                },
              );
              return;
            }

            buffer.push(doc);

            if (buffer.length >= DEFAULTS.chunkSize) {
              const batch = buffer.splice(0, buffer.length);
              await this.insertDocuments(batch);
              inserted += batch.length;

              logProgress(false);
              lastInsertLogAt = Date.now();
            } else {
              this.maybeLogInsertProgress(
                logProgress,
                () => lastInsertLogAt,
                (v) => {
                  lastInsertLogAt = v;
                },
              );
            }
          },
        );
      }

      if (buffer.length > 0) {
        const batch = buffer.splice(0, buffer.length);
        await this.insertDocuments(batch);
        inserted += batch.length;
      }

      logProgress(true);

      // Optional: log exact count after load
      this.logger.log('[load] verifying exact count after load...');
      const after = await this.getAddressesCountExact();
      this.logger.log(`[load] addresses_count_after=${after.toString()}`);
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
      this.logger.log('[load] temp files removed');
    }
  }

  /**
   * Логирует прогресс вставки, если прошло достаточно времени.
   */
  private maybeLogInsertProgress(
    log: (final?: boolean) => void,
    getLastAt: () => number,
    setLastAt: (v: number) => void,
  ): void {
    const now = Date.now();
    if (now - getLastAt() >= DEFAULTS.insertLogEveryMs) {
      setLastAt(now);
      log(false);
    }
  }

  /**
   * Возвращает месяц выгрузки из переменной окружения или текущий месяц.
   */
  private getMonthFromEnv(): string {
    const raw = process.env.ADDRESS_DATA_MONTH;
    if (raw && /^\d{6}$/.test(raw)) return raw;

    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}${m}`;
  }

  /**
   * Формирует ссылку на архив с адресами для указанного месяца.
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
   * Подбирает поддерживаемую кодировку для чтения файлов.
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
   * Выбирает HTTP-клиент по протоколу URL.
   */
  private getHttpLib(urlObj: URL): typeof http | typeof https {
    return urlObj.protocol === 'https:' ? https : http;
  }

  /**
   * Считает процент выполнения, ограничивая диапазон.
   */
  private pct(done: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.max(0, Math.min(100, (done / total) * 100));
  }

  /**
   * Преобразует размер в человекочитаемый формат.
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
   * Запрашивает размер файла через HEAD с учётом редиректов.
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
   * Загружает файл с прогрессом и поддержкой редиректов.
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
   * Открывает zip-архив с данными.
   */
  private async openZip(zipPath: string): Promise<ZipDirectory> {
    const api = unzipper as unknown as {
      Open: { file: (p: string) => Promise<ZipDirectory> };
    };
    return api.Open.file(zipPath);
  }

  /**
   * Находит файл с индексом дорог в архиве.
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
   * Отбирает файлы с данными зданий в архиве.
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

  /**
   * Итерирует по строкам потока, учитывая разрывы и BOM.
   */
  private async forEachLineFromReadable(
    readable: NodeJS.ReadableStream,
    decoder: TextDecoder,
    onLine: (line: string) => void | Promise<void>,
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

        await Promise.resolve(onLine(line));
      }
    }

    const tail = decoder.decode(new Uint8Array(), { stream: false });
    const last = (remainder + tail).replace(/\r$/, '');
    if (last.length > 0) {
      await Promise.resolve(onLine(last));
    }
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
   * Считает общее количество строк во всех build-файлах.
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
   * Нормализует значение ячейки в строку либо null.
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
   * Склеивает части адреса через пробел, удаляя пустые значения.
   */
  private joinParts(parts: Array<string | null | undefined>): string {
    const normalized = parts
      .map((p) => (p ?? '').trim())
      .filter((p) => p.length > 0);

    return normalized.join(' ');
  }

  /**
   * Формирует составной номер с подномером.
   */
  private makeNumber(main: string | null, sub: string | null): string | null {
    if (!main) return null;
    if (sub && sub !== '0') return `${main}-${sub}`;
    return main;
  }

  /**
   * Дополняет список колонок пустыми значениями до нужной длины.
   */
  private padCols(cols: string[], minLen: number): string[] {
    if (cols.length >= minLen) return cols;
    return [...cols, ...Array.from({ length: minLen - cols.length }, () => '')];
  }

  /**
   * Преобразует строку дорожного справочника в индексную запись.
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
   * Преобразует строку build-файла в документ адреса.
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
   * Вставляет документы адресов батчами через SQL.
   */
  private async insertDocuments(
    documents: AddressSearchResult[],
  ): Promise<void> {
    if (documents.length === 0) return;

    const colsPerRow = AddressesLoaderService.INSERT_COLS_PER_ROW;

    const values: Array<string | number | boolean | null> = [];
    const placeholders: string[] = [];

    documents.forEach((doc, index) => {
      values.push(
        doc.id,
        doc.x ?? null,
        doc.y ?? null,
        doc.display.ko ?? null,
        doc.display.en ?? null,
        doc.search.ko ?? null,
        doc.search.en ?? null,
        doc.road.ko.region1 ?? null,
        doc.road.ko.region2 ?? null,
        doc.road.ko.region3 ?? null,
        doc.road.ko.roadName ?? null,
        doc.road.ko.buildingNo ?? null,
        doc.road.ko.isUnderground ?? null,
        doc.road.ko.full ?? null,
        doc.road.en.region1 ?? null,
        doc.road.en.region2 ?? null,
        doc.road.en.region3 ?? null,
        doc.road.en.roadName ?? null,
        doc.road.en.buildingNo ?? null,
        doc.road.en.isUnderground ?? null,
        doc.road.en.full ?? null,
        doc.road.codes.roadCode ?? null,
        doc.road.codes.localAreaSerial ?? null,
        doc.road.codes.postalCode ?? null,
        doc.road.building.nameKo ?? null,
        doc.parcel.ko.region1 ?? null,
        doc.parcel.ko.region2 ?? null,
        doc.parcel.ko.region3 ?? null,
        doc.parcel.ko.region4 ?? null,
        doc.parcel.ko.isMountainLot ?? null,
        doc.parcel.ko.mainNo ?? null,
        doc.parcel.ko.subNo ?? null,
        doc.parcel.ko.parcelNo ?? null,
        doc.parcel.ko.full ?? null,
        doc.parcel.en.region1 ?? null,
        doc.parcel.en.region2 ?? null,
        doc.parcel.en.region3 ?? null,
        doc.parcel.en.region4 ?? null,
        doc.parcel.en.isMountainLot ?? null,
        doc.parcel.en.mainNo ?? null,
        doc.parcel.en.subNo ?? null,
        doc.parcel.en.parcelNo ?? null,
        doc.parcel.en.full ?? null,
        doc.parcel.codes.legalAreaCode ?? null,
      );

      const base = index * colsPerRow;
      const marks = Array.from(
        { length: colsPerRow },
        (_, i) => `$${base + i + 1}`,
      ).join(', ');
      placeholders.push(`(${marks})`);
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
      VALUES ${placeholders.join(', ')}
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

    await this.dataSource.query(sql, values);
  }
}
