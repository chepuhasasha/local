<- [Содержание](../../README.md)

---

# Безопасность: аутентификация

Документ фиксирует текущий статус аутентификации и места, где её нужно добавить при появлении требований.

## Текущее состояние

- Реализованы эндпоинты `/auth/*` (register, email + OTP, refresh, logout, `/auth/me`).
- Access-токены (`Bearer`) используются для авторизации `/auth/me` и `/auth/logout`.
- Refresh-токены хранятся как хэш в `auth_session`.
- Доменные таблицы и сервисы для identity/OTP/сессий добавлены.
- Остальные эндпоинты публичны и не требуют токена.
- В non-production OTP возвращается в ответе; если SMTP не настроен, код дополнительно логируется и письмо не отправляется.
- В production требуется настроенный SMTP (минимум `MAILER_HOST`, `MAILER_PORT`, `MAILER_FROM`; опционально `MAILER_USER`/`MAILER_PASSWORD`). Если он не настроен, `/auth/email/start` завершится ошибкой и код не будет выдан.

**Заголовок для access-токена:**

```
Authorization: Bearer <access_token>
```

## Состав модуля Auth

- `AuthController` — HTTP точки входа `/auth/*`.
- `AuthService` — бизнес-логика OTP, сессий и JWT.
- Репозитории: `AuthIdentitiesRepository`, `AuthOtpsRepository`, `AuthSessionsRepository`.
- Сущности: `AuthIdentityEntity`, `AuthOtpEntity`, `AuthSessionEntity`.
- `AccessTokenGuard` — проверяет access-токен и кладёт пользователя в `request.auth`.
- `CurrentUser` — декоратор для получения пользователя из контекста.
- `MailerService` — отправка OTP, используется только если настроен SMTP.

## Потоки аутентификации

## Схемы

### Общее устройство

```mermaid
flowchart TD
  Client["Client"] -->|"POST /auth/register"| AuthController
  Client -->|"POST /auth/email/start"| AuthController
  Client -->|"POST /auth/email/verify"| AuthController
  Client -->|"POST /auth/refresh"| AuthController
  Client -->|"POST /auth/logout"| AuthController
  Client -->|"GET /auth/me (Bearer)"| AccessTokenGuard

  AuthController --> AuthService
  AccessTokenGuard --> AuthService

  AuthService --> AuthIdentitiesRepository
  AuthService --> AuthOtpsRepository
  AuthService --> AuthSessionsRepository
  AuthService --> UsersService
  AuthService --> MailerService

  AuthIdentitiesRepository --> DB[(PostgreSQL)]
  AuthOtpsRepository --> DB
  AuthSessionsRepository --> DB
  UsersService --> DB
  MailerService --> SMTP[(SMTP)]
```

### Регистрация пользователя (`/auth/register`)

```mermaid
sequenceDiagram
  participant Client
  participant AuthController
  participant AuthService
  participant UsersService
  participant AuthIdentitiesRepository
  participant DB

  Client->>AuthController: POST /auth/register
  AuthController->>AuthService: registerUser(email, display_name, marketing_opt_in)
  AuthService->>AuthIdentitiesRepository: findActiveByProvider(email)
  AuthIdentitiesRepository->>DB: SELECT auth_identity
  alt identity exists
    AuthService-->>AuthController: 400 BadRequest
  else identity missing
    AuthService->>UsersService: create user + consents
    UsersService->>DB: INSERT users
    AuthService->>AuthIdentitiesRepository: create identity
    AuthIdentitiesRepository->>DB: INSERT auth_identity
    AuthService-->>AuthController: user
    AuthController-->>Client: 201 Created
  end
```

### Запрос OTP по email (`/auth/email/start`)

```mermaid
sequenceDiagram
  participant Client
  participant AuthController
  participant AuthService
  participant UsersService
  participant AuthIdentitiesRepository
  participant AuthOtpsRepository
  participant MailerService
  participant DB

  Client->>AuthController: POST /auth/email/start
  AuthController->>AuthService: startEmailAuth(email)
  AuthService->>AuthIdentitiesRepository: findActiveByProvider(email)
  AuthIdentitiesRepository->>DB: SELECT auth_identity
  alt identity not found
    AuthService-->>AuthController: 404 NotFound
  else identity found
    AuthService->>UsersService: get user
    UsersService->>DB: SELECT users
    AuthService->>AuthOtpsRepository: create OTP (hash + expires)
    AuthOtpsRepository->>DB: INSERT auth_otp
    AuthService->>MailerService: sendOtpEmail
    MailerService-->>AuthService: ok or throw in production
    AuthService-->>AuthController: identity_id, otp_id, expires_at, code?
    AuthController-->>Client: 200 OK
  end
```

### Проверка OTP и выдача токенов (`/auth/email/verify`)

```mermaid
sequenceDiagram
  participant Client
  participant AuthController
  participant AuthService
  participant AuthIdentitiesRepository
  participant AuthOtpsRepository
  participant AuthSessionsRepository
  participant UsersService
  participant DB

  Client->>AuthController: POST /auth/email/verify
  AuthController->>AuthService: verifyEmailOtp(email, code)
  AuthService->>AuthIdentitiesRepository: findActiveByProvider(email)
  AuthIdentitiesRepository->>DB: SELECT auth_identity
  AuthService->>UsersService: get user
  UsersService->>DB: SELECT users
  AuthService->>AuthOtpsRepository: findActiveByIdentityAndHash
  AuthOtpsRepository->>DB: SELECT auth_otp (valid + not consumed)
  AuthService->>AuthOtpsRepository: consumeOtp
  AuthOtpsRepository->>DB: UPDATE auth_otp
  AuthService->>AuthIdentitiesRepository: markIdentityVerified
  AuthIdentitiesRepository->>DB: UPDATE auth_identity
  AuthService->>AuthSessionsRepository: create session (refresh_hash)
  AuthSessionsRepository->>DB: INSERT auth_session
  AuthService-->>AuthController: access + refresh tokens
  AuthController-->>Client: 200 OK
```

