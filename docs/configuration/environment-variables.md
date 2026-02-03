<- [Содержание](../../README.md)

---

# Конфигурация: переменные окружения

Документ перечисляет переменные окружения, используемые приложением, и их поведение по умолчанию. Значения берутся из `.env` и `process.env`.

## Базовые переменные приложения

Схема валидации находится в `src/config/env.schema.ts` и применяется при старте приложения и CLI импорта.

| Переменная | Тип/диапазон | Обязательна | По умолчанию | Назначение |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | `development \| production \| test` | нет | `development` | Среда выполнения. |
| `PORT` | `1..65535` | нет | `3000` | HTTP порт API. |
| `LOG_LEVEL` | `log \| error \| warn \| debug \| verbose` | нет | `log` | Уровень логирования. |
| `POSTGRES_HOST` | string | да | — | Хост PostgreSQL. |
| `POSTGRES_PORT` | `1..65535` | да | — | Порт PostgreSQL. |
| `POSTGRES_USER` | string | да | — | Пользователь PostgreSQL. |
| `POSTGRES_PASSWORD` | string | да | — | Пароль PostgreSQL. |
| `POSTGRES_DB` | string | да | — | Имя базы данных. |
| `AUTH_JWT_SECRET` | string (min 16) | нет | `dev-secret-change-me` | Секрет для подписи access-токенов. |
| `AUTH_ACCESS_TTL_SECONDS` | positive int | нет | `900` | TTL access-токена в секундах. |
| `AUTH_REFRESH_TTL_SECONDS` | positive int | нет | `2592000` | TTL refresh-сессии в секундах. |
| `AUTH_OTP_TTL_SECONDS` | positive int | нет | `600` | TTL одноразового кода в секундах. |
| `AUTH_OTP_LENGTH` | `4..10` | нет | `6` | Длина одноразового кода. |
| `MAILER_HOST` | string | нет | — | SMTP host (отправка email включается вместе с `MAILER_PORT` и `MAILER_FROM`). |
| `MAILER_PORT` | `1..65535` | нет | — | SMTP port. |
| `MAILER_USER` | string | нет | — | SMTP user. |
| `MAILER_PASSWORD` | string | нет | — | SMTP password. |
| `MAILER_FROM` | string | нет | — | Адрес отправителя. |
| `MAILER_SECURE` | boolean | нет | `false` | Использовать TLS при отправке. |

Отправка email включается только если заданы `MAILER_HOST`, `MAILER_PORT` и `MAILER_FROM`. `MAILER_USER`/`MAILER_PASSWORD` нужны только если SMTP требует аутентификацию.

## Параметры импорта адресов

Эти переменные опциональны. Если не заданы, используются дефолты из `AddressesImportService`.

| Переменная | Тип | По умолчанию | Назначение |
| --- | --- | --- | --- |
| `ADDRESS_DATA_MONTH` | `YYYYMM` | текущий месяц | Месяц выгрузки адресов для импорта. |
| `ADDRESS_IMPORT_MODE` | `upsert \| replace` | `upsert` | `upsert` обновляет записи по `id`, `replace` предполагает чистую вставку в пустую таблицу. |
| `ADDRESS_CHUNK_SIZE` | positive int | `5000` | Размер батча вставки. |
| `ADDRESS_DOWNLOAD_LOG_MS` | positive int (ms) | `1500` | Частота логов загрузки архива. |
| `ADDRESS_INSERT_LOG_MS` | positive int (ms) | `1500` | Частота логов вставки данных. |
| `ADDRESS_COMMIT_EVERY_BATCHES` | positive int | `40` | Коммит каждые N батчей. |
| `ADDRESS_DROP_INDEXES` | boolean | `true` | Временно удалять индексы на `addresses_next` во время импорта. |
| `ADDRESS_COUNT_LINES_FOR_PERCENT` | boolean | `false` | Считать строки заранее для процента прогресса (медленнее). |

Подробности процесса импорта см. в [Данные: импорт адресов](../data/addresses-import.md).

## Дополнительные переменные без схемы

Переменные ниже используются напрямую через `ConfigService` или `process.env`, но не валидируются схемой.

| Переменная | Назначение | Где используется |
| --- | --- | --- |
| `HEALTH_VERBOSE` | Расширенный ответ `/health/info` (значения `true` или `1`). | `HealthService` |
| `APP_VERSION` | Версия приложения для `/health/info`. | `HealthService` |
| `APP_COMMIT_SHA` | SHA коммита для `/health/info`. | `HealthService` |

## Примеры `.env`

Готовые примеры лежат в корне репозитория:

- `.env.development.example`
- `.env.production.example`
- `.env.test.example`
