import { ApiProperty } from '@nestjs/swagger';

export type AddressSearchLanguage = 'ko' | 'en' | 'any';

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

export class AddressDisplayDto {
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

export class AddressSearchDto {
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

export class AddressSearchResult {
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
    type: Object,
  })
  road: Record<string, unknown>;

  @ApiProperty({
    description: 'Детали земельного адреса.',
    type: Object,
  })
  parcel: Record<string, unknown>;

  @ApiProperty({ type: AddressSearchDto })
  search: AddressSearchDto;
}
