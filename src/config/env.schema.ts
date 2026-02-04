import { z } from 'zod';

const emptyToUndefined = (value: unknown): unknown => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  return value;
};

const optionalString = () =>
  z.preprocess(emptyToUndefined, z.string().min(1).optional());

const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(min).max(max).optional(),
  );

const parseBoolean = (value: unknown): unknown => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }
  return value;
};

const optionalBoolean = () =>
  z.preprocess(parseBoolean, z.boolean().optional());

/**
 * Схема переменных окружения приложения.
 */
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z
      .enum(['log', 'error', 'warn', 'debug', 'verbose'])
      .default('log'),
    POSTGRES_HOST: z.string().min(1),
    POSTGRES_PORT: z.coerce.number().int().min(1).max(65535),
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PASSWORD: z.string().min(1),
    POSTGRES_DB: z.string().min(1),
    AUTH_JWT_SECRET: z.string().min(16).default('dev-secret-change-me'),
    AUTH_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    AUTH_REFRESH_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 24 * 30),
    AUTH_OTP_TTL_SECONDS: z.coerce.number().int().positive().default(600),
    AUTH_OTP_LENGTH: z.coerce.number().int().min(4).max(10).default(6),
    AUTH_OTP_COOLDOWN_SECONDS: z.coerce.number().int().min(0).default(60),
    AUTH_OTP_WINDOW_SECONDS: z.coerce.number().int().min(0).default(3600),
    AUTH_OTP_MAX_PER_WINDOW: z.coerce.number().int().min(0).default(5),
    MAILER_HOST: optionalString(),
    MAILER_PORT: optionalNumber(1, 65535),
    MAILER_USER: optionalString(),
    MAILER_PASSWORD: optionalString(),
    MAILER_FROM: optionalString(),
    MAILER_SECURE: optionalBoolean(),
    SWAGGER_ENABLED: optionalBoolean(),
    HEALTH_DB_TIMEOUT_MS: z.coerce.number().int().min(1).optional(),
    ADDRESS_DATA_MONTH: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
    ADDRESS_IMPORT_MODE: z.enum(['upsert', 'replace']).optional(),
    ADDRESS_CHUNK_SIZE: z.coerce.number().int().positive().optional(),
    ADDRESS_DOWNLOAD_LOG_MS: z.coerce.number().int().positive().optional(),
    ADDRESS_INSERT_LOG_MS: z.coerce.number().int().positive().optional(),
    ADDRESS_COMMIT_EVERY_BATCHES: z.coerce.number().int().positive().optional(),
    ADDRESS_DROP_INDEXES: z.coerce.boolean().optional(),
    ADDRESS_COUNT_LINES_FOR_PERCENT: z.coerce.boolean().optional(),
    ADDRESS_DOWNLOAD_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      const secret = env.AUTH_JWT_SECRET;
      if (!secret || secret === 'dev-secret-change-me') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AUTH_JWT_SECRET'],
          message:
            'AUTH_JWT_SECRET must be set to a secure value in production.',
        });
      }
    }
  });

export type EnvSchema = z.infer<typeof envSchema>;

/**
 * Валидирует переменные окружения и выбрасывает ошибку при несоответствии.
 */
export const validateEnv = (config: Record<string, unknown>): EnvSchema => {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `- ${issue.message}`)
      .join('\n');
    throw new Error(`Ошибка валидации env:\n${issues}`);
  }

  return result.data;
};
