import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'addresses' })
export class AddressEntity {
  /**
   * Уникальный идентификатор адреса из исходного набора данных.
   */
  @PrimaryColumn({ type: 'text' })
  id: string;

  /**
   * Широта адреса (если доступна в источнике).
   */
  @Column({ type: 'double precision', nullable: true })
  x: number | null;

  /**
   * Долгота адреса (если доступна в источнике).
   */
  @Column({ type: 'double precision', nullable: true })
  y: number | null;

  /**
   * Отображаемый адрес на корейском языке.
   */
  @Column({ type: 'text', name: 'display_ko', nullable: true })
  displayKo: string | null;

  /**
   * Отображаемый адрес на английском языке.
   */
  @Column({ type: 'text', name: 'display_en', nullable: true })
  displayEn: string | null;

  /**
   * Строка для поиска на корейском языке.
   */
  @Column({ type: 'text', name: 'search_ko', nullable: true })
  searchKo: string | null;

  /**
   * Строка для поиска на английском языке.
   */
  @Column({ type: 'text', name: 'search_en', nullable: true })
  searchEn: string | null;

  /**
   * Структурированная информация о дорожном адресе.
   */
  @Column({ type: 'text', name: 'road_ko_region1', nullable: true })
  roadKoRegion1: string | null;

  @Column({ type: 'text', name: 'road_ko_region2', nullable: true })
  roadKoRegion2: string | null;

  @Column({ type: 'text', name: 'road_ko_region3', nullable: true })
  roadKoRegion3: string | null;

  @Column({ type: 'text', name: 'road_ko_road_name', nullable: true })
  roadKoRoadName: string | null;

  @Column({ type: 'text', name: 'road_ko_building_no', nullable: true })
  roadKoBuildingNo: string | null;

  @Column({ type: 'boolean', name: 'road_ko_is_underground', nullable: true })
  roadKoIsUnderground: boolean | null;

  @Column({ type: 'text', name: 'road_ko_full', nullable: true })
  roadKoFull: string | null;

  @Column({ type: 'text', name: 'road_en_region1', nullable: true })
  roadEnRegion1: string | null;

  @Column({ type: 'text', name: 'road_en_region2', nullable: true })
  roadEnRegion2: string | null;

  @Column({ type: 'text', name: 'road_en_region3', nullable: true })
  roadEnRegion3: string | null;

  @Column({ type: 'text', name: 'road_en_road_name', nullable: true })
  roadEnRoadName: string | null;

  @Column({ type: 'text', name: 'road_en_building_no', nullable: true })
  roadEnBuildingNo: string | null;

  @Column({ type: 'boolean', name: 'road_en_is_underground', nullable: true })
  roadEnIsUnderground: boolean | null;

  @Column({ type: 'text', name: 'road_en_full', nullable: true })
  roadEnFull: string | null;

  @Column({ type: 'text', name: 'road_code', nullable: true })
  roadCode: string | null;

  @Column({ type: 'text', name: 'road_local_area_serial', nullable: true })
  roadLocalAreaSerial: string | null;

  @Column({ type: 'text', name: 'road_postal_code', nullable: true })
  roadPostalCode: string | null;

  @Column({ type: 'text', name: 'road_building_name_ko', nullable: true })
  roadBuildingNameKo: string | null;

  /**
   * Структурированная информация о земельном адресе.
   */
  @Column({ type: 'text', name: 'parcel_ko_region1', nullable: true })
  parcelKoRegion1: string | null;

  @Column({ type: 'text', name: 'parcel_ko_region2', nullable: true })
  parcelKoRegion2: string | null;

  @Column({ type: 'text', name: 'parcel_ko_region3', nullable: true })
  parcelKoRegion3: string | null;

  @Column({ type: 'text', name: 'parcel_ko_region4', nullable: true })
  parcelKoRegion4: string | null;

  @Column({
    type: 'boolean',
    name: 'parcel_ko_is_mountain_lot',
    nullable: true,
  })
  parcelKoIsMountainLot: boolean | null;

  @Column({ type: 'text', name: 'parcel_ko_main_no', nullable: true })
  parcelKoMainNo: string | null;

  @Column({ type: 'text', name: 'parcel_ko_sub_no', nullable: true })
  parcelKoSubNo: string | null;

  @Column({ type: 'text', name: 'parcel_ko_parcel_no', nullable: true })
  parcelKoParcelNo: string | null;

  @Column({ type: 'text', name: 'parcel_ko_full', nullable: true })
  parcelKoFull: string | null;

  @Column({ type: 'text', name: 'parcel_en_region1', nullable: true })
  parcelEnRegion1: string | null;

  @Column({ type: 'text', name: 'parcel_en_region2', nullable: true })
  parcelEnRegion2: string | null;

  @Column({ type: 'text', name: 'parcel_en_region3', nullable: true })
  parcelEnRegion3: string | null;

  @Column({ type: 'text', name: 'parcel_en_region4', nullable: true })
  parcelEnRegion4: string | null;

  @Column({
    type: 'boolean',
    name: 'parcel_en_is_mountain_lot',
    nullable: true,
  })
  parcelEnIsMountainLot: boolean | null;

  @Column({ type: 'text', name: 'parcel_en_main_no', nullable: true })
  parcelEnMainNo: string | null;

  @Column({ type: 'text', name: 'parcel_en_sub_no', nullable: true })
  parcelEnSubNo: string | null;

  @Column({ type: 'text', name: 'parcel_en_parcel_no', nullable: true })
  parcelEnParcelNo: string | null;

  @Column({ type: 'text', name: 'parcel_en_full', nullable: true })
  parcelEnFull: string | null;

  @Column({ type: 'text', name: 'parcel_legal_area_code', nullable: true })
  parcelLegalAreaCode: string | null;
}
