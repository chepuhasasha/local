import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { RATE_LIMIT_DEFAULTS } from '@/common/constants/rate-limit.constants';

jest.mock('@nestjs/throttler', () => ({
  Throttle: jest.fn((options) => options),
}));

describe('RateLimit decorator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses defaults when env values are invalid', () => {
    process.env.THROTTLE_AUTH_EMAIL_START_TTL_SECONDS = '0';
    process.env.THROTTLE_AUTH_EMAIL_START_LIMIT = '-5';

    const options = RateLimit('authEmailStart') as any;

    expect(options.default.ttl()).toBe(
      RATE_LIMIT_DEFAULTS.authEmailStartTtlSeconds * 1000,
    );
    expect(options.default.limit()).toBe(
      RATE_LIMIT_DEFAULTS.authEmailStartLimit,
    );
  });

  it('uses env values when valid', () => {
    process.env.THROTTLE_AUTH_EMAIL_VERIFY_TTL_SECONDS = '3';
    process.env.THROTTLE_AUTH_EMAIL_VERIFY_LIMIT = '7';

    const options = RateLimit('authEmailVerify') as any;

    expect(options.default.ttl()).toBe(3000);
    expect(options.default.limit()).toBe(7);
  });

  it('uses env values for password login', () => {
    process.env.THROTTLE_AUTH_PASSWORD_LOGIN_TTL_SECONDS = '120';
    process.env.THROTTLE_AUTH_PASSWORD_LOGIN_LIMIT = '4';

    const options = RateLimit('authPasswordLogin') as any;

    expect(options.default.ttl()).toBe(120000);
    expect(options.default.limit()).toBe(4);
  });
});
