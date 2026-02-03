<- [Содержание](../../README.md)

---

# API: обзор

Документ описывает общие сведения об HTTP API, включая Swagger и формат ошибок.

## Базовая информация

- API запускается NestJS приложением на порту `PORT` (по умолчанию 3000).
- Swagger UI доступен по адресу `/docs`.

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
