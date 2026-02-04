import * as fs from 'node:fs';
import { PassThrough, Readable } from 'node:stream';

import { AddressesImportService } from '@/cli/addresses-import.service';

const makeService = (config?: Record<string, unknown>) => {
  const dataSource = {};
  const configService = {
    get: jest.fn(() => config ?? null),
  };
  const logger = {
    setContext: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const service = new AddressesImportService(
    dataSource as any,
    configService as any,
    logger as any,
  );

  return { service, configService, logger };
};

const makeServiceWithDataSource = (params?: {
  dataSource?: Record<string, unknown>;
  config?: Record<string, unknown>;
}) => {
  const dataSource = params?.dataSource ?? {
    query: jest.fn(),
    createQueryRunner: jest.fn(),
  };
  const configService = {
    get: jest.fn(() => params?.config ?? null),
  };
  const logger = {
    setContext: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const service = new AddressesImportService(
    dataSource as any,
    configService as any,
    logger as any,
  );

  return { service, dataSource, configService, logger };
};

const buildRoadIndexValue = () => ({
  ko: {
    region1: 'Seoul',
    region2: 'Jongno',
    area: 'Area',
    roadName: 'Main',
  },
  en: {
    region1: 'Seoul',
    region2: 'Jongno',
    area: 'Area',
    roadName: 'Main',
  },
});

const makeBuildRow = (id: string, roadCode = '12345', serial = '0001') => {
  const row = Array.from({ length: 31 }, () => '');
  row[0] = '11000';
  row[1] = 'Seoul';
  row[2] = 'Jongno';
  row[3] = 'District';
  row[4] = 'Block';
  row[5] = '1';
  row[6] = '12';
  row[7] = '3';
  row[8] = roadCode;
  row[9] = 'Main';
  row[10] = '1';
  row[11] = '99';
  row[12] = '2';
  row[13] = 'BuildingA';
  row[14] = 'BuildingB';
  row[15] = id;
  row[16] = serial;
  row[19] = '04567';
  row[25] = 'BuildingKo';
  row[27] = '12345';
  return row;
};

describe('AddressesImportService helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gets import mode from config', () => {
    const { service } = makeService({ mode: 'replace' });
    const mode = (service as any).getImportModeFromEnv();
    expect(mode).toBe('replace');
  });

  it('falls back to defaults for invalid settings', () => {
    const { service } = makeService({
      chunkSize: -1,
      downloadLogEveryMs: 0,
      downloadTimeoutMs: null,
      insertLogEveryMs: 2500,
      commitEveryBatches: 10,
      dropIndexes: false,
      countLinesForPercent: true,
    });

    const defaults = (service as any).getDefaultsFromEnv();
    expect(defaults.chunkSize).toBe(5000);
    expect(defaults.downloadLogEveryMs).toBe(1500);
    expect(defaults.downloadTimeoutMs).toBe(120000);
    expect(defaults.insertLogEveryMs).toBe(2500);
    expect(defaults.commitEveryBatches).toBe(10);
    expect(defaults.dropIndexesDuringImport).toBe(false);
    expect(defaults.countLinesForPercent).toBe(true);
  });

  it('uses config month when valid and current month otherwise', () => {
    const { service: withConfig } = makeService({ month: '202501' });
    expect((withConfig as any).getMonthFromEnv()).toBe('202501');

    const { service } = makeService({ month: 'invalid' });
    jest.useFakeTimers().setSystemTime(new Date('2026-02-04T00:00:00Z'));
    expect((service as any).getMonthFromEnv()).toBe('202602');
    jest.useRealTimers();
  });

  it('builds download URL', () => {
    const { service } = makeService();
    const url = (service as any).buildZipUrl('202402');
    const parsed = new URL(url);

    expect(parsed.hostname).toBe('business.juso.go.kr');
    expect(parsed.searchParams.get('stdde')).toBe('202402');
    expect(parsed.searchParams.get('regYmd')).toBe('2024');
  });

  it('creates decoder and chooses http lib', () => {
    const { service } = makeService();
    expect((service as any).createDecoder()).toBeInstanceOf(TextDecoder);

    const httpLib = (service as any).getHttpLib(new URL('http://example.com'));
    const httpsLib = (service as any).getHttpLib(
      new URL('https://example.com'),
    );
    expect(httpLib).not.toBe(httpsLib);
  });

  it('formats percentages and bytes', () => {
    const { service } = makeService();
    expect((service as any).pct(10, 0)).toBe(0);
    expect((service as any).pct(10, 20)).toBe(50);
    expect((service as any).pct(1000, 10)).toBe(100);

    expect((service as any).humanBytes(0)).toBe('0 B');
    expect((service as any).humanBytes(1024)).toBe('1.0 KB');
  });

  it('normalizes values and joins parts', () => {
    const { service } = makeService();

    expect((service as any).norm('  ')).toBeNull();
    expect((service as any).norm(123)).toBe('123');
    expect((service as any).norm(false)).toBe('false');
    expect((service as any).norm({})).toBeNull();

    expect((service as any).joinParts(['a', null, ' b '])).toBe('a b');
    expect((service as any).makeNumber('10', '0')).toBe('10');
    expect((service as any).makeNumber('10', '2')).toBe('10-2');
  });

  it('pads columns to minimum length', () => {
    const { service } = makeService();
    expect((service as any).padCols(['a'], 3)).toEqual(['a', '', '']);
  });

  it('selects zip entries', () => {
    const { service } = makeService();
    const files = [
      { path: 'build_2.txt', type: 'File' },
      { path: 'build_1.txt', type: 'File' },
      { path: 'road_code_total.txt', type: 'File' },
      { path: 'other.txt', type: 'File' },
      { path: 'folder', type: 'Directory' },
    ];

    const road = (service as any).pickRoadEntry(files);
    const builds = (service as any).pickBuildEntries(files);

    expect(road?.path).toBe('road_code_total.txt');
    expect(builds.map((b: any) => b.path)).toEqual([
      'build_1.txt',
      'build_2.txt',
    ]);
  });

  it('iterates lines and counts lines', async () => {
    const { service } = makeService();
    const lines: string[] = [];
    const stream = Readable.from([Buffer.from('\ufeffline1\n\nline2\r\n')]);

    await (service as any).forEachLineFromReadableSync(
      stream,
      new TextDecoder('utf-8'),
      (line: string) => lines.push(line),
    );

    expect(lines).toEqual(['line1', 'line2']);

    const count = await (service as any).countLinesFromReadable(
      Readable.from([Buffer.from('a\nb\nc')]),
    );
    expect(count).toBe(3);
  });

  it('indexes road rows and builds document', () => {
    const { service } = makeService();
    const row = Array.from({ length: 20 }, () => '');
    row[0] = '12';
    row[1] = '345';
    row[2] = 'Main';
    row[3] = 'Main';
    row[4] = '0001';
    row[5] = 'Seoul';
    row[6] = 'Jongno';
    row[9] = 'Area';
    row[15] = 'Seoul';
    row[16] = 'Jongno';
    row[17] = 'Area';

    const index = (service as any).indexRoadRow(row);
    expect(index.key).toBe('12345|0001');

    const roadIndex = new Map([[index.key, index.value]]);
    const doc = (service as any).buildToDoc(makeBuildRow('ADDR-1'), roadIndex);

    expect(doc.id).toBe('ADDR-1');
    expect(doc.road.codes.roadCode).toBe('12345');
    expect(doc.road.ko.buildingNo).toContain('99-2');
    expect(doc.parcel.ko.parcelNo).toContain('12-3');
    expect(doc.search.ko).toContain('buildingko');
  });

  it('returns null for invalid build rows', () => {
    const { service } = makeService();
    const roadIndex = new Map();
    expect((service as any).buildToDoc(['only', 'two'], roadIndex)).toBeNull();
  });

  it('builds insert columns and unnest sql', () => {
    const { service } = makeService();
    const cols = (service as any).buildInsertCols();

    expect(cols).toHaveLength(44);

    const sqlUpsert = (service as any).buildUnnestSql(
      cols,
      'upsert',
      'addresses',
    );
    const sqlReplace = (service as any).buildUnnestSql(
      cols,
      'replace',
      'addresses',
    );

    expect(sqlUpsert).toContain('ON CONFLICT');
    expect(sqlReplace).not.toContain('ON CONFLICT');
  });

  it('processes build file in batches', async () => {
    const { service } = makeService();
    const roadIndex = new Map([
      ['12345|0001', buildRoadIndexValue()],
      ['12345|0002', buildRoadIndexValue()],
    ]);

    const line1 = makeBuildRow('ADDR-1', '12345', '0001').join('|');
    const line2 = 'short|line';
    const line3 = makeBuildRow('ADDR-2', '12345', '0002').join('|');
    const content = `${line1}\n${line2}\n${line3}`;

    const entry = {
      path: 'build_1.txt',
      type: 'File',
      stream: () => Readable.from([Buffer.from(content)]),
    };

    const batches: any[] = [];
    const result = await (service as any).processBuildFileBatched({
      entry,
      decoder: new TextDecoder('utf-8'),
      roadIndex,
      chunkSize: 2,
      onBatch: async (batch: any[]) => batches.push(batch),
      onLineProcessed: jest.fn(),
    });

    expect(result.processedLines).toBe(3);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
  });
});

