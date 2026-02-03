<- [Содержание](../../README.md)

---

# Безопасность: hardening

Документ фиксирует текущие меры защиты и настройки безопасности приложения.

## Текущее состояние

- **Валидация входящих данных**: глобальный `ValidationPipe` с `whitelist`, `transform`, `forbidNonWhitelisted`.
- **Единый формат ошибок**: `HttpExceptionFilter` формирует стандартизированный JSON и логирует ошибки.
- **Request ID**: `RequestIdInterceptor` добавляет `x-request-id` и хранит его в AsyncLocalStorage.

