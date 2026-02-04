import { Throttle } from '@nestjs/throttler';

import { RATE_LIMIT_DEFAULTS } from '@/common/constants/rate-limit.constants';

export type RateLimitKey =
  | 'authEmailStart'
  | 'authEmailVerify'
  | 'authRefresh';

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const ruleMap: Record<
  RateLimitKey,
  {
    ttlEnv: string;
    limitEnv: string;
    fallbackTtl: number;
    fallbackLimit: number;
  }
> = {
  authEmailStart: {
    ttlEnv: 'THROTTLE_AUTH_EMAIL_START_TTL_SECONDS',
    limitEnv: 'THROTTLE_AUTH_EMAIL_START_LIMIT',
    fallbackTtl: RATE_LIMIT_DEFAULTS.authEmailStartTtlSeconds,
    fallbackLimit: RATE_LIMIT_DEFAULTS.authEmailStartLimit,
  },
  authEmailVerify: {
    ttlEnv: 'THROTTLE_AUTH_EMAIL_VERIFY_TTL_SECONDS',
    limitEnv: 'THROTTLE_AUTH_EMAIL_VERIFY_LIMIT',
    fallbackTtl: RATE_LIMIT_DEFAULTS.authEmailVerifyTtlSeconds,
    fallbackLimit: RATE_LIMIT_DEFAULTS.authEmailVerifyLimit,
  },
  authRefresh: {
    ttlEnv: 'THROTTLE_AUTH_REFRESH_TTL_SECONDS',
    limitEnv: 'THROTTLE_AUTH_REFRESH_LIMIT',
    fallbackTtl: RATE_LIMIT_DEFAULTS.authRefreshTtlSeconds,
    fallbackLimit: RATE_LIMIT_DEFAULTS.authRefreshLimit,
  },
};

export const RateLimit = (key: RateLimitKey) => {
  const rule = ruleMap[key];
  return Throttle({
    default: {
      ttl: () =>
        parsePositiveInt(process.env[rule.ttlEnv], rule.fallbackTtl) * 1000,
      limit: () =>
        parsePositiveInt(process.env[rule.limitEnv], rule.fallbackLimit),
    },
  });
};
