<- [Содержание](../../README.md)

---

# Архитектура: карта модулей

Документ фиксирует NestJS модули и их зависимости. В проекте есть два контекста: HTTP приложение и CLI импорт.

## HTTP приложение

```mermaid
graph TD
  AppModule --> ConfigModule
  AppModule --> LoggerModule
  AppModule --> DatabaseModule
  AppModule --> AddressesModule
  AppModule --> HealthModule

  AddressesModule --> TypeOrmModule
  AddressesModule --> AddressEntity

  DatabaseModule --> TypeOrmModule
  DatabaseModule --> ConfigModule

  LoggerModule --> ConfigModule
```

### Модули и назначение

**AppModule**
- Корневой модуль HTTP-приложения.
- Подключает конфигурацию, логирование, БД и доменные модули.
- Регистрирует `HttpExceptionFilter` как глобальный провайдер.

**AddressesModule**
- Поиск адресов.
- Содержит контроллер, сервис и репозиторий.

**HealthModule**
- Health endpoints (`/health`, `/health/info`, `/health/ready`).

**DatabaseModule**
- Глобальный доступ к TypeORM `DataSource`.

**LoggerModule**
- Единый логгер `AppLoggerService`.

## CLI импорт адресов

```mermaid
graph TD
  AddressesImportModule --> ConfigModule
  AddressesImportModule --> LoggerModule
  AddressesImportModule --> DatabaseModule
  AddressesImportModule --> AddressesImportService

  DatabaseModule --> TypeOrmModule
  LoggerModule --> ConfigModule
```

### Особенности CLI

- Поднимается через `createApplicationContext`, без HTTP сервера.
- Использует те же `ConfigModule`, `LoggerModule` и `DatabaseModule`.
- Единственный бизнес-провайдер — `AddressesImportService`.

Подробнее см. [Данные: импорт адресов](../data/addresses-import.md).
