<- [Содержание](../../README.md)

---

# Наблюдаемость: логирование и метрики

Документ описывает текущие механизмы логирования и мониторинга.

## Логирование

Используется `AppLoggerService` (обёртка над `ConsoleLogger`).

### Уровни логов

`LOG_LEVEL` управляет набором уровней:

| `LOG_LEVEL` | Включённые уровни |
| --- | --- |
| `error` | `error` |
| `warn` | `error`, `warn` |
| `log` | `error`, `warn`, `log` |
| `debug` | `error`, `warn`, `log`, `debug` |
| `verbose` | `error`, `warn`, `log`, `debug`, `verbose` |

### Request ID

Если запрос содержит заголовок `x-request-id`, он попадёт в логи. Если нет — идентификатор будет сгенерирован автоматически.

Пример формата:

```
[request_id=123e4567-e89b-12d3-a456-426614174000] message
```

## Метрики и трассировка

- Метрики и tracing не реализованы.
- Единственные системные проверки — health endpoints.

## Health endpoints

- `/health` — liveness.
- `/health/info` — диагностическая информация.
- `/health/ready` — readiness.

Контракты см. в [API: эндпоинты](../api/endpoints.md).
