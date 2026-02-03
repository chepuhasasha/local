<- [Содержание](../../README.md)

---

# Конфигурация: ConfigModule

Документ описывает, как сервис загружает и валидирует конфигурацию через `@nestjs/config`.

## Как работает загрузка

- `ConfigModule.forRoot` подключается в `AppModule` и в CLI модуле импорта.
- `envFilePath` указывает на `.env` в корне репозитория.
- Валидация выполняется функцией `validateEnv`, которая использует `zod` схему.
- Дополнительные конфигурации формируются функцией `configuration()` и доступны как `app`, `logger`, `database`, `addressesImport`.

## Доступ к настройкам

Примеры использования в коде:

- `ConfigService.get('app', { infer: true })` — чтение `app.port`.
- `ConfigService.get('database', { infer: true })` — параметры PostgreSQL.
- `ConfigService.get('logger', { infer: true })` — уровень логов.
