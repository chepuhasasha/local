<- [Содержание](../../README.md)

---

# API: эндпоинты

Документ перечисляет все HTTP маршруты, определённые в контроллерах приложения.

## Addresses

### POST `/addresses/search`

- **Auth:** отсутствует.
- **Назначение:** поиск адресов по текстовой строке.

**Request DTO:** `SearchAddressesRequest`

| Поле     | Тип               | Валидация      | По умолчанию |
| -------- | ----------------- | -------------- | ------------ |
| `query`  | `string`          | обязательное   | —            |
| `limit`  | `number`          | `int`, `1..50` | `20`         |
| `offset` | `number`          | `int`, `>= 0`  | `0`          |
| `lang`   | `ko \| en \| any` | перечисление   | `any`        |

**Response:** массив объектов `AddressSearchResult`.

**Ошибки:**

- `400 BadRequest` — если `query` пустой или не проходит валидацию.

**Пример запроса:**

```bash
curl -X POST http://localhost:3000/addresses/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Seoul","limit":20,"offset":0,"lang":"any"}'
```

## Health

### GET `/health`

- **Auth:** отсутствует.
- **Назначение:** liveness check.
- **Response:** `{ "status": "ok", "timestamp": "..." }`.

### GET `/health/info`

- **Auth:** отсутствует.
- **Назначение:** диагностическая информация.
- **Response:** базовые поля `status`, `timestamp`, `uptimeSeconds`, `node`, `memory`.
- **Дополнительно:** при `HEALTH_VERBOSE=true` добавляются `env`, `version`, `commitSha`.

### GET `/health/ready`

- **Auth:** отсутствует.
- **Назначение:** readiness check.
- **Response:** `{ status, timestamp, checks[] }`.
- **Ошибки:** `503 ServiceUnavailable` при `status != ok`.
