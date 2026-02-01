# Local

Сервис предоставляет API для поиска адресов в Корее. Импорт адресов
выполняется отдельной командой/джобой и не запускается при старте API.

## Требования

- Node.js 18+
- PostgreSQL 14+

## Переменные окружения

Полный список переменных, сценарии использования и объяснение «на пальцах»
собраны в документации: [`docs/environment.md`](docs/environment.md).
Шаблоны `.env` для разных окружений лежат рядом с репозиторием:
`.env.development.example`, `.env.test.example`, `.env.production.example`.

Регламенты установки и запуска описаны в [`docs/deployment.md`](docs/deployment.md).

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

3. Таблицы и индексы создаются отдельной командой импорта (см. ниже).

## Запуск приложения

```bash
npm run start:dev
```

Импорт адресов выполняется отдельной командой и логирует прогресс
(`processed/total` и проценты).

## Импорт адресов

Импорт выполняется отдельно от API и использует теневую таблицу с
атомарным переключением:

```bash
npm run import:addresses:dev
```

Для production-окружения используйте:

```bash
npm run build
npm run import:addresses
```

Импорт берет PostgreSQL advisory lock, поэтому при нескольких инстансах
фактически выполняется только один.

### Runbook для пустой базы

1. Запустить джобу импорта один раз:

   ```bash
   npm run import:addresses:dev
   ```

2. Проверить `COUNT(*) > 0` и наличие индексов в таблице `addresses`.
3. Только после этого запускать API-инстансы.

## Документация API

Swagger UI доступен по адресу `http://localhost:3000/docs`.

## Архитектура

Общие правила структуры и зависимостей — в `docs/architecture.md`.

## Тесты

```bash
npm test
npm run test:e2e
```

## Линт и форматирование

```bash
npm run format
npm run lint
```

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
