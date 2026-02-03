import { envSchema } from './env.schema';

/**
 * Формирует объект конфигурации приложения из переменных окружения.
 */
export const configuration = () => {
  const env = envSchema.parse(process.env);

  return {
    app: {
      env: env.NODE_ENV,
      port: env.PORT,
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
    },
    mailer: {
      host: env.MAILER_HOST ?? null,
      port: env.MAILER_PORT ?? null,
      user: env.MAILER_USER ?? null,
      password: env.MAILER_PASSWORD ?? null,
      from: env.MAILER_FROM ?? null,
      secure: env.MAILER_SECURE ?? false,
    },
    addressesImport: {
      month: env.ADDRESS_DATA_MONTH ?? null,
      mode: env.ADDRESS_IMPORT_MODE ?? null,
      chunkSize: env.ADDRESS_CHUNK_SIZE ?? null,
      downloadLogEveryMs: env.ADDRESS_DOWNLOAD_LOG_MS ?? null,
      insertLogEveryMs: env.ADDRESS_INSERT_LOG_MS ?? null,
      commitEveryBatches: env.ADDRESS_COMMIT_EVERY_BATCHES ?? null,
      dropIndexes: env.ADDRESS_DROP_INDEXES ?? null,
      countLinesForPercent: env.ADDRESS_COUNT_LINES_FOR_PERCENT ?? null,
    },
  };
};

export type AppConfig = ReturnType<typeof configuration>;