describe('AddressesImportService import flow', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates schema and indexes', async () => {
    const dataSource = { query: jest.fn() };
    const { service } = makeServiceWithDataSource({ dataSource });

    await (service as any).ensureSchema();
    await (service as any).ensureIndexes('addresses');
    await (service as any).dropIndexes('addresses');

    const sql = dataSource.query.mock.calls.map((call) => call[0]).join(' ');

    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS addresses');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS addresses_next');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS addresses_prev');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS address_import_state');
    expect(sql).toContain('addresses_search_ko_idx');
    expect(sql).toContain('addresses_search_en_idx');
  });

  it('parses import state rows', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          month: '202601',
          status: 'completed',
          finished_at: '2026-02-01T00:00:00Z',
          expected_count: 42,
        },
      ]),
    };

    const { service } = makeServiceWithDataSource({ dataSource });
    const state = await (service as any).getImportState('202601');

    expect(state).toMatchObject({
      month: '202601',
      status: 'completed',
      expectedCount: 42,
    });
    expect(state?.finishedAt).toEqual(new Date('2026-02-01T00:00:00Z'));

    dataSource.query.mockResolvedValueOnce([{ month: 123 }]);
    await expect((service as any).getImportState('202601')).resolves.toBeNull();
  });

  it('writes import state', async () => {
    const dataSource = { query: jest.fn() };
    const { service } = makeServiceWithDataSource({ dataSource });

    await (service as any).setImportState({
      month: '202602',
      status: 'in_progress',
      finishedAt: null,
      expectedCount: 5,
    });

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO address_import_state'),
      ['202602', 'in_progress', null, 5],
    );
  });

  it('parses counts and locks', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ cnt: '12' }]),
    };
    const { service, logger } = makeServiceWithDataSource({ dataSource });

    await expect(
      (service as any).getAddressesCountExact('addresses'),
    ).resolves.toBe(12n);
    expect(logger.log).toHaveBeenCalled();

    dataSource.query.mockResolvedValueOnce([{ cnt: 'not-a-number' }]);
    await expect(
      (service as any).getAddressesCountExact('addresses'),
    ).resolves.toBe(0n);

    const qr = {
      query: jest.fn().mockResolvedValue([{ locked: true }]),
    };
    await expect(
      (service as any).tryAcquireImportLock(qr),
    ).resolves.toBe(true);

    qr.query.mockResolvedValueOnce([{ locked: 'no' }]);
    await expect(
      (service as any).tryAcquireImportLock(qr),
    ).resolves.toBe(false);
  });

  it('swaps tables in a transaction', async () => {
    const qr = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };
    const dataSource = {
      createQueryRunner: jest.fn(() => qr),
    };

    const { service } = makeServiceWithDataSource({ dataSource });

    await (service as any).swapTables();

    expect(qr.startTransaction).toHaveBeenCalled();
    expect(qr.commitTransaction).toHaveBeenCalled();
    expect(qr.rollbackTransaction).not.toHaveBeenCalled();
    expect(qr.release).toHaveBeenCalled();
  });

  it('rolls back when swapping tables fails', async () => {
    const qr = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn().mockRejectedValue(new Error('boom')),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };
    const dataSource = {
      createQueryRunner: jest.fn(() => qr),
    };

    const { service } = makeServiceWithDataSource({ dataSource });

    await expect((service as any).swapTables()).rejects.toThrow('boom');
    expect(qr.rollbackTransaction).toHaveBeenCalled();
    expect(qr.release).toHaveBeenCalled();
  });

  it('follows redirects when resolving content length', async () => {
    const { service } = makeServiceWithDataSource();

    const makeReq = () => ({
      setTimeout: jest.fn(),
      on: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn(),
    });

    const makeRes = (statusCode: number, headers: Record<string, string>) => {
      const res = new PassThrough() as PassThrough & {
        statusCode?: number;
        headers: Record<string, string>;
        resume: jest.Mock;
      };
      res.statusCode = statusCode;
      res.headers = headers;
      res.resume = jest.fn();
      return res;
    };

    const fakeLib = {
      request: jest
        .fn()
        .mockImplementationOnce((_opts: unknown, cb: (res: any) => void) => {
          const res = makeRes(302, { location: 'http://example.com/next' });
          process.nextTick(() => cb(res));
          return makeReq();
        })
        .mockImplementationOnce((_opts: unknown, cb: (res: any) => void) => {
          const res = makeRes(200, { 'content-length': '123' });
          process.nextTick(() => cb(res));
          return makeReq();
        }),
    };

    jest.spyOn(service as any, 'getHttpLib').mockReturnValue(fakeLib);

    const length = await (service as any).headContentLength(
      'http://example.com',
      1000,
    );
    expect(length).toBe(123);
    expect(fakeLib.request).toHaveBeenCalledTimes(2);
  });

  it('downloads a file and reports progress', async () => {
    const { service } = makeServiceWithDataSource();

    jest
      .spyOn(service as any, 'headContentLength')
      .mockResolvedValue(4);

    const req = new PassThrough() as PassThrough & {
      setTimeout: jest.Mock;
    };
    req.setTimeout = jest.fn();

    const fakeLib = {
      get: jest.fn((_opts: unknown, cb: (res: any) => void) => {
        const res = new PassThrough() as PassThrough & {
          statusCode?: number;
          headers: Record<string, string>;
          setTimeout: jest.Mock;
        };
        res.statusCode = 200;
        res.headers = { 'content-length': '4' };
        res.setTimeout = jest.fn();

        process.nextTick(() => {
          cb(res);
          res.write(Buffer.from('test'));
          res.end();
        });

        return req;
      }),
    };

    jest.spyOn(service as any, 'getHttpLib').mockReturnValue(fakeLib);

    await (service as any).downloadToFileWithProgress(
      'http://example.com/file.zip',
      '/tmp/addr-test/file.zip',
      1,
      1000,
    );

    expect(fakeLib.get).toHaveBeenCalled();
  });

  it('runs loadAddresses end-to-end with stubs', async () => {
    const qr = {
      connect: jest.fn(),
      query: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };
    const dataSource = {
      createQueryRunner: jest.fn(() => qr),
      query: jest.fn(),
    };

    const { service } = makeServiceWithDataSource({ dataSource });

    jest
      .spyOn(fs.promises, 'mkdtemp')
      .mockResolvedValue('/tmp/addr-test');
    jest.spyOn(fs.promises, 'rm').mockResolvedValue(undefined);

    jest
      .spyOn(service as any, 'createDecoder')
      .mockReturnValue(new TextDecoder('utf-8'));
    jest.spyOn(service as any, 'getDefaultsFromEnv').mockReturnValue({
      chunkSize: 2,
      downloadLogEveryMs: 1,
      downloadTimeoutMs: 1,
      insertLogEveryMs: 0,
      commitEveryBatches: 1,
      dropIndexesDuringImport: true,
      countLinesForPercent: true,
    });
    jest.spyOn(service as any, 'getImportModeFromEnv').mockReturnValue('upsert');
    jest
      .spyOn(service as any, 'buildZipUrl')
      .mockReturnValue('http://example.com/file.zip');
    const setImportStateSpy = jest
      .spyOn(service as any, 'setImportState')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'prepareNextTable')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'downloadToFileWithProgress')
      .mockResolvedValue(undefined);
    const dropIndexesSpy = jest
      .spyOn(service as any, 'dropIndexes')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'countTotalBuildLines')
      .mockResolvedValue(3);

    const roadEntry = {
      path: 'road_code_total.txt',
      type: 'File',
      stream: () => Readable.from(['line']),
    };
    const buildEntry = {
      path: 'build_1.txt',
      type: 'File',
      stream: () => Readable.from(['line']),
    };

    jest
      .spyOn(service as any, 'openZip')
      .mockResolvedValue({ files: [roadEntry, buildEntry] });
    jest
      .spyOn(service as any, 'indexRoadRow')
      .mockReturnValue({ key: '12345|0001', value: buildRoadIndexValue() });
    jest
      .spyOn(service as any, 'forEachLineFromReadableSync')
      .mockImplementation(async (_stream, _decoder, onLine) => {
        onLine('dummy');
      });

    const insertSpy = jest
      .spyOn(service as any, 'insertDocuments')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'processBuildFileBatched')
      .mockImplementation(async (params) => {
        await params.onBatch([{} as any]);
        params.onLineProcessed();
        params.onLineProcessed();
        return { processedLines: 2 };
      });

    jest
      .spyOn(service as any, 'getAddressesCountExact')
      .mockResolvedValue(10n);
    const ensureIndexesSpy = jest
      .spyOn(service as any, 'ensureIndexes')
      .mockResolvedValue(undefined);
    const swapTablesSpy = jest
      .spyOn(service as any, 'swapTables')
      .mockResolvedValue(undefined);

    await (service as any).loadAddresses('202602');

    expect(dropIndexesSpy).toHaveBeenCalledWith('addresses_next');
    expect(insertSpy).toHaveBeenCalled();
    expect(ensureIndexesSpy).toHaveBeenCalledWith('addresses_next');
    expect(swapTablesSpy).toHaveBeenCalled();
    expect(setImportStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'in_progress' }),
    );
    expect(setImportStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' }),
    );
    expect(qr.commitTransaction).toHaveBeenCalled();
    expect(qr.release).toHaveBeenCalled();
  });

  it('marks import as failed when loadAddresses throws', async () => {
    const qr = {
      connect: jest.fn(),
      query: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };
    const dataSource = {
      createQueryRunner: jest.fn(() => qr),
      query: jest.fn(),
    };

    const { service } = makeServiceWithDataSource({ dataSource });

    jest
      .spyOn(fs.promises, 'mkdtemp')
      .mockResolvedValue('/tmp/addr-test');
    jest.spyOn(fs.promises, 'rm').mockResolvedValue(undefined);

    jest
      .spyOn(service as any, 'createDecoder')
      .mockReturnValue(new TextDecoder('utf-8'));
    jest.spyOn(service as any, 'getDefaultsFromEnv').mockReturnValue({
      chunkSize: 2,
      downloadLogEveryMs: 1,
      downloadTimeoutMs: 1,
      insertLogEveryMs: 0,
      commitEveryBatches: 1,
      dropIndexesDuringImport: false,
      countLinesForPercent: false,
    });
    jest.spyOn(service as any, 'getImportModeFromEnv').mockReturnValue('upsert');
    jest
      .spyOn(service as any, 'buildZipUrl')
      .mockReturnValue('http://example.com/file.zip');
    const setImportStateSpy = jest
      .spyOn(service as any, 'setImportState')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'prepareNextTable')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'downloadToFileWithProgress')
      .mockResolvedValue(undefined);

    const roadEntry = {
      path: 'road_code_total.txt',
      type: 'File',
      stream: () => Readable.from(['line']),
    };
    const buildEntry = {
      path: 'build_1.txt',
      type: 'File',
      stream: () => Readable.from(['line']),
    };

    jest
      .spyOn(service as any, 'openZip')
      .mockResolvedValue({ files: [roadEntry, buildEntry] });
    jest
      .spyOn(service as any, 'indexRoadRow')
      .mockReturnValue({ key: '12345|0001', value: buildRoadIndexValue() });
    jest
      .spyOn(service as any, 'forEachLineFromReadableSync')
      .mockImplementation(async (_stream, _decoder, onLine) => {
        onLine('dummy');
      });
    jest
      .spyOn(service as any, 'processBuildFileBatched')
      .mockImplementation(async (params) => {
        await params.onBatch([{} as any]);
        params.onLineProcessed();
        return { processedLines: 1 };
      });
    jest
      .spyOn(service as any, 'insertDocuments')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'getAddressesCountExact')
      .mockResolvedValue(0n);

    await expect((service as any).loadAddresses('202602')).rejects.toThrow(
      'Shadow table is empty after import.',
    );

    expect(setImportStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
    expect(qr.rollbackTransaction).toHaveBeenCalled();
    expect(qr.release).toHaveBeenCalled();
  });
});
