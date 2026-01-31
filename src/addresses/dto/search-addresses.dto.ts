import { ApiProperty } from '@nestjs/swagger';
import type {
  AddressDisplay,
  AddressParcel,
  AddressParcelCodes,
  AddressParcelLocale,
  AddressRoad,
  AddressRoadBuilding,
  AddressRoadCodes,
  AddressRoadLocale,
  AddressSearchLanguage,
  AddressSearchResult,
  AddressSearchText,
} from '../addresses.types';

export class SearchAddressesRequest {
  @ApiProperty({ description: 'Строка для поиска адреса.' })
  query: string;

  @ApiProperty({
    description: 'Максимальное количество результатов.',
    required: false,
    minimum: 1,
    maximum: 50,
  })
  limit?: number;

  @ApiProperty({
    description: 'Смещение для постраничной выдачи.',
    required: false,
    minimum: 0,
  })
  offset?: number;

  @ApiProperty({
    description: 'Язык поиска (ko, en или any).',
    required: false,
  })
  lang?: AddressSearchLanguage;
}

export class AddressDisplayDto implements AddressDisplay {
  @ApiProperty({
    description: 'Отображаемый адрес на корейском.',
    nullable: true,
  })
  ko: string | null;

  @ApiProperty({
    description: 'Отображаемый адрес на английском.',
    nullable: true,
  })
  en: string | null;
}

export class AddressSearchDto implements AddressSearchText {
  @ApiProperty({
    description: 'Строка для поиска на корейском.',
    nullable: true,
  })
  ko: string | null;

  @ApiProperty({
    description: 'Строка для поиска на английском.',
    nullable: true,
  })
  en: string | null;
}

export class AddressRoadLocaleDto implements AddressRoadLocale {
  @ApiProperty({
    description: 'Регион 1 (язык исходного блока).',
    nullable: true,
  })
  region1: string | null;

  @ApiProperty({
    description: 'Регион 2 (язык исходного блока).',
    nullable: true,
  })
  region2: string | null;

  @ApiProperty({
    description: 'Регион 3 (язык исходного блока).',
    nullable: true,
  })
  region3: string | null;

  @ApiProperty({ description: 'Название дороги.', nullable: true })
  roadName: string | null;

  @ApiProperty({ description: 'Номер здания.', nullable: true })
  buildingNo: string | null;

  @ApiProperty({ description: 'Флаг подземного адреса.', nullable: true })
  isUnderground: boolean | null;

  @ApiProperty({
    description: 'Полная строка дорожного адреса.',
    nullable: true,
  })
  full: string | null;
}

export class AddressRoadCodesDto implements AddressRoadCodes {
  @ApiProperty({ description: 'Код дороги.', nullable: true })
  roadCode: string | null;

  @ApiProperty({ description: 'Серийный номер района.', nullable: true })
  localAreaSerial: string | null;

  @ApiProperty({ description: 'Почтовый индекс.', nullable: true })
  postalCode: string | null;
}

export class AddressRoadBuildingDto implements AddressRoadBuilding {
  @ApiProperty({ description: 'Название здания на корейском.', nullable: true })
  nameKo: string | null;
}

export class AddressRoadDto implements AddressRoad {
  @ApiProperty({ type: AddressRoadLocaleDto })
  ko: AddressRoadLocaleDto;

  @ApiProperty({ type: AddressRoadLocaleDto })
  en: AddressRoadLocaleDto;

  @ApiProperty({ type: AddressRoadCodesDto })
  codes: AddressRoadCodesDto;

  @ApiProperty({ type: AddressRoadBuildingDto })
  building: AddressRoadBuildingDto;
}

export class AddressParcelLocaleDto implements AddressParcelLocale {
  @ApiProperty({
    description: 'Регион 1 (язык исходного блока).',
    nullable: true,
  })
  region1: string | null;

  @ApiProperty({
    description: 'Регион 2 (язык исходного блока).',
    nullable: true,
  })
  region2: string | null;

  @ApiProperty({
    description: 'Регион 3 (язык исходного блока).',
    nullable: true,
  })
  region3: string | null;

  @ApiProperty({
    description: 'Регион 4 (язык исходного блока).',
    nullable: true,
  })
  region4: string | null;

  @ApiProperty({ description: 'Признак горного участка.', nullable: true })
  isMountainLot: boolean | null;

  @ApiProperty({ description: 'Основной номер участка.', nullable: true })
  mainNo: string | null;

  @ApiProperty({ description: 'Дополнительный номер участка.', nullable: true })
  subNo: string | null;

  @ApiProperty({
    description: 'Номер участка в строковом виде.',
    nullable: true,
  })
  parcelNo: string | null;

  @ApiProperty({
    description: 'Полная строка земельного адреса.',
    nullable: true,
  })
  full: string | null;
}

export class AddressParcelCodesDto implements AddressParcelCodes {
  @ApiProperty({ description: 'Код юридического района.', nullable: true })
  legalAreaCode: string | null;
}

export class AddressParcelDto implements AddressParcel {
  @ApiProperty({ type: AddressParcelLocaleDto })
  ko: AddressParcelLocaleDto;

  @ApiProperty({ type: AddressParcelLocaleDto })
  en: AddressParcelLocaleDto;

  @ApiProperty({ type: AddressParcelCodesDto })
  codes: AddressParcelCodesDto;
}

export class AddressSearchResultDto implements AddressSearchResult {
  @ApiProperty({ description: 'Уникальный идентификатор адреса.' })
  id: string;

  @ApiProperty({ description: 'Широта адреса.', nullable: true })
  x: number | null;

  @ApiProperty({ description: 'Долгота адреса.', nullable: true })
  y: number | null;

  @ApiProperty({ type: AddressDisplayDto })
  display: AddressDisplayDto;

  @ApiProperty({
    description: 'Детали дорожного адреса.',
    type: AddressRoadDto,
  })
  road: AddressRoadDto;

  @ApiProperty({
    description: 'Детали земельного адреса.',
    type: AddressParcelDto,
  })
  parcel: AddressParcelDto;

  @ApiProperty({ type: AddressSearchDto })
  search: AddressSearchDto;
}
