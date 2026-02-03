<- [Содержание](../../README.md)

---

# Локальная настройка

Документ описывает требования и полный порядок локального запуска сервиса.

## Требования

- Node.js 18+.
- PostgreSQL 14+ (в `docker-compose.yml` используется образ PostgreSQL 15).
- Docker (опционально, только для локального PostgreSQL).

## Шаг 1. Установка зависимостей

```bash
npm install
```

## Шаг 2. Конфигурация `.env`

1) Скопируйте пример:

```bash
cp .env.development.example .env
```

2) Проверьте обязательные переменные:

- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

3) Опционально настройте:

- `PORT` (порт API, по умолчанию 3000).
- `LOG_LEVEL` (уровень логирования).
- `ADDRESS_*` параметры импорта адресов.

Подробное описание переменных см. в [Конфигурация: переменные окружения](../configuration/environment-variables.md).

## Шаг 3. База данных

### Вариант A: локальный PostgreSQL через Docker

`docker-compose.yml` использует значения из `.env` и пробрасывает порт `POSTGRES_PORT` (или 5432 по умолчанию).

```bash
docker-compose up -d
```

### Вариант B: внешний PostgreSQL

Если база уже есть, просто укажите актуальные значения в `.env`.

Важно: для импорта сервис должен иметь право на `CREATE EXTENSION pg_trgm` (расширение используется для триграммных индексов).

## Шаг 4. Импорт адресов

Импорт — это отдельный CLI процесс, который скачивает архив, создаёт таблицы и индексы, и заполняет таблицу `addresses`.

```bash
npm run import:addresses:dev
```

Что делает импорт:

- Создаёт расширение `pg_trgm` и таблицы `addresses`, `addresses_next`, `addresses_prev`, `address_import_state`.
- Загружает архив за месяц `ADDRESS_DATA_MONTH` (или текущий месяц, если не задан).
- Импортирует данные в теневую таблицу и атомарно переключает её на `addresses`.
- Строит GIN индексы по `search_ko` и `search_en`.

Для продакшн-сборки используйте:

```bash
npm run build
npm run import:addresses
```

## Шаг 5. Запуск API

```bash
npm run start:dev
```

Swagger UI будет доступен по адресу `http://localhost:3000/docs`.

## Проверка

```bash
curl http://localhost:3000/health
```

```bash
curl -X POST http://localhost:3000/addresses/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Seoul","limit":5,"offset":0,"lang":"any"}'
```

Если `/addresses/search` возвращает пустой массив — проверьте, что импорт завершился успешно.

## Дополнительные материалы

- [Данные: импорт адресов](../data/addresses-import.md)
- [Конфигурация: переменные окружения](../configuration/environment-variables.md)
- [Траблшутинг: частые проблемы](../troubleshooting/common-issues.md)
