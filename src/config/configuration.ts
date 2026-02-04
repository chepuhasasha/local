import { HTTP_DEFAULTS } from '@/common/constants/http.constants';
import { envSchema } from './env.schema';

const parseCsv = (value?: string): string[] => {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const parseMethods = (value?: string): string[] => {
  const methods = parseCsv(value).map((method) => method.toUpperCase());
  return Array.from(new Set(methods));
};

/**
 * Формирует объект конфигурации приложения из переменных окружения.
 */
export const configuration = () => {
  const env = envSchema.parse(process.env);

  return {
    app: {
      env: env.NODE_ENV,
      port: env.PORT,
      swaggerEnabled:
        typeof env.SWAGGER_ENABLED === 'boolean'
          ? env.SWAGGER_ENABLED
          : env.NODE_ENV !== 'production',
    },
    logger: {
      level: env.LOG_LEVEL,
    },
    database: {
      postgres: {
        host: env.POSTGRES_HOST ?? null,
        port: env.POSTGRES_PORT ?? null,
        username: env.POSTGRES_USER ?? null,
        password: env.POSTGRES_PASSWORD ?? null,
        database: env.POSTGRES_DB ?? null,
      },
    },
    auth: {
      jwtSecret: env.AUTH_JWT_SECRET,
      accessTtlSeconds: env.AUTH_ACCESS_TTL_SECONDS,
      refreshTtlSeconds: env.AUTH_REFRESH_TTL_SECONDS,
      otpTtlSeconds: env.AUTH_OTP_TTL_SECONDS,
      otpLength: env.AUTH_OTP_LENGTH,
      otpCooldownSeconds: env.AUTH_OTP_COOLDOWN_SECONDS,
      otpWindowSeconds: env.AUTH_OTP_WINDOW_SECONDS,
      otpMaxPerWindow: env.AUTH_OTP_MAX_PER_WINDOW,
    },
    rateLimit: {
      defaultTtlSeconds: env.THROTTLE_DEFAULT_TTL_SECONDS,
      defaultLimit: env.THROTTLE_DEFAULT_LIMIT,
      authEmailStartTtlSeconds: env.THROTTLE_AUTH_EMAIL_START_TTL_SECONDS,
      authEmailStartLimit: env.THROTTLE_AUTH_EMAIL_START_LIMIT,
      authEmailVerifyTtlSeconds: env.THROTTLE_AUTH_EMAIL_VERIFY_TTL_SECONDS,
      authEmailVerifyLimit: env.THROTTLE_AUTH_EMAIL_VERIFY_LIMIT,
      authPasswordLoginTtlSeconds:
        env.THROTTLE_AUTH_PASSWORD_LOGIN_TTL_SECONDS,
      authPasswordLoginLimit: env.THROTTLE_AUTH_PASSWORD_LOGIN_LIMIT,
      authRefreshTtlSeconds: env.THROTTLE_AUTH_REFRESH_TTL_SECONDS,
      authRefreshLimit: env.THROTTLE_AUTH_REFRESH_LIMIT,
      trustProxy: env.THROTTLE_TRUST_PROXY ?? false,
    },
    mailer: {
      host: env.MAILER_HOST ?? null,
      port: env.MAILER_PORT ?? null,
      user: env.MAILER_USER ?? null,
      password: env.MAILER_PASSWORD ?? null,
      from: env.MAILER_FROM ?? null,
      secure: env.MAILER_SECURE ?? false,
    },
    http: {
      securityHeaders: {
        contentSecurityPolicy: HTTP_DEFAULTS.contentSecurityPolicy,
      },
      cors: {
        allowedOrigins: parseCsv(env.CORS_ALLOWED_ORIGINS),
        allowedMethods: parseMethods(env.CORS_ALLOWED_METHODS),
        allowCredentials: env.CORS_ALLOW_CREDENTIALS ?? false,
      },
      bodyParser: {
        jsonLimitBytes:
          env.HTTP_JSON_BODY_LIMIT_BYTES ?? HTTP_DEFAULTS.jsonBodyLimitBytes,
        urlencodedLimitBytes:
          env.HTTP_URLENCODED_BODY_LIMIT_BYTES ??
          HTTP_DEFAULTS.urlencodedBodyLimitBytes,
      },
    },
    addressesImport: {
      month: env.ADDRESS_DATA_MONTH ?? null,
      mode: env.ADDRESS_IMPORT_MODE ?? null,
      chunkSize: env.ADDRESS_CHUNK_SIZE ?? null,
      downloadLogEveryMs: env.ADDRESS_DOWNLOAD_LOG_MS ?? null,
      downloadTimeoutMs: env.ADDRESS_DOWNLOAD_TIMEOUT_MS ?? null,
      insertLogEveryMs: env.ADDRESS_INSERT_LOG_MS ?? null,
      commitEveryBatches: env.ADDRESS_COMMIT_EVERY_BATCHES ?? null,
      dropIndexes: env.ADDRESS_DROP_INDEXES ?? null,
      countLinesForPercent: env.ADDRESS_COUNT_LINES_FOR_PERCENT ?? null,
    },
  };
};

export type AppConfig = ReturnType<typeof configuration>;
