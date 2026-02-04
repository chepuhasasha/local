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
