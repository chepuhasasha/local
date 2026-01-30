# Local
Сервис предоставляет простое API для поиска адресов. Данные берутся из
`scripts/get_addresses.js`, сохраняются в PostgreSQL и доступны через HTTP.

## Требования

- Node.js 18+
- PostgreSQL 14+

## Установка зависимостей

```bash
npm install
```

## Настройка базы данных (docker-compose)

1. Запустите PostgreSQL через docker-compose:

   ```bash
   docker-compose up -d
   ```

2. Примените схему и индексы:

   ```bash
   docker-compose exec -T postgres psql -U addresses_user -d addresses -f /app/scripts/init_db.sql
   ```

   Команда использует путь `/app`, поэтому запускать её нужно из корня репозитория.

## Загрузка адресов

1. Скачайте и конвертируйте данные:

   ```bash
   node scripts/get_addresses.js --month 202512
   ```

   Чанки будут сохранены в `./out`.

2. Загрузите чанки в PostgreSQL:

   ```bash
   export DATABASE_URL="postgresql://addresses_user:addresses_password@localhost:5432/addresses"
   node scripts/load_addresses.js ./out 1000
   ```

   Второй аргумент — размер пакета вставки (по умолчанию 1000).

## Запуск приложения

Перед запуском задайте строку подключения:

```bash
export DATABASE_URL="postgresql://addresses_user:addresses_password@localhost:5432/addresses"
```

Затем запустите сервис:

```bash
npm run start:dev
```

## API

### POST `/addresses/search`

Поиск адресов по строке пользователя.

```json
{
  "query": "Seoul",
  "limit": 20,
  "offset": 0,
  "lang": "any"
}
```

- `query` — строка поиска (обязательно).
- `limit` — максимум элементов (по умолчанию 20, максимум 50).
- `offset` — смещение (по умолчанию 0).
- `lang` — `ko`, `en` или `any` (по умолчанию `any`).

Ответ:

```json
[
  {
    "id": "1234567890",
    "display": {
      "ko": "서울특별시 ...",
      "en": "Seoul ..."
    },
    "search": {
      "ko": "서울특별시 ...",
      "en": "seoul ..."
    },
    "payload": {}
  }
]
```
