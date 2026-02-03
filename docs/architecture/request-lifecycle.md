<- [Содержание](../../README.md)

---

# Архитектура: жизненный цикл запроса

Документ описывает путь HTTP-запроса внутри NestJS приложения, включая глобальные перехватчики и фильтры.

## Последовательность

```mermaid
sequenceDiagram
  participant Client
  participant NestApp
  participant RequestIdInterceptor
  participant ValidationPipe
  participant Controller
  participant Service
  participant Repository
  participant DB
  participant ExceptionFilter

  Client->>NestApp: HTTP request
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

- **ValidationPipe**: `whitelist`, `transform`, `forbidNonWhitelisted`.
- **HttpExceptionFilter**: единый JSON-ответ и логирование.
- **RequestIdInterceptor**: заголовок `x-request-id` и AsyncLocalStorage контекст.
