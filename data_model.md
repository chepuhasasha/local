# Модель данных

## Tag

Сущность, описывающая один физический **BinTag** двух типов: NFC-метка (`STANDART`) или BLE-замок (`LOCK`). У тега всегда есть числовой первичный ключ `id`, человекочитаемая подпись `label` и тип `type`. В зависимости от `type` набор полей различается: для `STANDART` хранится NFC-идентификатор, для `LOCK` - BLE параметры и ключи.

| property            | typescript type          | postgres type | required when | populated when | example                                                              |
| ------------------- | ------------------------ | ------------- | ------------- | -------------- | -------------------------------------------------------------------- |
| id                  | `number`                 | `BIGINT`      | always        | on create      | `1`                                                                  |
| label               | `string`                 | `TEXT`        | always        | on create      | `'04a16b'`                                                           |
| type                | `'STANDART'` \| `'LOCK'` | `tag_type`    | always        | on create      | `'LOCK'`                                                             |
| nfc_id              | `string` \| `null`       | `TEXT`        | STANDART only | on create      | `'04:a2:b1:c2:d3:e4:80'`                                             |
| service_uuid        | `string` \| `null`       | `UUID`        | LOCK only     | on create      | `'6e400001-b5a3-f393-e0a9-e50e24dcca9e'`                             |
| characteristic_uuid | `string` \| `null`       | `UUID`        | LOCK only     | on create      | `'6e400002-b5a3-f393-e0a9-e50e24dcca9e'`                             |
| encryption_key_hex  | `string` \| `null`       | `TEXT`        | LOCK only     | on create      | `'b1d3b2d02bf6a5a1b0dc44b0b9328f27f5481f0f9b5030fdb2c7b5a4e6aeb4c1'` |
| hmac_key_hex        | `string` \| `null`       | `TEXT`        | LOCK only     | on create      | `'e36a8c6a12c7ddf6baf4b3120c9d8c1e59f2a6cd94c1b3e0d4f1b0c5a9f7c2d3'` |
| owner_id            | `number` \| `null`       | `BIGINT`      | optional      | on activation  | `2`                                                                  |
| volume              | `number` \| `null`       | `NUMERIC`     | optional      | on activation  | `3`                                                                  |
| address_id          | `number` \| `null`       | `BIGINT`      | optional      | on activation  | `4`                                                                  |
| activated_at        | `string` \| `null`       | `TIMESTAMPTZ` | optional      | on activation  | `'2025-01-29 10:15:30 UTC'`                                          |
| archived_at         | `string` \| `null`       | `TIMESTAMPTZ` | optional      | on archive     | `'2026-01-29 10:15:30 UTC'`                                          |

`tag_type` в Postgres:

```sql
CREATE TYPE tag_type AS ENUM ('STANDART', 'LOCK');
```

### Условия целостности:

1. Значение `type` ограничено `tag_type`:
   - `type` может быть только **STANDART** или **LOCK**.

2. Взаимоисключающие поля по `type` (enforced через `CHECK`):
   - Если `type` = **STANDART**, то:
     - `nfc_id` обязательно **NOT NULL**
     - `service_uuid`, `characteristic_uuid`, `encryption_key_hex`, `hmac_key_hex` обязательно **NULL**

   - Если `type` = **LOCK**, то:
     - `nfc_id` обязательно **NULL**
     - `service_uuid`, `characteristic_uuid`, `encryption_key_hex`, `hmac_key_hex` обязательно **NOT NULL**

3. Поля активации (правило заполнения):
   - До активации допускается `activated_at`, `owner_id`, `volume`, `address_id` **IS NULL**.
   - После активации рекомендуется (правило уровня приложения) заполнять все поля одним действием: `activated_at`, `owner_id`, `volume`, `address_id`.

4. Статус записи:
   - Активная запись: `archived_at IS NULL`
   - Архивная запись: `archived_at IS NOT NULL`

---

## TagAccess

Хранит выданные доступы к конкретному `Tag`. Это связь many-to-many между `tags` и `users`. Каждая строка означает: “`user_id` имеет доступ к `tag_id`”, с указанной ролью доступа.

