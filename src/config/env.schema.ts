import { z } from 'zod';

/**
 * Схема переменных окружения приложения.
 */
export const envSchema = z.object({
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
