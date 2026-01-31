# Local

Сервис предоставляет API для поиска адресов в Корее. При первом запуске
приложение автоматически скачивает архив, создаёт схему в PostgreSQL и
загружает данные, выводя прогресс в консоль.

## Требования

- Node.js 18+
- PostgreSQL 14+

## Переменные окружения

Обязательные настройки подключения к базе данных:

- `POSTGRES_HOST` — хост PostgreSQL.
- `POSTGRES_PORT` — порт PostgreSQL (по умолчанию `5432`).
- `POSTGRES_USER` — пользователь.
- `POSTGRES_PASSWORD` — пароль.
- `POSTGRES_DB` — база данных.

Дополнительные настройки:

- `PORT` — порт HTTP-сервера (по умолчанию `3000`).
- `ADDRESS_DATA_MONTH` — месяц выгрузки адресов в формате `YYYYMM`.
  Если переменная не задана или неверная, используется текущий месяц.

## Установка зависимостей

```bash
npm install
```

## Настройка базы данных (docker-compose)

1. Заполните переменные окружения для PostgreSQL (можно в `.env`).

2. Запустите PostgreSQL через docker-compose:

   ```bash
   docker-compose up -d
   ```

3. При первом запуске сервис сам создаст таблицу, индексы и
   наполнит её данными.

## Запуск приложения

```bash
npm run start:dev
```

При первом запуске вы увидите прогресс загрузки и вставки в консоли
(`processed/total` и проценты).

## Документация API

Swagger UI доступен по адресу `http://localhost:3000/docs`.

## API

### POST `/addresses/search`

Поиск адресов по строке пользователя.

Пример запроса:

```bash
curl -X POST http://localhost:3000/addresses/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Seoul","limit":20,"offset":0,"lang":"any"}'
```

Поля запроса:

- `query` — строка поиска (обязательно).
- `limit` — максимум элементов (по умолчанию 20, максимум 50).
- `offset` — смещение (по умолчанию 0).
- `lang` — `ko`, `en` или `any` (по умолчанию `any`).

Пример ответа:

```json
[
  {
    "id": "1234567890",
    "x": null,
    "y": null,
    "display": {
      "ko": "서울특별시 ...",
      "en": "Seoul ..."
    },
    "road": {
      "ko": {
        "region1": "서울특별시",
        "region2": "...",
        "region3": "...",
        "roadName": "...",
        "buildingNo": "...",
        "isUnderground": false,
        "full": "서울특별시 ..."
      },
      "en": {
        "region1": "Seoul",
        "region2": "...",
        "region3": "...",
        "roadName": "...",
        "buildingNo": "...",
        "isUnderground": false,
        "full": "Seoul ..."
      },
      "codes": {
        "roadCode": "...",
        "localAreaSerial": "...",
        "postalCode": "..."
      },
      "building": {
        "nameKo": "..."
      }
    },
    "parcel": {
      "ko": {
        "region1": "서울특별시",
        "region2": "...",
        "region3": "...",
        "region4": "...",
        "isMountainLot": false,
        "mainNo": "...",
        "subNo": "...",
        "parcelNo": "...",
        "full": "서울특별시 ..."
      },
      "en": {
        "region1": "Seoul",
        "region2": "...",
        "region3": "...",
        "region4": null,
        "isMountainLot": false,
        "mainNo": "...",
        "subNo": "...",
        "parcelNo": "...",
        "full": "Seoul ..."
      },
      "codes": {
        "legalAreaCode": "..."
      }
    },
    "search": {
      "ko": "...",
      "en": "..."
    }
  }
]
```
