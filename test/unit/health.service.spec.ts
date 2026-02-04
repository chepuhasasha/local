import { HealthService } from '@/modules/health/health.service';

const makeService = (
  configValue?: string,
  dataSource?: any,
  dbTimeoutMs?: string,
) => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'HEALTH_VERBOSE') return configValue;
      if (key === 'HEALTH_DB_TIMEOUT_MS') return dbTimeoutMs;
      return undefined;
    }),
  };

  const service = new HealthService(config as any, dataSource as any);
  return { service, config };
};

describe('HealthService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });
  it('returns liveness response', () => {
    const { service } = makeService();
    const response = service.getLiveness();

    expect(response.status).toBe('ok');
    expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
  });

  it('returns info without verbose fields', () => {
    const { service } = makeService();
    const info = service.getInfo();

    expect(info.status).toBe('ok');
    expect(info.env).toBeUndefined();
    expect(info.version).toBeUndefined();
  });

  it('returns info with verbose fields', () => {
    process.env.NODE_ENV = 'test';
    process.env.APP_VERSION = '1.2.3';
    process.env.APP_COMMIT_SHA = 'abc';

    const { service } = makeService('true');
    const info = service.getInfo();

    expect(info.env).toBe('test');
    expect(info.version).toBe('1.2.3');
    expect(info.commitSha).toBe('abc');
  });

  it('returns readiness degraded when no datasource', async () => {
    const { service } = makeService();
    const readiness = await service.getReadiness();

    expect(readiness.status).toBe('degraded');
    expect(readiness.checks[0].status).toBe('skip');
  });

  it('returns readiness ok when db healthy', async () => {
    const dataSource = { query: jest.fn().mockResolvedValue([1]) };
    const { service } = makeService(undefined, dataSource);

    const readiness = await service.getReadiness();

    expect(readiness.status).toBe('ok');
    expect(readiness.checks[0].status).toBe('ok');
  });

  it('returns readiness fail when db query throws', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('down')),
    };
    const { service } = makeService(undefined, dataSource);

    const readiness = await service.getReadiness();

    expect(readiness.status).toBe('fail');
    expect(readiness.checks[0].status).toBe('fail');
    expect(readiness.checks[0].details?.error).toMatch(/down/);
  });

  it('returns readiness fail when db check times out', async () => {
    const dataSource = {
      query: jest.fn(
        () => new Promise((resolve) => setTimeout(() => resolve([1]), 50)),
      ),
    };
    const { service } = makeService(undefined, dataSource, '10');

    const readiness = await service.getReadiness();

    expect(readiness.status).toBe('fail');
    expect(readiness.checks[0].status).toBe('fail');
    expect(readiness.checks[0].details?.error).toMatch(/timed out/i);
  });
});
