import {
  buildTypeOrmOptions,
  createDataSource,
} from '@/infrastructure/database/typeorm.config';

const baseDbConfig = {
  postgres: {
    host: 'localhost',
    port: 5432,
    username: 'user',
    password: 'pass',
    database: 'db',
  },
};

describe('typeorm config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('builds options from config service', () => {
    const configService = { get: jest.fn(() => baseDbConfig) };

    const options = buildTypeOrmOptions(configService as any) as any;

    expect(options.type).toBe('postgres');
    expect(options.host).toBe('localhost');
    expect(options.migrations).toEqual([]);
    expect(options.entities?.length).toBeGreaterThan(0);
  });

  it('throws when database config missing', () => {
    const configService = { get: jest.fn(() => null) };

    expect(() => buildTypeOrmOptions(configService as any)).toThrow(
      'Database configuration is missing.',
    );
  });

  it('creates data source with migrations', () => {
    process.env.NODE_ENV = 'test';
    process.env.POSTGRES_HOST = 'localhost';
    process.env.POSTGRES_PORT = '5432';
    process.env.POSTGRES_USER = 'user';
    process.env.POSTGRES_PASSWORD = 'pass';
    process.env.POSTGRES_DB = 'db';

    const dataSource = createDataSource();
    const options = dataSource.options as any;

    expect(options.migrations?.length).toBeGreaterThan(0);
    expect(options.type).toBe('postgres');
  });
});
