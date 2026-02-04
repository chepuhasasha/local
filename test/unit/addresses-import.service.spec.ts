import { Readable } from 'node:stream';

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
    const httpsLib = (service as any).getHttpLib(new URL('https://example.com'));
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
    expect(builds.map((b: any) => b.path)).toEqual(['build_1.txt', 'build_2.txt']);
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

    const sqlUpsert = (service as any).buildUnnestSql(cols, 'upsert', 'addresses');
    const sqlReplace = (service as any).buildUnnestSql(cols, 'replace', 'addresses');

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