### Обновление refresh-сессии (`/auth/refresh`)

```mermaid
sequenceDiagram
  participant Client
  participant AuthController
  participant AuthService
  participant AuthSessionsRepository
  participant DB

  Client->>AuthController: POST /auth/refresh
  AuthController->>AuthService: refreshSession(session_id, refresh_token)
  AuthService->>AuthSessionsRepository: findById
  AuthSessionsRepository->>DB: SELECT auth_session
  alt revoked or expired or invalid token
    AuthService-->>AuthController: 401 Unauthorized
    AuthController-->>Client: error
  else ok
    AuthService->>AuthSessionsRepository: rotate refresh_hash + update last_seen_at
    AuthSessionsRepository->>DB: UPDATE auth_session
    AuthService-->>AuthController: new access + refresh
    AuthController-->>Client: 200 OK
  end
```

### Проверка access-токена (`AccessTokenGuard`)

```mermaid
sequenceDiagram
  participant Client
  participant AccessTokenGuard
  participant AuthService
  participant AuthSessionsRepository
  participant UsersService
  participant DB

  Client->>AccessTokenGuard: Authorization: Bearer <token>
  AccessTokenGuard->>AuthService: authenticateAccessToken(token)
  AuthService->>AuthSessionsRepository: findById(payload.sid)
  AuthSessionsRepository->>DB: SELECT auth_session
  AuthService->>UsersService: getById(session.user_id)
  UsersService->>DB: SELECT users
  AuthService-->>AccessTokenGuard: { userId, sessionId }
  AccessTokenGuard-->>Client: proceed to controller
```

### 1) Регистрация пользователя (`POST /auth/register`)

1. Email нормализуется (lowercase, trim).
2. Проверяется, что identity для email отсутствует.
3. Создаётся запись пользователя с `terms_accepted_at`, `privacy_accepted_at` и `marketing_opt_in`.
4. Создаётся `auth_identity` для email.

### 2) Запрос OTP по email (`POST /auth/email/start`)

1. Email нормализуется (lowercase, trim).
2. Если identity не найдена — возвращается ошибка `NotFound`.
3. Создаётся OTP, код хэшируется (SHA-256) и сохраняется в `auth_otp`.
4. Код отправляется через SMTP, либо логируется в non-production.
5. В ответ возвращаются `identity_id`, `otp_id`, `expires_at` и `code` (только non-production).

### 3) Проверка OTP (`POST /auth/email/verify`)

1. Проверяется длина кода (`AUTH_OTP_LENGTH`).
2. Ищется активный OTP по `identity_id`, хэшу и `expires_at`.
3. OTP помечается как использованный (`consumed_at`).
4. Identity помечается как верифицированный.
5. Создаётся refresh-сессия и выдаётся access + refresh токены.

### 4) Обновление сессии (`POST /auth/refresh`)

1. Проверяется наличие сессии и отсутствие `revoked_at`.
2. Проверяется срок жизни refresh-сессии (`AUTH_REFRESH_TTL_SECONDS`, считается от `created_at`).
3. Проверяется хэш refresh-токена.
4. Refresh-токен ротируется (создаётся новый), `last_seen_at` обновляется.
5. Возвращается новый access + refresh токен.

### 5) Выход (`POST /auth/logout`)

1. Требуется `Bearer` access-токен.
2. `session_id` должен совпадать с сессией в access-токене.
3. Сессия помечается как отозванная (`revoked_at`).
4. Возвращается `revoked_at`.

### 6) Профиль пользователя (`GET /auth/me`)

1. `AccessTokenGuard` валидирует JWT и проверяет сессию.
2. Пользователь извлекается из `request.auth`.
3. Возвращается `User`.

## Токены и хранение секретов

- Access-токен — JWT с payload `{ sub, sid }`, TTL = `AUTH_ACCESS_TTL_SECONDS`.
- Refresh-токен — случайная строка (hex), хранится только как SHA-256 хэш.
- OTP — цифровая строка длиной `AUTH_OTP_LENGTH`, хранится как SHA-256 хэш.

## Проверки при доступе

- Access-токен должен быть валиден и подписан `AUTH_JWT_SECRET`.
- Сессия должна существовать, не быть отозванной и не быть просроченной по refresh TTL.
- Пользователь должен существовать и не быть архивированным.

## Точки расширения

Если потребуется защищать остальные эндпоинты, рекомендуемые точки интеграции:

- Глобальный Guard (`app.useGlobalGuards`) или Guard на контроллерах.
- Стратегии через `@nestjs/passport` (JWT, API Key и т.д.).
- Контекст пользователя в `Request` и логирование `request-id`.

После добавления аутентификации обновите:

- [API: обзор](../api/overview.md)
- [Безопасность: авторизация/RBAC](authorization-rbac.md)
- [Траблшутинг: частые проблемы](../troubleshooting/common-issues.md)
