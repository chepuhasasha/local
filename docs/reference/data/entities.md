<- [Содержание](../../README.md)

---

# Данные: сущности
Owner: Backend Team
Last reviewed: 2026-02-04

## Цель
Описать сущности TypeORM, используемые приложением.

## Контекст
Адресные таблицы создаются процессом импорта, доменные таблицы — миграциями.

## Шаги
1. Используйте документ как справочник по структуре сущностей.
2. При изменении сущности обновляйте этот документ.

## AddressEntity
**Таблица:** `addresses`.

**Назначение:** хранение нормализованных данных адресов и строк для поиска.

### Базовые поля

| Поле в Entity | Колонка | Тип | Nullable | Описание |
| --- | --- | --- | --- | --- |
| `id` | `id` | `text` | нет | Уникальный идентификатор адреса. |
| `x` | `x` | `double precision` | да | Широта. |
| `y` | `y` | `double precision` | да | Долгота. |

### Отображение и поиск

| Поле в Entity | Колонка | Тип | Nullable | Описание |
| --- | --- | --- | --- | --- |
| `displayKo` | `display_ko` | `text` | да | Отображаемый адрес (ko). |
| `displayEn` | `display_en` | `text` | да | Отображаемый адрес (en). |
| `searchKo` | `search_ko` | `text` | да | Поисковая строка (ko). |
| `searchEn` | `search_en` | `text` | да | Поисковая строка (en). |

### Дорожный адрес (ko)

| Поле в Entity | Колонка | Тип | Nullable | Описание |
| --- | --- | --- | --- | --- |
| `roadKoRegion1` | `road_ko_region1` | `text` | да | Регион 1. |
| `roadKoRegion2` | `road_ko_region2` | `text` | да | Регион 2. |
| `roadKoRegion3` | `road_ko_region3` | `text` | да | Регион 3. |
| `roadKoRoadName` | `road_ko_road_name` | `text` | да | Название дороги. |
| `roadKoBuildingNo` | `road_ko_building_no` | `text` | да | Номер здания. |
| `roadKoIsUnderground` | `road_ko_is_underground` | `boolean` | да | Признак подземного адреса. |
| `roadKoFull` | `road_ko_full` | `text` | да | Полная строка дорожного адреса. |

### Дорожный адрес (en)

| Поле в Entity | Колонка | Тип | Nullable | Описание |
| --- | --- | --- | --- | --- |
| `roadEnRegion1` | `road_en_region1` | `text` | да | Регион 1. |
| `roadEnRegion2` | `road_en_region2` | `text` | да | Регион 2. |
| `roadEnRegion3` | `road_en_region3` | `text` | да | Регион 3. |
| `roadEnRoadName` | `road_en_road_name` | `text` | да | Название дороги. |
| `roadEnBuildingNo` | `road_en_building_no` | `text` | да | Номер здания. |
| `roadEnIsUnderground` | `road_en_is_underground` | `boolean` | да | Признак подземного адреса. |
| `roadEnFull` | `road_en_full` | `text` | да | Полная строка дорожного адреса. |

### Дорожные коды и здание

| Поле в Entity | Колонка | Тип | Nullable | Описание |
| --- | --- | --- | --- | --- |
| `roadCode` | `road_code` | `text` | да | Код дороги. |
| `roadLocalAreaSerial` | `road_local_area_serial` | `text` | да | Серийный номер района. |
| `roadPostalCode` | `road_postal_code` | `text` | да | Почтовый индекс. |
| `roadBuildingNameKo` | `road_building_name_ko` | `text` | да | Название здания (ko). |

### Земельный адрес (ko)

| Поле в Entity | Колонка | Тип | Nullable | Описание |
| --- | --- | --- | --- | --- |
| `parcelKoRegion1` | `parcel_ko_region1` | `text` | да | Регион 1. |
| `parcelKoRegion2` | `parcel_ko_region2` | `text` | да | Регион 2. |
| `parcelKoRegion3` | `parcel_ko_region3` | `text` | да | Регион 3. |
| `parcelKoRegion4` | `parcel_ko_region4` | `text` | да | Регион 4. |
| `parcelKoIsMountainLot` | `parcel_ko_is_mountain_lot` | `boolean` | да | Признак горного участка. |
| `parcelKoMainNo` | `parcel_ko_main_no` | `text` | да | Основной номер участка. |
| `parcelKoSubNo` | `parcel_ko_sub_no` | `text` | да | Дополнительный номер участка. |
| `parcelKoParcelNo` | `parcel_ko_parcel_no` | `text` | да | Номер участка (агрегированный). |
| `parcelKoFull` | `parcel_ko_full` | `text` | да | Полная строка земельного адреса. |

### Земельный адрес (en)

