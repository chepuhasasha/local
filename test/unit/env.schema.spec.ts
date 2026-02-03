import { validateEnv } from '@/config';

const baseEnv: Record<string, unknown> = {
  NODE_ENV: 'development',
  PORT: '3000',
  LOG_LEVEL: 'log',
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: '5432',
  POSTGRES_USER: 'postgres',
  POSTGRES_PASSWORD: 'postgres',
  POSTGRES_DB: 'addresses',
};

describe('env validation', () => {
  it('allows default jwt secret in development', () => {
    expect(() => validateEnv({ ...baseEnv })).not.toThrow();
  });

  it('rejects default jwt secret in production', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        AUTH_JWT_SECRET: 'dev-secret-change-me',
      }),
    ).toThrow(/AUTH_JWT_SECRET/i);
  });

  it('accepts custom jwt secret in production', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        AUTH_JWT_SECRET: 'super-secure-secret-123456',
      }),
    ).not.toThrow();
  });
});