| property   | typescript type         | postgres type     | required when | populated when    | example                     |
| ---------- | ----------------------- | ----------------- | ------------- | ----------------- | --------------------------- |
| tag_id     | `number`                | `BIGINT`          | always        | on create (grant) | `4`                         |
| user_id    | `number`                | `BIGINT`          | always        | on create (grant) | `2`                         |
| role       | `'OWNER'` \| `'MEMBER'` | `tag_access_role` | always        | on create (grant) | `'OWNER'`                   |
| granted_at | `string`                | `TIMESTAMPTZ`     | always        | on create (grant) | `'2025-01-29 10:15:30 UTC'` |
| granted_by | `number` \| `null`      | `BIGINT`          | optional      | on create (grant) | `1`                         |
| revoked_at | `string` \| `null`      | `TIMESTAMPTZ`     | optional      | on revoke         | `'2026-01-29 10:15:30 UTC'` |
| revoked_by | `number` \| `null`      | `BIGINT`          | optional      | on revoke         | `1`                         |

`tag_access_role` в Postgres:

```sql
CREATE TYPE tag_access_role AS ENUM ('OWNER', 'MEMBER');
```

### Условия целостности:

1. Роль доступа:
   - `role` обязателен и принимает только значения **OWNER** или **MEMBER** (enforced через enum `tag_access_role`).

2. Ссылочная целостность (FOREIGN KEY):
   - `tag_id` обязан ссылаться на существующую запись `tag.id`, иначе вставка/обновление запрещены.
   - `user_id` обязан ссылаться на существующую запись `users.id`, иначе вставка/обновление запрещены.
   - `granted_by` и `revoked_by` (если не `NULL`) обязаны ссылаться на существующую запись `users.id`.

3. Уникальность активного доступа:
   - Для одной пары (`tag_id`, `user_id`) одновременно может существовать не более одного активного доступа.
   - Это рекомендуется закреплять **partial unique index**: уникальность (`tag_id`, `user_id`) при `revoked_at IS NULL`.

4. Отзыв доступа:
   - Активный доступ: `revoked_at IS NULL`
   - Отозванный доступ: `revoked_at IS NOT NULL`
   - При отзыве заполнять `revoked_at` и (если известно) `revoked_by` одним действием.

5. Правило уровня приложения:
   - Для каждого `tag_id` должен существовать как минимум один **активный** доступ с ролью **OWNER**.

---

## User

Описывает бизнес-пользователя (профиль и согласия).

| property            | typescript type    | postgres type | required when | populated when           | example                     |
| ------------------- | ------------------ | ------------- | ------------- | ------------------------ | --------------------------- |
| id                  | `number`           | `BIGINT`      | always        | on create                | `1`                         |
| display_name        | `string` \| `null` | `TEXT`        | optional      | on create / user update  | `'Sergey'`                  |
| terms_accepted_at   | `string` \| `null` | `TIMESTAMPTZ` | optional      | on accept terms          | `'2026-01-29 10:16:00 UTC'` |
| privacy_accepted_at | `string` \| `null` | `TIMESTAMPTZ` | optional      | on accept privacy policy | `'2026-01-29 10:16:00 UTC'` |
| marketing_opt_in    | `boolean`          | `BOOLEAN`     | always        | on create / user update  | `false`                     |
| created_at          | `string`           | `TIMESTAMPTZ` | always        | on create                | `'2026-01-29 10:15:30 UTC'` |
| updated_at          | `string`           | `TIMESTAMPTZ` | always        | on update                | `'2026-01-29 10:20:00 UTC'` |
| archived_at         | `string` \| `null` | `TIMESTAMPTZ` | optional      | on archive               | `'2026-02-01 00:00:00 UTC'` |

### Условия целостности:

1. Статус пользователя:
   - Активный пользователь: `archived_at IS NULL`
   - Архивный пользователь: `archived_at IS NOT NULL`

2. Согласия:
   - `terms_accepted_at` и `privacy_accepted_at` заполняются в момент принятия соответствующих документов (логика приложения).

---

## AuthIdentity

Идентификатор для входа (email).

