<- [Содержание](../../README.md)

---

# Тестирование

Документ описывает, как устроены unit и e2e тесты в проекте и как их запускать.

## Unit tests

- Конфигурация: `test/jest-unit.json`.
- Путь: `test/unit/**/*.spec.ts`.
- Цель: проверка отдельных функций и утилит без внешних зависимостей.

## E2E tests

- Конфигурация: `test/jest-e2e.json`.
- Путь: `test/e2e/**/*.e2e-spec.ts`.
- Запускают реальный NestJS модуль.

### Важно про окружение

E2E тесты требуют доступного PostgreSQL, потому что `AppModule` поднимает `DatabaseModule`.

Минимальные переменные окружения для теста:

- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

Пример установки переменных можно найти в `test/e2e/health.e2e-spec.ts`.

## Запуск

```bash
npm test
npm run test:e2e
```

Дополнительные режимы:

```bash
npm run test:watch
npm run test:cov
npm run test:debug
```
