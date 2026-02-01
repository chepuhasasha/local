# Архитектура и правила структуры

## Структура проекта

```
src/
  main.ts
  app.module.ts

  config/
    configuration.ts
    env.schema.ts
    index.ts

  common/
    constants/
    decorators/
    filters/
    guards/
    interceptors/
    pipes/
    utils/
    types/

  infrastructure/
    database/
      database.module.ts
      typeorm.config.ts
      migrations/
    http/
    observability/
      logger.module.ts
      logger.service.ts

  modules/
    addresses/
      addresses.module.ts
      addresses.controller.ts
      addresses.service.ts
      addresses.loader.service.ts
      dto/
      entities/
      repositories/
      types/
    health/
      health.module.ts
      health.controller.ts

test/
  unit/
  e2e/
```

## Правила зависимостей

- **Feature-first**: бизнес-домены живут в `src/modules/<feature>`.
- **Общие компоненты** (filters/pipes/interceptors/utils/types) — только в `src/common`.
- **Инфраструктура** (DB, логирование, внешние клиенты) — в `src/infrastructure`.
- **Контроллеры** обращаются только к сервисам (не к репозиториям/ORM напрямую).
- **Взаимодействие между модулями** — через экспортируемые сервисы или интерфейсы.
- **Импорты между фичами** запрещены напрямую, если нет явной договорённости через модуль.

## Конфигурация

- `ConfigModule` загружается глобально и валидирует env через `zod`.
- Опасные переменные без дефолтов не имеют fallback-значений и валидируются при старте.

## Валидация и ошибки

- Глобальный `ValidationPipe`: `whitelist`, `transform`, `forbidNonWhitelisted`.
- DTO живут в `dto/` и используют `class-validator`.
- Единый формат ошибок обеспечивается глобальным `HttpExceptionFilter`.

## Логирование и request-id

- Логирование централизовано в `infrastructure/observability`.
- Каждый запрос получает `request-id`, добавляется в заголовок и в логи.

## База данных

- Миграции выполняются через единый `typeorm.config.ts`.
