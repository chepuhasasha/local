<- [Содержание](../../README.md)

---

# Конфигурация: переменные окружения

Документ перечисляет переменные окружения, используемые приложением, и источники валидации. Значения берутся из `.env` и `process.env`.

## Переменные, валидируемые схемой

Схема находится в `src/config/env.schema.ts` и применяется при старте приложения.

| Переменная                        | Тип/диапазон                               | Назначение                               | Пример        |
| --------------------------------- | ------------------------------------------ | ---------------------------------------- | ------------- |
| `NODE_ENV`                        | `development \| production \| test`        | Среда выполнения.                        | `development` |
| `PORT`                            | `1..65535`                                 | HTTP порт API.                           | `3000`        |
| `LOG_LEVEL`                       | `log \| error \| warn \| debug \| verbose` | Уровень логирования.                     | `debug`       |
| `POSTGRES_HOST`                   | string                                     | Хост PostgreSQL.                         | `localhost`   |
| `POSTGRES_PORT`                   | `1..65535`                                 | Порт PostgreSQL.                         | `5432`        |
| `POSTGRES_USER`                   | string                                     | Пользователь PostgreSQL.                 | `postgres`    |
| `POSTGRES_PASSWORD`               | string                                     | Пароль PostgreSQL.                       | `postgres`    |
| `POSTGRES_DB`                     | string                                     | Имя базы данных.                         | `addresses`   |
| `ADDRESS_DATA_MONTH`              | `YYYYMM`                                   | Месяц выгрузки адресов для импорта.      | `202512`      |
| `ADDRESS_IMPORT_MODE`             | `upsert \| replace`                        | Режим импорта.                           | `upsert`      |
| `ADDRESS_CHUNK_SIZE`              | positive int                               | Размер батча импорта.                    | `5000`        |
| `ADDRESS_DOWNLOAD_LOG_MS`         | positive int                               | Частота логов загрузки (мс).             | `1500`        |
| `ADDRESS_INSERT_LOG_MS`           | positive int                               | Частота логов вставки (мс).              | `1500`        |
| `ADDRESS_COMMIT_EVERY_BATCHES`    | positive int                               | Коммит каждые N батчей.                  | `40`          |
| `ADDRESS_DROP_INDEXES`            | boolean                                    | Временное удаление индексов при импорте. | `true`        |
| `ADDRESS_COUNT_LINES_FOR_PERCENT` | boolean                                    | Подсчёт строк для прогресса.             | `false`       |

## Дополнительные переменные без схемы

Переменные ниже используются в коде напрямую (через `ConfigService` или `process.env`), но не валидируются схемой `zod`.

| Переменная       | Назначение                                      | Где используется |
| ---------------- | ----------------------------------------------- | ---------------- |
| `HEALTH_VERBOSE` | Включает расширенную информацию `/health/info`. | `HealthService`  |
| `APP_VERSION`    | Версия приложения для `/health/info`.           | `HealthService`  |
| `APP_COMMIT_SHA` | Коммит SHA для `/health/info`.                  | `HealthService`  |

## Примеры `.env`

Готовые примеры лежат в корне репозитория:

- `.env.development.example`
- `.env.production.example`
- `.env.test.example`
