<- [Содержание](../../README.md)

---

# Тестирование

Документ описывает, как устроены unit и e2e тесты в проекте.

## Unit tests

- Конфигурация: `test/jest-unit.json`.
- Путь: `test/unit/**/*.spec.ts`.
- Пример: тест для `requestContext`.

## E2E tests

- Конфигурация: `test/jest-e2e.json`.
- Путь: `test/e2e/**/*.e2e-spec.ts`.
- Пример: e2e тест `/health`.

## Запуск

```bash
npm test
npm run test:e2e
```