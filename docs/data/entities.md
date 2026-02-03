<- [Содержание](../../README.md)

---

# Данные: сущности

Документ описывает сущности TypeORM, используемые приложением. В текущей версии это одна сущность `AddressEntity`, которая соответствует таблице `addresses`.

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

## Связи

Связей между сущностями нет. Данные читаются из одной таблицы `addresses`.

## Дополнительно

API модель ответа описана в [Данные: модель данных API](data-model.md).
