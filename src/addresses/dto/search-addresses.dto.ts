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
  @ApiProperty({
    description: 'Строка для поиска адреса.',
    default: 'Suyeong-gu Namcheon-dong 52-22',
  })
  query: string;

  @ApiProperty({
    description: 'Максимальное количество результатов.',
    required: false,
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  limit?: number;

  @ApiProperty({
    description: 'Смещение для постраничной выдачи.',
    required: false,
    default: 0,
    minimum: 0,
  })
  offset?: number;

  @ApiProperty({
    description: 'Язык поиска (ko, en или any).',
    required: false,
    default: 'any',
  })
  lang?: AddressSearchLanguage;
}

export class AddressDisplayDto implements AddressDisplay {
  @ApiProperty({
    description: 'Отображаемый адрес на корейском.',
    nullable: true,
    default: '부산광역시 수영구 남천동 수영로451번길 8-5',
  })
  ko: string | null;

  @ApiProperty({
    description: 'Отображаемый адрес на английском.',
    nullable: true,
    default: 'Busan Suyeong-gu Namcheon-dong Suyeong-ro 451beon-gil 8-5',
  })
  en: string | null;
}

export class AddressSearchDto implements AddressSearchText {
  @ApiProperty({
    description: 'Строка для поиска на корейском.',
    nullable: true,
    default:
      '부산광역시 수영구 남천동 수영로451번길 8-5 부산광역시 수영구 남천동 52-22 48316 누리 더 숲',
  })
  ko: string | null;

  @ApiProperty({
    description: 'Строка для поиска на английском.',
    nullable: true,
    default:
      'busan suyeong-gu namcheon-dong suyeong-ro 451beon-gil 8-5 busan suyeong-gu namcheon-dong 52-22 48316',
  })
  en: string | null;
}

export class AddressRoadLocaleDto implements AddressRoadLocale {
  @ApiProperty({
    description: 'Регион 1 (язык исходного блока).',
    nullable: true,
    default: '부산광역시',
  })
  region1: string | null;

  @ApiProperty({
    description: 'Регион 2 (язык исходного блока).',
    nullable: true,
    default: '수영구',
  })
  region2: string | null;

  @ApiProperty({
    description: 'Регион 3 (язык исходного блока).',
    nullable: true,
    default: '남천동',
  })
  region3: string | null;

  @ApiProperty({
    description: 'Название дороги.',
    nullable: true,
    default: '수영로451번길',
  })
  roadName: string | null;

  @ApiProperty({ description: 'Номер здания.', nullable: true, default: '8-5' })
  buildingNo: string | null;

  @ApiProperty({
    description: 'Флаг подземного адреса.',
    nullable: true,
    default: false,
  })
  isUnderground: boolean | null;

  @ApiProperty({
    description: 'Полная строка дорожного адреса.',
    nullable: true,
    default: '부산광역시 수영구 남천동 수영로451번길 8-5',
  })
  full: string | null;
}

export class AddressRoadCodesDto implements AddressRoadCodes {
  @ApiProperty({
    description: 'Код дороги.',
    nullable: true,
    default: '265004214246',
  })
  roadCode: string | null;

  @ApiProperty({
    description: 'Серийный номер района.',
    nullable: true,
    default: '01',
  })
  localAreaSerial: string | null;

  @ApiProperty({
    description: 'Почтовый индекс.',
    nullable: true,
    default: '48316',
  })
  postalCode: string | null;
}

export class AddressRoadBuildingDto implements AddressRoadBuilding {
  @ApiProperty({
    description: 'Название здания на корейском.',
    nullable: true,
    default: '누리 더 숲',
  })
  nameKo: string | null;
}

export class AddressRoadDto implements AddressRoad {
  @ApiProperty({
    type: AddressRoadLocaleDto,
    default: {
      region1: '부산광역시',
      region2: '수영구',
      region3: '남천동',
      roadName: '수영로451번길',
      buildingNo: '8-5',
      isUnderground: false,
      full: '부산광역시 수영구 남천동 수영로451번길 8-5',
    },
  })
  ko: AddressRoadLocaleDto;

  @ApiProperty({
    type: AddressRoadLocaleDto,
    default: {
      region1: 'Busan',
      region2: 'Suyeong-gu',
      region3: 'Namcheon-dong',
      roadName: 'Suyeong-ro 451beon-gil',
      buildingNo: '8-5',
      isUnderground: false,
      full: 'Busan Suyeong-gu Namcheon-dong Suyeong-ro 451beon-gil 8-5',
    },
  })
  en: AddressRoadLocaleDto;

  @ApiProperty({
    type: AddressRoadCodesDto,
    default: {
      roadCode: '265004214246',
      localAreaSerial: '01',
      postalCode: '48316',
    },
  })
  codes: AddressRoadCodesDto;

  @ApiProperty({
    type: AddressRoadBuildingDto,
    default: {
      nameKo: '누리 더 숲',
    },
  })
  building: AddressRoadBuildingDto;
}

export class AddressParcelLocaleDto implements AddressParcelLocale {
  @ApiProperty({
    description: 'Регион 1 (язык исходного блока).',
    nullable: true,
    default: '부산광역시',
  })
  region1: string | null;

  @ApiProperty({
    description: 'Регион 2 (язык исходного блока).',
    nullable: true,
    default: '수영구',
  })
  region2: string | null;

  @ApiProperty({
    description: 'Регион 3 (язык исходного блока).',
    nullable: true,
    default: '남천동',
  })
  region3: string | null;

  @ApiProperty({
    description: 'Регион 4 (язык исходного блока).',
    nullable: true,
    default: null,
  })
  region4: string | null;

  @ApiProperty({
    description: 'Признак горного участка.',
    nullable: true,
    default: false,
  })
  isMountainLot: boolean | null;

  @ApiProperty({
    description: 'Основной номер участка.',
    nullable: true,
    default: '52',
  })
  mainNo: string | null;

  @ApiProperty({
    description: 'Дополнительный номер участка.',
    nullable: true,
    default: '22',
  })
  subNo: string | null;

  @ApiProperty({
    description: 'Номер участка в строковом виде.',
    nullable: true,
    default: '52-22',
  })
  parcelNo: string | null;

  @ApiProperty({
    description: 'Полная строка земельного адреса.',
    nullable: true,
    default: '부산광역시 수영구 남천동 52-22',
  })
  full: string | null;
}

export class AddressParcelCodesDto implements AddressParcelCodes {
  @ApiProperty({
    description: 'Код юридического района.',
    nullable: true,
    default: '2650010500',
  })
  legalAreaCode: string | null;
}

export class AddressParcelDto implements AddressParcel {
  @ApiProperty({
    type: AddressParcelLocaleDto,
    default: {
      region1: '부산광역시',
      region2: '수영구',
      region3: '남천동',
      region4: null,
      isMountainLot: false,
      mainNo: '52',
      subNo: '22',
      parcelNo: '52-22',
      full: '부산광역시 수영구 남천동 52-22',
    },
  })
  ko: AddressParcelLocaleDto;

  @ApiProperty({
    type: AddressParcelLocaleDto,
    default: {
      region1: 'Busan',
      region2: 'Suyeong-gu',
      region3: 'Namcheon-dong',
      region4: null,
      isMountainLot: false,
      mainNo: '52',
      subNo: '22',
      parcelNo: '52-22',
      full: 'Busan Suyeong-gu Namcheon-dong 52-22',
    },
  })
  en: AddressParcelLocaleDto;

  @ApiProperty({
    type: AddressParcelCodesDto,
    default: {
      legalAreaCode: '2650010500',
    },
  })
  codes: AddressParcelCodesDto;
}

export class AddressSearchResultDto implements AddressSearchResult {
  @ApiProperty({
    description: 'Уникальный идентификатор адреса.',
    default: '2650010500100520022009431',
  })
  id: string;

  @ApiProperty({ description: 'Широта адреса.', nullable: true, default: null })
  x: number | null;

  @ApiProperty({
    description: 'Долгота адреса.',
    nullable: true,
    default: null,
  })
  y: number | null;

  @ApiProperty({
    type: AddressDisplayDto,
    default: {
      ko: '부산광역시 수영구 남천동 수영로451번길 8-5',
      en: 'Busan Suyeong-gu Namcheon-dong Suyeong-ro 451beon-gil 8-5',
    },
  })
  display: AddressDisplayDto;

  @ApiProperty({
    description: 'Детали дорожного адреса.',
    type: AddressRoadDto,
    default: {
      ko: {
        region1: '부산광역시',
        region2: '수영구',
        region3: '남천동',
        roadName: '수영로451번길',
        buildingNo: '8-5',
        isUnderground: false,
        full: '부산광역시 수영구 남천동 수영로451번길 8-5',
      },
      en: {
        region1: 'Busan',
        region2: 'Suyeong-gu',
        region3: 'Namcheon-dong',
        roadName: 'Suyeong-ro 451beon-gil',
        buildingNo: '8-5',
        isUnderground: false,
        full: 'Busan Suyeong-gu Namcheon-dong Suyeong-ro 451beon-gil 8-5',
      },
      codes: {
        roadCode: '265004214246',
        localAreaSerial: '01',
        postalCode: '48316',
      },
      building: {
        nameKo: '누리 더 숲',
      },
    },
  })
  road: AddressRoadDto;

  @ApiProperty({
    description: 'Детали земельного адреса.',
    type: AddressParcelDto,
    default: {
      ko: {
        region1: '부산광역시',
        region2: '수영구',
        region3: '남천동',
        region4: null,
        isMountainLot: false,
        mainNo: '52',
        subNo: '22',
        parcelNo: '52-22',
        full: '부산광역시 수영구 남천동 52-22',
      },
      en: {
        region1: 'Busan',
        region2: 'Suyeong-gu',
        region3: 'Namcheon-dong',
        region4: null,
        isMountainLot: false,
        mainNo: '52',
        subNo: '22',
        parcelNo: '52-22',
        full: 'Busan Suyeong-gu Namcheon-dong 52-22',
      },
      codes: {
        legalAreaCode: '2650010500',
      },
    },
  })
  parcel: AddressParcelDto;

  @ApiProperty({
    type: AddressSearchDto,
    default: {
      ko: '부산광역시 수영구 남천동 수영로451번길 8-5 부산광역시 수영구 남천동 52-22 48316 누리 더 숲',
      en: 'busan suyeong-gu namcheon-dong suyeong-ro 451beon-gil 8-5 busan suyeong-gu namcheon-dong 52-22 48316',
    },
  })
  search: AddressSearchDto;
}
