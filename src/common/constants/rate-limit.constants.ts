export const RATE_LIMIT_DEFAULTS = {
  defaultTtlSeconds: 60,
  defaultLimit: 100,
  authEmailStartTtlSeconds: 300,
  authEmailStartLimit: 5,
  authEmailVerifyTtlSeconds: 300,
  authEmailVerifyLimit: 10,
  authPasswordLoginTtlSeconds: 300,
  authPasswordLoginLimit: 10,
  authRefreshTtlSeconds: 60,
  authRefreshLimit: 30,
};

export type RateLimitDefaults = typeof RATE_LIMIT_DEFAULTS;