| property         | typescript type    | postgres type   | required when | populated when     | example                     |
| ---------------- | ------------------ | --------------- | ------------- | ------------------ | --------------------------- |
| id               | `number`           | `BIGINT`        | always        | on create          | `10`                        |
| user_id          | `number`           | `BIGINT`        | always        | on create          | `1`                         |
| provider         | `'EMAIL'`          | `auth_provider` | always        | on create          | `'EMAIL'`                   |
| provider_user_id | `string`           | `TEXT`          | always        | on create          | `'sergey@example.com'`      |
| is_verified      | `boolean`          | `BOOLEAN`       | always        | on create / verify | `false`                     |
| verified_at      | `string` \| `null` | `TIMESTAMPTZ`   | optional      | on verify          | `'2026-01-29 10:18:00 UTC'` |
| created_at       | `string`           | `TIMESTAMPTZ`   | always        | on create          | `'2026-01-29 10:15:30 UTC'` |
| updated_at       | `string`           | `TIMESTAMPTZ`   | always        | on update          | `'2026-01-29 10:20:00 UTC'` |
| archived_at      | `string` \| `null` | `TIMESTAMPTZ`   | optional      | on archive         | `'2026-02-01 00:00:00 UTC'` |

`auth_provider` в Postgres:

```sql
CREATE TYPE auth_provider AS ENUM ('EMAIL');
```

### Условия целостности:

1. `user_id` — FOREIGN KEY:
   - `user_id` обязан ссылаться на существующую запись `user.id`.

2. Уникальность активного email:
   - `provider_user_id` должен быть уникален среди активных identity (рекомендуется partial unique index при `archived_at IS NULL`).

3. Верификация:
   - Если `is_verified = true`, то `verified_at` должен быть **NOT NULL** (рекомендуемое правило; при необходимости фиксируется `CHECK`).

4. Статус записи:
   - Активная identity: `archived_at IS NULL`
   - Архивная identity: `archived_at IS NOT NULL`

---

## AuthOtp

Одноразовые коды для подтверждения email/входа. Храним только `code_hash`, исходный код в БД не сохраняется.

| property    | typescript type    | postgres type | required when | populated when       | example                     |
| ----------- | ------------------ | ------------- | ------------- | -------------------- | --------------------------- |
| id          | `number`           | `BIGINT`      | always        | on create            | `100`                       |
| identity_id | `number`           | `BIGINT`      | always        | on create            | `10`                        |
| code_hash   | `string`           | `TEXT`        | always        | on create            | `'$sha256$e1b7...a9c2'`     |
| expires_at  | `string`           | `TIMESTAMPTZ` | always        | on create            | `'2026-01-29 10:20:30 UTC'` |
| consumed_at | `string` \| `null` | `TIMESTAMPTZ` | optional      | on successful verify | `'2026-01-29 10:18:05 UTC'` |
| created_at  | `string`           | `TIMESTAMPTZ` | always        | on create            | `'2026-01-29 10:15:30 UTC'` |

### Условия целостности:

1. `identity_id` — FOREIGN KEY:
   - `identity_id` обязан ссылаться на существующую запись `auth_identity.id`.

2. Валидность OTP:
   - OTP считается активным, если `consumed_at IS NULL` и текущее время меньше `expires_at`.
   - После успешной проверки заполняется `consumed_at`; повторное использование запрещено логикой приложения.

3. Хранение секрета:
   - `code_hash` хранит хэш кода; исходный код в базе не хранится.

---

## AuthSession

Сессии/refresh-токены. Вместо архивирования используется `revoked_at` + чистка старых завершённых сессий.

| property     | typescript type    | postgres type | required when | populated when     | example                     |
| ------------ | ------------------ | ------------- | ------------- | ------------------ | --------------------------- |
| id           | `number`           | `BIGINT`      | always        | on create          | `500`                       |
| user_id      | `number`           | `BIGINT`      | always        | on create          | `1`                         |
| refresh_hash | `string`           | `TEXT`        | always        | on create          | `'$sha256$9f2c...1b0d'`     |
| created_at   | `string`           | `TIMESTAMPTZ` | always        | on create          | `'2026-01-29 10:15:30 UTC'` |
| last_seen_at | `string` \| `null` | `TIMESTAMPTZ` | optional      | on request         | `'2026-01-29 10:20:00 UTC'` |
| revoked_at   | `string` \| `null` | `TIMESTAMPTZ` | optional      | on logout / revoke | `'2026-02-01 00:00:00 UTC'` |
| revoked_by   | `number` \| `null` | `BIGINT`      | optional      | on admin revoke    | `1`                         |

### Условия целостности:

1. `user_id` — FOREIGN KEY:
   - `user_id` обязан ссылаться на существующую запись `user.id`.

