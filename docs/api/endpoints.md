<- [Содержание](../../README.md)

---

# API: эндпоинты

Документ перечисляет HTTP маршруты и их контракт.

## Addresses

### POST `/addresses/search`

- **Auth:** отсутствует.
- **Назначение:** поиск адресов по текстовой строке.

**Request DTO:** `SearchAddressesRequest`

| Поле | Тип | Валидация | По умолчанию |
| --- | --- | --- | --- |
| `query` | `string` | обязательное, не пустое | — |
| `limit` | `number` | `int`, `1..50` | `20` |
| `offset` | `number` | `int`, `>= 0` | `0` |
| `lang` | `ko \| en \| any` | перечисление | `any` |

**Response:** массив объектов `AddressSearchResult` (см. [Данные: модель данных API](../data/data-model.md)).

**Ошибки:**

- `400 BadRequest` — если `query` пустой или не проходит валидацию.

**Пример запроса:**

```bash
curl -X POST http://localhost:3000/addresses/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Seoul","limit":20,"offset":0,"lang":"any"}'
```

**Пример ответа (1 элемент):**

```json
[
  {
    "id": "1168010100012340000000000",
    "x": 129.118,
    "y": 35.148,
    "display": {
      "ko": "부산광역시 수영구 남천동 수영로451번길 8-5",
      "en": "Busan Suyeong-gu Namcheon-dong Suyeong-ro 451beon-gil 8-5"
    },
    "road": {
      "ko": {
        "region1": "부산광역시",
        "region2": "수영구",
        "region3": "남천동",
        "roadName": "수영로451번길",
        "buildingNo": "8-5",
        "isUnderground": false,
        "full": "부산광역시 수영구 남천동 수영로451번길 8-5"
      },
      "en": {
        "region1": "Busan",
        "region2": "Suyeong-gu",
        "region3": "Namcheon-dong",
        "roadName": "Suyeong-ro 451beon-gil",
        "buildingNo": "8-5",
        "isUnderground": false,
        "full": "Busan Suyeong-gu Namcheon-dong Suyeong-ro 451beon-gil 8-5"
      },
      "codes": {
        "roadCode": "265004214246",
        "localAreaSerial": "01",
        "postalCode": "48316"
      },
      "building": {
        "nameKo": "누리 더 숲"
      }
    },
    "parcel": {
      "ko": {
        "region1": "부산광역시",
        "region2": "수영구",
        "region3": "남천동",
        "region4": null,
        "isMountainLot": false,
        "mainNo": "52",
        "subNo": "22",
        "parcelNo": "52-22",
        "full": "부산광역시 수영구 남천동 52-22"
      },
      "en": {
        "region1": "Busan",
        "region2": "Suyeong-gu",
        "region3": "Namcheon-dong",
        "region4": null,
        "isMountainLot": false,
        "mainNo": "52",
        "subNo": "22",
        "parcelNo": "52-22",
        "full": "Busan Suyeong-gu Namcheon-dong 52-22"
      },
      "codes": {
        "legalAreaCode": "2623010500"
      }
    },
    "search": {
      "ko": "...",
      "en": "..."
    }
  }
]
```

## Health

### GET `/health`

- **Auth:** отсутствует.
- **Назначение:** liveness check.
- **Response:** `{ "status": "ok", "timestamp": "..." }`.

### GET `/health/info`

- **Auth:** отсутствует.
- **Назначение:** диагностическая информация о процессе.
- **Response (base):** `status`, `timestamp`, `uptimeSeconds`, `node`, `memory`.
- **Дополнительно:** при `HEALTH_VERBOSE=true` добавляются `env`, `version`, `commitSha`.

### GET `/health/ready`

- **Auth:** отсутствует.
- **Назначение:** readiness check.
- **Response (200):** `{ status, timestamp, checks[] }`.
- **Ошибки:** `503 ServiceUnavailable` при `status != ok` (в стандартном формате ошибок).