| Поле в Entity | Колонка | Тип | Nullable | Описание |
| --- | --- | --- | --- | --- |
| `parcelEnRegion1` | `parcel_en_region1` | `text` | да | Регион 1. |
| `parcelEnRegion2` | `parcel_en_region2` | `text` | да | Регион 2. |
| `parcelEnRegion3` | `parcel_en_region3` | `text` | да | Регион 3. |
| `parcelEnRegion4` | `parcel_en_region4` | `text` | да | Регион 4. |
| `parcelEnIsMountainLot` | `parcel_en_is_mountain_lot` | `boolean` | да | Признак горного участка. |
| `parcelEnMainNo` | `parcel_en_main_no` | `text` | да | Основной номер участка. |
| `parcelEnSubNo` | `parcel_en_sub_no` | `text` | да | Дополнительный номер участка. |
| `parcelEnParcelNo` | `parcel_en_parcel_no` | `text` | да | Номер участка (агрегированный). |
| `parcelEnFull` | `parcel_en_full` | `text` | да | Полная строка земельного адреса. |

### Земельные коды

| Поле в Entity | Колонка | Тип | Nullable | Описание |
| --- | --- | --- | --- | --- |
| `parcelLegalAreaCode` | `parcel_legal_area_code` | `text` | да | Код административного района. |

## UserEntity
**Таблица:** `users`.

**Назначение:** хранение бизнес-профиля пользователя.

### Базовые поля

| Поле в Entity | Колонка | Тип | Nullable | Описание |
| --- | --- | --- | --- | --- |
| `id` | `id` | `bigint` | нет | Идентификатор пользователя. |
| `display_name` | `display_name` | `text` | да | Отображаемое имя пользователя. |
| `terms_accepted_at` | `terms_accepted_at` | `timestamptz` | да | Дата принятия условий. |
| `privacy_accepted_at` | `privacy_accepted_at` | `timestamptz` | да | Дата принятия политики приватности. |
| `marketing_opt_in` | `marketing_opt_in` | `boolean` | нет | Согласие на маркетинговые рассылки. |
| `created_at` | `created_at` | `timestamptz` | нет | Дата создания. |
| `updated_at` | `updated_at` | `timestamptz` | нет | Дата обновления. |
| `archived_at` | `archived_at` | `timestamptz` | да | Дата архивации. |

## AuthIdentityEntity
**Таблица:** `auth_identity`.

**Назначение:** идентификаторы входа пользователя (email).

| Поле в Entity | Колонка | Тип | Nullable | Описание |
| --- | --- | --- | --- | --- |
| `id` | `id` | `bigint` | нет | Идентификатор identity. |
| `user_id` | `user_id` | `bigint` | нет | Ссылка на пользователя. |
| `provider` | `provider` | `auth_provider` | нет | Провайдер (`EMAIL`). |
| `provider_user_id` | `provider_user_id` | `text` | нет | Email пользователя. |
| `is_verified` | `is_verified` | `boolean` | нет | Флаг верификации. |
| `verified_at` | `verified_at` | `timestamptz` | да | Дата верификации. |
| `created_at` | `created_at` | `timestamptz` | нет | Дата создания. |
| `updated_at` | `updated_at` | `timestamptz` | нет | Дата обновления. |
| `archived_at` | `archived_at` | `timestamptz` | да | Дата архивации. |

## AuthOtpEntity
**Таблица:** `auth_otp`.

**Назначение:** одноразовые коды для подтверждения.

| Поле в Entity | Колонка | Тип | Nullable | Описание |
| --- | --- | --- | --- | --- |
| `id` | `id` | `bigint` | нет | Идентификатор OTP. |
| `identity_id` | `identity_id` | `bigint` | нет | Ссылка на identity. |
| `code_hash` | `code_hash` | `text` | нет | Хэш кода. |
| `expires_at` | `expires_at` | `timestamptz` | нет | Срок действия. |
| `consumed_at` | `consumed_at` | `timestamptz` | да | Время использования. |
| `created_at` | `created_at` | `timestamptz` | нет | Дата создания. |

## AuthSessionEntity
**Таблица:** `auth_session`.

**Назначение:** refresh-сессии пользователя.

| Поле в Entity | Колонка | Тип | Nullable | Описание |
| --- | --- | --- | --- | --- |
| `id` | `id` | `bigint` | нет | Идентификатор сессии. |
| `user_id` | `user_id` | `bigint` | нет | Ссылка на пользователя. |
| `refresh_hash` | `refresh_hash` | `text` | нет | Хэш refresh-токена. |
| `created_at` | `created_at` | `timestamptz` | нет | Дата создания. |
| `last_seen_at` | `last_seen_at` | `timestamptz` | да | Последняя активность. |
| `revoked_at` | `revoked_at` | `timestamptz` | да | Дата отзыва. |

## Связи
Связи задаются через FK в auth-таблицах:
- `auth_identity.user_id` → `users.id`
- `auth_otp.identity_id` → `auth_identity.id`
- `auth_session.user_id` → `users.id`

## Ограничения
Документ фиксирует текущую структуру. Изменения должны синхронно отражаться в миграциях и импорте.

## См. также
- [Данные: обзор базы](database-overview.md)
- [Данные: модель данных API](data-model.md)
