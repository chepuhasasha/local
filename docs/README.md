# Документация проекта
Owner: Platform Team
Last reviewed: 2026-02-04

## Цель
Дать единый, короткий и поддерживаемый вход в документацию сервиса.

## Контекст
Документация организована по типу материала: гайды, how-to, reference, ops и ADR. Каждая страница содержит владельца и дату последней проверки.

## Шаги
1. Если вы впервые в проекте или поднимаете среду — начните с раздела Guide.
2. Если нужно выполнить конкретную задачу — перейдите в How-to.
3. Если нужна справка по API, конфигу или архитектуре — используйте Reference.
4. Для эксплуатации и диагностики используйте Ops.
5. Для понимания принятых решений — ADR.

## Навигация
Guide
- [Быстрый старт](guide/quickstart.md) — запустить API локально за несколько минут.
- [Локальная настройка](guide/local-setup.md) — полный процесс развёртывания для разработки.
- [Скрипты проекта](guide/scripts.md) — список npm-команд.
- [Тестирование](guide/testing.md) — unit и e2e тесты.
- [Правила разработки](guide/development-rules.md) — соглашения и Definition of Done.

How-to
- [Импорт адресов](how-to/addresses-import.md) — запустить и контролировать загрузку данных.

Reference
- [API: обзор](reference/api/overview.md)
- [API: эндпоинты](reference/api/endpoints.md)
- [Архитектура: обзор](reference/architecture/overview.md)
- [Архитектура: карта модулей](reference/architecture/module-map.md)
- [Архитектура: жизненный цикл запроса](reference/architecture/request-lifecycle.md)
- [Конфигурация: переменные окружения](reference/configuration/environment-variables.md)
- [Конфигурация: ConfigModule](reference/configuration/config-module.md)
- [Данные: обзор базы](reference/data/database-overview.md)
- [Данные: модель данных API](reference/data/data-model.md)
- [Данные: сущности](reference/data/entities.md)
- [Данные: миграции и сиды](reference/data/migrations-and-seeds.md)
- [Безопасность: аутентификация](reference/security/authentication.md)
- [Безопасность: авторизация/RBAC](reference/security/authorization-rbac.md)
- [Безопасность: hardening](reference/security/hardening.md)
- [Асинхронные задачи](reference/async/queues-and-jobs.md)
- [Интеграции: внешние сервисы](reference/integrations/external-services.md)
- [Глоссарий](reference/glossary.md)

Ops
- [Деплой: обзор](ops/deployment-guide.md)
- [Деплой: Docker](ops/docker.md)
- [Наблюдаемость](ops/logging-metrics.md)
- [Траблшутинг](ops/troubleshooting.md)

ADR
- [Решения и история](adr/README.md)

## Ограничения
Документация описывает текущее состояние кода. При изменении поведения приложения страницы должны обновляться в том же PR.

## См. также
- [Шаблон страницы](_templates/page.md)
- [Шаблон ADR](_templates/adr.md)