2. Статус сессии:
   - Активная сессия: `revoked_at IS NULL`
   - Завершённая сессия: `revoked_at IS NOT NULL`

3. Хранение секрета:
   - `refresh_hash` хранит хэш refresh-токена; исходный токен в базе не хранится.

---

## AuthEvent

Исторические данные по аутентификации (логины, подтверждения, ошибки).

| property    | typescript type                           | postgres type     | required when | populated when | example                     |
| ----------- | ----------------------------------------- | ----------------- | ------------- | -------------- | --------------------------- |
| id          | `number`                                  | `BIGINT`          | always        | on create      | `900`                       |
| user_id     | `number` \| `null`                        | `BIGINT`          | optional      | on create      | `1`                         |
| identity_id | `number` \| `null`                        | `BIGINT`          | optional      | on create      | `10`                        |
| event_type  | `'LOGIN'` \| `'VERIFY_EMAIL'` \| `'FAIL'` | `auth_event_type` | always        | on create      | `'LOGIN'`                   |
| ip          | `string` \| `null`                        | `INET`            | optional      | on create      | `'203.0.113.10'`            |
| user_agent  | `string` \| `null`                        | `TEXT`            | optional      | on create      | `'Mozilla/5.0 ...'`         |
| created_at  | `string`                                  | `TIMESTAMPTZ`     | always        | on create      | `'2026-01-29 10:15:30 UTC'` |

`auth_event_type` в Postgres:

```sql
CREATE TYPE auth_event_type AS ENUM ('LOGIN', 'VERIFY_EMAIL', 'FAIL');
```

### Условия целостности:

1. Значение `event_type` ограничено `auth_event_type`.
2. `user_id` и `identity_id` могут быть `NULL` (например, для событий “FAIL” до определения пользователя). Если значения указаны, рекомендуется делать FK на соответствующие таблицы.

---

# Хранение и чистка данных

Ретеншен, чтобы база не разрасталась:

1. `Tag`, `User`, `AuthIdentity`, `TagAccess`
   - Хранятся бессрочно (история важна).
   - Для рабочих выборок использовать фильтры `archived_at IS NULL` (для `Tag/User/AuthIdentity`) и `revoked_at IS NULL` (для `TagAccess`).

2. `AuthOtp`
   - Удалять после истечения/использования.
   - Хранить 14 дней (достаточно для расследований/отладки, не раздувает БД).

3. `AuthSession`
   - Активные хранить до отзыва, отозванные чистить.
   - Хранить 90 дней после `revoked_at`.

4. `AuthEvent`
   - Хранить 365 дней (или меньше, если объём большой).

## Периодичность чистки

- `AuthOtp`: ежедневно.
- `AuthSession`: ежедневно или раз в неделю (в зависимости от объёма).
- `AuthEvent`: раз в неделю или раз в месяц.

## SQL примеры для чистки

```sql
-- AuthOtp: удалить истёкшие или использованные OTP старше 14 дней
DELETE FROM auth_otp
WHERE (expires_at < now() OR consumed_at IS NOT NULL)
  AND created_at < now() - interval '14 days';
```

```sql
-- AuthSession: удалить отозванные сессии старше 90 дней
DELETE FROM auth_session
WHERE revoked_at IS NOT NULL
  AND revoked_at < now() - interval '90 days';
```

```sql
-- AuthEvent: удалить события старше 365 дней
DELETE FROM auth_event
WHERE created_at < now() - interval '365 days';
```

## Рекомендуемые индексы

### Tag

- `tag_active_idx` — ускоряет выборки активных тегов (`archived_at IS NULL`)

  ```sql
  CREATE INDEX tag_active_idx
  ON tag (id)
  WHERE archived_at IS NULL;
  ```

- `tag_label_active_uniq` — уникальный `label` среди активных тегов (если требуется)

  ```sql
  CREATE UNIQUE INDEX tag_label_active_uniq
  ON tag (label)
  WHERE archived_at IS NULL;
  ```

- `tag_active_address_idx` — ускоряет выборки активных тегов по `address_id`

  ```sql
  CREATE INDEX tag_active_address_idx
  ON tag (address_id)
  WHERE archived_at IS NULL;
  ```

- `tag_active_owner_idx` — ускоряет выборки активных тегов по `owner_id`

  ```sql
  CREATE INDEX tag_active_owner_idx
  ON tag (owner_id)
  WHERE archived_at IS NULL;
  ```

