<- [Содержание](../../README.md)

---

# Скрипты проекта

Список npm-скриптов и их назначение. Команды берутся из `package.json`.

## Основные команды

| Скрипт | Назначение |
| --- | --- |
| `npm run start` | Запуск NestJS приложения. |
| `npm run start:dev` | Запуск в режиме watch. |
| `npm run start:debug` | Запуск в режиме debug + watch. |
| `npm run start:prod` | Запуск собранного приложения из `dist`. |
| `npm run build` | Сборка TypeScript в `dist`. |
| `npm run format` | Форматирование `src/**/*.ts` и `test/**/*.ts`. |
| `npm run lint` | Линтинг `src` и `test`. |
| `npm test` | Unit-тесты. |
| `npm run test:e2e` | E2E-тесты. |
| `npm run test:watch` | Jest watch режим. |
| `npm run test:cov` | Покрытие тестами. |
| `npm run test:debug` | Запуск Jest с Node Inspector. |
| `npm run import:addresses:dev` | Локальный импорт адресов (ts-node). |
| `npm run import:addresses` | Импорт адресов в production-сборке. |

