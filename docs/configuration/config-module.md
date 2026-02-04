<- [Содержание](../../README.md)

---

# Конфигурация: ConfigModule

Документ описывает, как сервис загружает и валидирует конфигурацию через `@nestjs/config`.

## Где подключается

- **HTTP приложение**: `AppModule`.
- **CLI импорт адресов**: `AddressesImportModule`.

В обоих случаях используется один и тот же механизм загрузки.

## Порядок загрузки

1) Читается файл `.env` из корня репозитория (`envFilePath: '.env'`).
2) Значения валидируются функцией `validateEnv` (Zod-схема в `env.schema.ts`).
3) Формируется объект конфигурации `configuration()`.
4) `ConfigService` предоставляет доступ к сгруппированным настройкам.

Если валидация не проходит, приложение падает при старте с ошибкой `Ошибка валидации env`.

## Структура конфигурации

`configuration()` формирует следующие группы:

```ts
{
  app: {
    env: 'development' | 'production' | 'test',
    port: number,
  },
  logger: {
    level: 'log' | 'error' | 'warn' | 'debug' | 'verbose',
  },
  database: {
    postgres: {
      host: string,
      port: number,
      username: string,
      password: string,
      database: string,
    }
  },
  auth: {
    jwtSecret: string,
    accessTtlSeconds: number,
    refreshTtlSeconds: number,
    otpTtlSeconds: number,
    otpLength: number,
  },
  rateLimit: {
    defaultTtlSeconds: number,
    defaultLimit: number,
    authEmailStartTtlSeconds: number,
    authEmailStartLimit: number,
    authEmailVerifyTtlSeconds: number,
    authEmailVerifyLimit: number,
    authRefreshTtlSeconds: number,
    authRefreshLimit: number,
    trustProxy: boolean,
  },
  mailer: {
    host: string | null,
    port: number | null,
    user: string | null,
    password: string | null,
    from: string | null,
    secure: boolean,
  },
  addressesImport: {
    month: string | null,
    mode: 'upsert' | 'replace' | null,
    chunkSize: number | null,
    downloadLogEveryMs: number | null,
    insertLogEveryMs: number | null,
    commitEveryBatches: number | null,
    dropIndexes: boolean | null,
    countLinesForPercent: boolean | null,
  }
}
```

## Примеры доступа

- `ConfigService.get('app', { infer: true })` → `app.port`.
- `ConfigService.get('database', { infer: true })` → параметры PostgreSQL.
- `ConfigService.get('addressesImport', { infer: true })` → настройки импорта.

## Как добавить новую настройку

1) Добавьте переменную в `env.schema.ts`.
2) Прокиньте её в `configuration()`.
3) Обновите документацию в [Конфигурация: переменные окружения](environment-variables.md).
