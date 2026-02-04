<- [Содержание](../../README.md)

---

# API: обзор
Owner: Backend Team
Last reviewed: 2026-02-04

## Цель
Описать общие правила HTTP API: базовые настройки, формат ошибок, валидацию и аутентификацию.

## Контекст
Документ покрывает только общие правила. Подробные контракты эндпоинтов — в [API: эндпоинты](endpoints.md).

## Шаги
1. Ознакомьтесь с базовыми правилами и форматом ошибок.
2. Проверьте требования к аутентификации и лимитам.
3. Перейдите к конкретным эндпоинтам.

## Базовая информация
- API запускается NestJS приложением на порту `PORT` (по умолчанию 3000).
- Базовый URL локально: `http://localhost:3000`.
- Swagger UI доступен по адресу `/docs`, если `SWAGGER_ENABLED=true` или `NODE_ENV != production`.
- Все запросы и ответы используют JSON.

## Идентификатор запроса
- Заголовок `x-request-id` может быть передан клиентом.
- Если заголовка нет, идентификатор генерируется автоматически.
- `x-request-id` возвращается в каждом ответе и попадает в логи.

## Валидация
- Все входные DTO валидируются глобальным `ValidationPipe`.
- Лишние поля запрещены (`forbidNonWhitelisted: true`).
- Ошибки валидации возвращают `400 BadRequest`.

## Rate limiting
- Глобальный лимит по умолчанию: `THROTTLE_DEFAULT_TTL_SECONDS` и `THROTTLE_DEFAULT_LIMIT`.
- Для `/auth/email/start`, `/auth/email/verify`, `/auth/refresh` применяются отдельные лимиты.
- Внутри Auth также действует лимит OTP (cooldown + окно).

## Формат ошибок
`HttpExceptionFilter` возвращает ошибки в виде JSON:

```json
{
  "statusCode": 400,
  "error": "BadRequestException",
  "message": "...",
  "path": "/addresses/search",
  "requestId": "...",
  "timestamp": "..."
}
```

Особенности:
- Для 5xx ошибок `error` = `InternalServerError`, `message` = `Internal server error`.
- Поле `message` может быть строкой или массивом сообщений валидации.

## Аутентификация
- `/auth/me` и `/auth/logout` требуют `Authorization: Bearer <access_token>`.
- Остальные эндпоинты публичны.
- Подробнее — в [Безопасность: аутентификация](../security/authentication.md).

## Ограничения
Документ не заменяет контракт конкретных эндпоинтов и схем DTO.

## См. также
- [API: эндпоинты](endpoints.md)
- [Переменные окружения](../configuration/environment-variables.md)
- [Безопасность: hardening](../security/hardening.md)
