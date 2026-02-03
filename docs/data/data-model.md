<- [Содержание](../../README.md)

---

# Данные: модель данных API

Документ описывает структуру данных, которые возвращает API поиска адресов (`/addresses/search`).

## AddressSearchResult

Объект результата поиска содержит полный набор полей из источника и нормализованную структуру:

| Поле | Тип | Описание |
| --- | --- | --- |
| `id` | `string` | Идентификатор адреса из исходного набора данных. |
| `x` | `number \| null` | Широта (если доступна). |
| `y` | `number \| null` | Долгота (если доступна). |
| `display` | `AddressDisplay` | Отображаемые строки. |
| `road` | `AddressRoad` | Дорожный адрес (структурированный). |
| `parcel` | `AddressParcel` | Земельный адрес (структурированный). |
| `search` | `AddressSearchText` | Строки, используемые для поиска. |

## AddressDisplay

| Поле | Тип | Описание |
| --- | --- | --- |
| `ko` | `string \| null` | Отображаемая строка на корейском. |
| `en` | `string \| null` | Отображаемая строка на английском. |

## AddressRoad

`road` описывает дорожный адрес и содержит блоки `ko`, `en`, `codes`, `building`.

**AddressRoadLocale** (`road.ko` / `road.en`):

| Поле | Тип | Описание |
| --- | --- | --- |
| `region1` | `string \| null` | Регион 1. |
| `region2` | `string \| null` | Регион 2. |
| `region3` | `string \| null` | Регион 3. |
| `roadName` | `string \| null` | Название дороги. |
| `buildingNo` | `string \| null` | Номер здания. |
| `isUnderground` | `boolean \| null` | Признак подземного адреса. |
| `full` | `string \| null` | Полная строка дорожного адреса. |

**AddressRoadCodes** (`road.codes`):

| Поле | Тип | Описание |
| --- | --- | --- |
| `roadCode` | `string \| null` | Код дороги. |
| `localAreaSerial` | `string \| null` | Серийный номер района. |
| `postalCode` | `string \| null` | Почтовый индекс. |

**AddressRoadBuilding** (`road.building`):

| Поле | Тип | Описание |
| --- | --- | --- |
| `nameKo` | `string \| null` | Название здания (корейский). |

## AddressParcel

`parcel` описывает земельный адрес и содержит блоки `ko`, `en`, `codes`.

**AddressParcelLocale** (`parcel.ko` / `parcel.en`):

| Поле | Тип | Описание |
| --- | --- | --- |
| `region1` | `string \| null` | Регион 1. |
| `region2` | `string \| null` | Регион 2. |
| `region3` | `string \| null` | Регион 3. |
| `region4` | `string \| null` | Регион 4. |
| `isMountainLot` | `boolean \| null` | Признак горного участка. |
| `mainNo` | `string \| null` | Основной номер участка. |
| `subNo` | `string \| null` | Дополнительный номер участка. |
| `parcelNo` | `string \| null` | Номер участка (агрегированный). |
| `full` | `string \| null` | Полная строка земельного адреса. |

**AddressParcelCodes** (`parcel.codes`):

| Поле | Тип | Описание |
| --- | --- | --- |
| `legalAreaCode` | `string \| null` | Код административного района. |

## AddressSearchText

| Поле | Тип | Описание |
| --- | --- | --- |
| `ko` | `string \| null` | Поисковая строка (корейский). |
| `en` | `string \| null` | Поисковая строка (английский). |

## Пример ответа

```json
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
    "ko": "부산광역시 수영구 남천동 수영로451번길 8-5 부산광역시 수영구 남천동 52-22 48316 누리 더 숲",
    "en": "busan suyeong-gu namcheon-dong suyeong-ro 451beon-gil 8-5 busan suyeong-gu namcheon-dong 52-22 48316"
  }
}
```
