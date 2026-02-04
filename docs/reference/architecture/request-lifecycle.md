<- [Содержание](../../README.md)

---

# Архитектура: жизненный цикл запроса
Owner: Backend Team
Last reviewed: 2026-02-04

## Цель
Описать путь HTTP-запроса внутри NestJS приложения, включая глобальные пайпы, фильтры, интерсепторы и guard.

## Контекст
Глобальные компоненты настраиваются в `src/main.ts` и `AppModule`.

## Шаги
1. Ознакомьтесь с последовательностью обработки запроса.
2. Проверьте глобальные компоненты и их настройки.

## Последовательность

```mermaid
sequenceDiagram
  participant Client
  participant NestApp
  participant ThrottlerGuard
  participant RequestIdInterceptor
  participant ValidationPipe
  participant Controller
  participant Service
  participant Repository
  participant DB
  participant ExceptionFilter

  Client->>NestApp: HTTP request
  NestApp->>ThrottlerGuard: canActivate()
  ThrottlerGuard-->>NestApp: allow/deny
  NestApp->>RequestIdInterceptor: intercept()
  RequestIdInterceptor->>NestApp: request-id в контекст/заголовок
  NestApp->>ValidationPipe: валидация DTO
  ValidationPipe-->>NestApp: DTO или ошибка
  NestApp->>Controller: метод контроллера
  Controller->>Service: бизнес-логика
  Service->>Repository: запрос данных
  Repository->>DB: SQL через TypeORM
  DB-->>Repository: результаты
  Repository-->>Service: сущности
  Service-->>Controller: DTO/ответ
  Controller-->>NestApp: response
  alt исключение
    NestApp->>ExceptionFilter: catch()
    ExceptionFilter-->>Client: единый формат ошибки
  end
```

## Глобальные компоненты
**ThrottlerGuard**
- Глобальный rate limit для всех эндпоинтов.
- Значения берутся из `THROTTLE_DEFAULT_*`.

**RequestIdInterceptor**
- Читает заголовок `x-request-id`, либо генерирует новый UUID.
- Добавляет `x-request-id` в ответ.
- Хранит идентификатор в `AsyncLocalStorage`, чтобы он попадал в логи.

**ValidationPipe**
- `whitelist: true` — удаляет неизвестные поля.
- `forbidNonWhitelisted: true` — ошибка при наличии лишних полей.
- `transform: true` — приводит типы (например, `limit` к числу).

**HttpExceptionFilter**
- Приводит ошибки к единому формату JSON.
- Логирует 4xx как `warn`, 5xx как `error`.

## Где настраивается
Глобальные пайпы/фильтры/интерсепторы подключаются в `src/main.ts` в функции `setupApp`.
Глобальный guard подключается в `AppModule` через `APP_GUARD`.

## Ограничения
Порядок обработки зависит от NestJS и может меняться при добавлении middleware или новых guard.

## См. также
- [API: обзор](../api/overview.md)
- [Наблюдаемость](../../ops/logging-metrics.md)