- `tag_activated_at_idx` — ускоряет сортировки/фильтры по `activated_at`

  ```sql
  CREATE INDEX tag_activated_at_idx
  ON tag (activated_at);
  ```

### TagAccess

- `tag_access_active_uniq` — гарантирует максимум один активный доступ для пары (`tag_id`, `user_id`) при `revoked_at IS NULL`

  ```sql
  CREATE UNIQUE INDEX tag_access_active_uniq
  ON tag_access (tag_id, user_id)
  WHERE revoked_at IS NULL;
  ```

- `tag_access_user_active_idx` — ускоряет получение активных тегов для пользователя

  ```sql
  CREATE INDEX tag_access_user_active_idx
  ON tag_access (user_id, tag_id)
  WHERE revoked_at IS NULL;
  ```

- `tag_access_tag_active_idx` — ускоряет получение активных пользователей для тега

  ```sql
  CREATE INDEX tag_access_tag_active_idx
  ON tag_access (tag_id, user_id)
  WHERE revoked_at IS NULL;
  ```

- `tag_access_granted_at_idx` — ускоряет выборки по времени выдачи доступа

  ```sql
  CREATE INDEX tag_access_granted_at_idx
  ON tag_access (granted_at);
  ```

- `tag_access_revoked_at_idx` — ускоряет выборки по времени отзыва доступа

  ```sql
  CREATE INDEX tag_access_revoked_at_idx
  ON tag_access (revoked_at);
  ```

### User

- `user_active_idx` — ускоряет выборки активных пользователей (`archived_at IS NULL`)

  ```sql
  CREATE INDEX user_active_idx
  ON "user" (id)
  WHERE archived_at IS NULL;
  ```

### AuthIdentity

- `auth_identity_email_active_uniq` — уникальный email среди активных identity (`archived_at IS NULL`)

  ```sql
  CREATE UNIQUE INDEX auth_identity_email_active_uniq
  ON auth_identity (provider_user_id)
  WHERE archived_at IS NULL;
  ```

- `auth_identity_user_active_idx` — ускоряет выборки identity по `user_id`

  ```sql
  CREATE INDEX auth_identity_user_active_idx
  ON auth_identity (user_id)
  WHERE archived_at IS NULL;
  ```

### AuthOtp

- `auth_otp_identity_active_idx` — ускоряет поиск активного OTP для `identity_id`

  ```sql
  CREATE INDEX auth_otp_identity_active_idx
  ON auth_otp (identity_id, expires_at)
  WHERE consumed_at IS NULL;
  ```

- `auth_otp_created_at_idx` — ускоряет регулярную чистку по `created_at`

  ```sql
  CREATE INDEX auth_otp_created_at_idx
  ON auth_otp (created_at);
  ```

### AuthSession

- `auth_session_user_active_idx` — ускоряет выборки активных сессий пользователя

  ```sql
  CREATE INDEX auth_session_user_active_idx
  ON auth_session (user_id, created_at)
  WHERE revoked_at IS NULL;
  ```

- `auth_session_revoked_at_idx` — ускоряет чистку отозванных сессий по `revoked_at`

  ```sql
  CREATE INDEX auth_session_revoked_at_idx
  ON auth_session (revoked_at);
  ```

- `auth_session_refresh_hash_idx` — ускоряет поиск по `refresh_hash` (если используешь поиск по хэшу)

  ```sql
  CREATE INDEX auth_session_refresh_hash_idx
  ON auth_session (refresh_hash);
  ```

### AuthEvent

- `auth_event_user_id_created_at_idx` — ускоряет выборки событий по пользователю

  ```sql
  CREATE INDEX auth_event_user_id_created_at_idx
  ON auth_event (user_id, created_at);
  ```

- `auth_event_identity_id_created_at_idx` — ускоряет выборки событий по identity

  ```sql
  CREATE INDEX auth_event_identity_id_created_at_idx
  ON auth_event (identity_id, created_at);
  ```

- `auth_event_created_at_idx` — ускоряет чистку по `created_at`

  ```sql
  CREATE INDEX auth_event_created_at_idx
  ON auth_event (created_at);
  ```

## Addresses

Справочная таблица адресов уровня здания (building-level) для Южной Кореи. Используется для поиска/автокомплита и выбора адреса здания.

