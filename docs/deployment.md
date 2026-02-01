# Регламенты развертывания и установки

Документ описывает регламент установки и запуска приложения в трёх окружениях:
**dev**, **test**, **production**.

## Общие предпосылки

- Node.js 18+
- PostgreSQL 14+
- Доступ к архивам адресов (для импорта)

## Dev (локальная разработка)

### 1) Подготовка окружения

1. Установите зависимости:

   ```bash
   npm install
   ```

2. Создайте `.env` из шаблона разработки:

   ```bash
   cp .env.development.example .env
   ```

3. При необходимости поднимите PostgreSQL через docker-compose:

   ```bash
   docker-compose up -d
   ```

### 2) Инициализация БД

Импорт адресов создаёт необходимые таблицы и индексы (первый запуск обязателен):

```bash
npm run import:addresses:dev
```

### 3) Запуск API

```bash
npm run start:dev
```

### 4) Проверка

- Liveness: `GET /health`
- Readiness: `GET /health/ready`
- Swagger UI: `http://localhost:3000/docs`

## Test (CI/локальные тесты)

### 1) Подготовка окружения

1. Установите зависимости:

   ```bash
   npm install
   ```

2. Создайте `.env` для тестов:

   ```bash
   cp .env.test.example .env
   ```

3. Убедитесь, что тестовая БД изолирована (`POSTGRES_DB=addresses_test`).

### 2) Запуск тестов

```bash
npm test
npm run test:e2e
```

> При необходимости можно отдельно запускать импорт в тестовую БД:
>
> ```bash
> npm run import:addresses:dev
> ```

## Production

### 1) Подготовка окружения

1. Установите зависимости (для билда):

   ```bash
   npm install
   ```

2. Создайте `.env` для production:

   ```bash
   cp .env.production.example .env
   ```

3. Настройте доступы к PostgreSQL и секреты (пароли, хосты).

### 2) Сборка приложения

```bash
npm run build
```

### 3) Инициализация/обновление данных

Импорт адресов запускается как отдельная джоба (одиночная благодаря advisory lock):

```bash
npm run import:addresses
```

### 4) Запуск API

```bash
npm run start:prod
```

### 5) Операционные проверки

- `GET /health` — должен возвращать 200
- `GET /health/ready` — должен возвращать 200, если БД доступна

## Рекомендации по обновлению

1. Остановить старый инстанс приложения.
2. Обновить код/артефакты.
3. Запустить импорт адресов (если требуется обновление данных).
4. Запустить `start:prod`.
5. Проверить readiness.
