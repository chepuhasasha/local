<- [Содержание](../README.md)

---

# Локальная настройка
Owner: Backend Team
Last reviewed: 2026-02-04

## Цель
Настроить локальное окружение для разработки и тестирования API.

## Контекст
Документ описывает полный процесс: зависимости, конфигурация, база, миграции и импорт адресов.

## Шаги
1. Установите зависимости:

```bash
npm install
```

2. Настройте `.env`:

```bash
cp .env.development.example .env
```

Проверьте обязательные переменные:
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

Опциональные параметры:
- `PORT`, `LOG_LEVEL`, `SWAGGER_ENABLED`
- `AUTH_*` для токенов и OTP
- `MAILER_*` для SMTP (OTP email)
- `ADDRESS_*` для импорта адресов

Полный список — в [Переменные окружения](../reference/configuration/environment-variables.md).

3. Подготовьте базу данных.

Вариант A: PostgreSQL через Docker:

```bash
docker-compose up -d
```

Вариант B: внешняя БД — укажите актуальные параметры в `.env`.

Важно: для импорта нужен доступ к `CREATE EXTENSION pg_trgm`.

4. Запустите миграции доменных таблиц:

```bash
npm run migration:run
```

5. Импортируйте адреса:

```bash
npm run import:addresses:dev
```

Импорт создаёт таблицы `addresses`, `addresses_next`, `addresses_prev`, `address_import_state` и индексы поиска.

6. Запустите API:

```bash
npm run start:dev
```

Swagger UI доступен по адресу `http://localhost:3000/docs` (если `SWAGGER_ENABLED` включён).

## Проверка

```bash
curl http://localhost:3000/health
```

```bash
curl -X POST http://localhost:3000/addresses/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Seoul","limit":5,"offset":0,"lang":"any"}'
```

## Ограничения
Импорт адресов может занимать значительное время и диск. Планируйте запуск заранее.

## См. также
- [Быстрый старт](quickstart.md)
- [Импорт адресов](../how-to/addresses-import.md)
- [Траблшутинг](../ops/troubleshooting.md)