Данные заполняются автоматически при старте приложения: если таблица пустая, сервис `AddressesLoaderService` скачивает ежемесячный архив, парсит файлы справочника и выполняет batch upsert в Postgres.

Примечание по связям: эта таблица имеет первичный ключ `id` типа `TEXT`. Если вы хотите хранить выбранный адрес прямо в `Tag`, удобнее:

- завести отдельное поле `tag.address_ref_id TEXT` (ссылка на `addresses.id`), или
- привести тип `Tag.address_id` к `TEXT`.

### Логика импорта (как заполняется таблица)

1. Bootstrap-проверка:

- создаёт расширение `pg_trgm`, таблицу `addresses` и индексы;
- делает точный `SELECT COUNT(*)` по `addresses`;
- если `COUNT(*) > 0` — импорт пропускается, если `0` — запускается загрузка.

2. Загрузка архива:

- месяц берётся из `ADDRESS_DATA_MONTH=YYYYMM`, иначе используется текущий месяц;
- скачивание идёт во временную директорию ОС и логируется прогрессом (проценты + байты).

3. Два прохода по архиву:

- Pass 1: подсчёт строк во всех `build_*.txt` (для прогресса `processed/total`);
- Pass 2:
  - строится in-memory индекс дорог из `road_code_total*.txt` (ключ `road_code|road_local_area_serial`);
  - затем читаются `build_*.txt` и каждая строка конвертируется в запись `addresses`.

4. Batch upsert:

- буферизация по `chunkSize` (по умолчанию 1000 строк);
- `INSERT ... VALUES (...) ON CONFLICT (id) DO UPDATE` обновляет запись по `id`.

### Поля street/parcel

В таблице параллельно хранятся два представления адреса здания:

- `road_*` — street-format (street name + building number) и связанные коды;
- `parcel_*` — parcel-format (administrative areas + parcel number) и связанный `parcel_legal_area_code`.

В “local language” версии используются поля с суффиксом `_ko`, в английской версии — `_en`. Названия колонок оставлены как в базе.

