<- [Содержание](../README.md)

---

# Тестирование
Owner: Backend Team
Last reviewed: 2026-02-04

## Цель
Зафиксировать, какие тесты есть в проекте и как их запускать.

## Контекст
В проекте используются unit и e2e тесты на Jest. E2E требуют доступной PostgreSQL.

## Шаги
1. Для быстрых проверок запускайте unit-тесты.
2. Для проверки API и интеграций запускайте e2e.

## Unit tests
- Конфигурация: `test/jest-unit.json`.
- Путь: `test/unit/**/*.spec.ts`.
- Цель: проверка отдельных функций и утилит без внешних зависимостей.

## E2E tests
- Конфигурация: `test/jest-e2e.json`.
- Путь: `test/e2e/**/*.e2e-spec.ts`.
- Запускают реальный NestJS модуль.

### Окружение для e2e
Минимальные переменные:
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

Пример есть в `test/e2e/health.e2e-spec.ts`.

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

## Ограничения
E2E тесты используют реальную БД. Перед запуском убедитесь, что она доступна.

## См. также
- [Скрипты проекта](scripts.md)
- [Траблшутинг](../ops/troubleshooting.md)
