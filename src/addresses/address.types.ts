export type AddressSearchLanguage = 'ko' | 'en' | 'any';

export interface AddressDisplay {
  ko: string | null;
  en: string | null;
}

export interface AddressSearchText {
  ko: string | null;
  en: string | null;
}

export interface AddressRoadLocale {
  region1: string | null;
  region2: string | null;
  region3: string | null;
  roadName: string | null;
  buildingNo: string | null;
  isUnderground: boolean | null;
  full: string | null;
}

export interface AddressRoadCodes {
  roadCode: string | null;
  localAreaSerial: string | null;
  postalCode: string | null;
}

export interface AddressRoadBuilding {
  nameKo: string | null;
}

export interface AddressRoad {
  ko: AddressRoadLocale;
  en: AddressRoadLocale;
  codes: AddressRoadCodes;
  building: AddressRoadBuilding;
}

export interface AddressParcelLocale {
  region1: string | null;
  region2: string | null;
  region3: string | null;
  region4: string | null;
  isMountainLot: boolean | null;
  mainNo: string | null;
  subNo: string | null;
  parcelNo: string | null;
  full: string | null;
}

export interface AddressParcelCodes {
  legalAreaCode: string | null;
}

export interface AddressParcel {
  ko: AddressParcelLocale;
  en: AddressParcelLocale;
  codes: AddressParcelCodes;
}

export interface AddressSearchResult {
  id: string;
  x: number | null;
  y: number | null;
  display: AddressDisplay;
  road: AddressRoad;
  parcel: AddressParcel;
  search: AddressSearchText;
}