| property                  | typescript type     | postgres type      | required when | populated when | example                                      |
| ------------------------- | ------------------- | ------------------ | ------------- | -------------- | -------------------------------------------- |
| id                        | `string`            | `TEXT`             | always        | on import      | `'1168010100012340000000000'`                |
| x                         | `number` \| `null`  | `DOUBLE PRECISION` | optional      | on import      | `127.0473`                                   |
| y                         | `number` \| `null`  | `DOUBLE PRECISION` | optional      | on import      | `37.5172`                                    |
| display_ko                | `string` \| `null`  | `TEXT`             | optional      | on import      | `'LocalCity LocalDistrict LocalStreet 12'`   |
| display_en                | `string` \| `null`  | `TEXT`             | optional      | on import      | `'City District Street 12'`                  |
| search_ko                 | `string` \| `null`  | `TEXT`             | optional      | on import      | `'localcity localdistrict localstreet 12'`   |
| search_en                 | `string` \| `null`  | `TEXT`             | optional      | on import      | `'city district street 12'`                  |
| road_ko_region1           | `string` \| `null`  | `TEXT`             | optional      | on import      | `'LocalRegion1'`                             |
| road_ko_region2           | `string` \| `null`  | `TEXT`             | optional      | on import      | `'LocalRegion2'`                             |
| road_ko_region3           | `string` \| `null`  | `TEXT`             | optional      | on import      | `'LocalRegion3'`                             |
| road_ko_road_name         | `string` \| `null`  | `TEXT`             | optional      | on import      | `'LocalStreet'`                              |
| road_ko_building_no       | `string` \| `null`  | `TEXT`             | optional      | on import      | `'12-0'`                                     |
| road_ko_is_underground    | `boolean` \| `null` | `BOOLEAN`          | optional      | on import      | `false`                                      |
| road_ko_full              | `string` \| `null`  | `TEXT`             | optional      | on import      | `'LocalRegion1 LocalRegion2 LocalStreet 12'` |
| road_en_region1           | `string` \| `null`  | `TEXT`             | optional      | on import      | `'Region1'`                                  |
| road_en_region2           | `string` \| `null`  | `TEXT`             | optional      | on import      | `'Region2'`                                  |
| road_en_region3           | `string` \| `null`  | `TEXT`             | optional      | on import      | `'Region3'`                                  |
| road_en_road_name         | `string` \| `null`  | `TEXT`             | optional      | on import      | `'Street'`                                   |
| road_en_building_no       | `string` \| `null`  | `TEXT`             | optional      | on import      | `'12-0'`                                     |
| road_en_is_underground    | `boolean` \| `null` | `BOOLEAN`          | optional      | on import      | `false`                                      |
| road_en_full              | `string` \| `null`  | `TEXT`             | optional      | on import      | `'Region1 Region2 Street 12'`                |
| road_code                 | `string` \| `null`  | `TEXT`             | optional      | on import      | `'116801234567'`                             |
| road_local_area_serial    | `string` \| `null`  | `TEXT`             | optional      | on import      | `'00001'`                                    |
| road_postal_code          | `string` \| `null`  | `TEXT`             | optional      | on import      | `'06236'`                                    |
| road_building_name_ko     | `string` \| `null`  | `TEXT`             | optional      | on import      | `'LocalBuildingName'`                        |
| parcel_ko_region1         | `string` \| `null`  | `TEXT`             | optional      | on import      | `'LocalRegion1'`                             |
| parcel_ko_region2         | `string` \| `null`  | `TEXT`             | optional      | on import      | `'LocalRegion2'`                             |
| parcel_ko_region3         | `string` \| `null`  | `TEXT`             | optional      | on import      | `'LocalRegion3'`                             |
| parcel_ko_region4         | `string` \| `null`  | `TEXT`             | optional      | on import      | `'LocalRegion4'`                             |
| parcel_ko_is_mountain_lot | `boolean` \| `null` | `BOOLEAN`          | optional      | on import      | `false`                                      |
| parcel_ko_main_no         | `string` \| `null`  | `TEXT`             | optional      | on import      | `'123'`                                      |
| parcel_ko_sub_no          | `string` \| `null`  | `TEXT`             | optional      | on import      | `'4'`                                        |
| parcel_ko_parcel_no       | `string` \| `null`  | `TEXT`             | optional      | on import      | `'123-4'`                                    |
| parcel_ko_full            | `string` \| `null`  | `TEXT`             | optional      | on import      | `'LocalRegion1 LocalRegion2 123-4'`          |
| parcel_en_region1         | `string` \| `null`  | `TEXT`             | optional      | on import      | `'Region1'`                                  |
| parcel_en_region2         | `string` \| `null`  | `TEXT`             | optional      | on import      | `'Region2'`                                  |
| parcel_en_region3         | `string` \| `null`  | `TEXT`             | optional      | on import      | `'Region3'`                                  |
| parcel_en_region4         | `string` \| `null`  | `TEXT`             | optional      | on import      | `null`                                       |
| parcel_en_is_mountain_lot | `boolean` \| `null` | `BOOLEAN`          | optional      | on import      | `false`                                      |
| parcel_en_main_no         | `string` \| `null`  | `TEXT`             | optional      | on import      | `'123'`                                      |
| parcel_en_sub_no          | `string` \| `null`  | `TEXT`             | optional      | on import      | `'4'`                                        |
| parcel_en_parcel_no       | `string` \| `null`  | `TEXT`             | optional      | on import      | `'123-4'`                                    |
| parcel_en_full            | `string` \| `null`  | `TEXT`             | optional      | on import      | `'Region1 Region2 123-4'`                    |
| parcel_legal_area_code    | `string` \| `null`  | `TEXT`             | optional      | on import      | `'1168010100'`                               |

### Условия целостности (ожидаемые инварианты)

1. Уникальность:

- `id` уникален и является `PRIMARY KEY`.
- импорт использует upsert по `id`.

2. Поиск:

- `search_ko` и `search_en` заполняются в нижнем регистре и содержат склейку ключевых компонентов (`display`, `postal_code`, `building_name` и т.п.), чтобы поиск работал по частичным совпадениям.

3. Допустимы `NULL`:

- большинство полей может быть `NULL`, т.к. не все записи содержат все компоненты или английскую версию.

### Рекомендуемые индексы

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS addresses_search_ko_idx
ON addresses USING gin (search_ko gin_trgm_ops);

CREATE INDEX IF NOT EXISTS addresses_search_en_idx
ON addresses USING gin (search_en gin_trgm_ops);
```
