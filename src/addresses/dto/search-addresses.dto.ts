export type AddressSearchLanguage = 'ko' | 'en' | 'any';

export interface SearchAddressesRequest {
  query: string;
  limit?: number;
  offset?: number;
  lang?: AddressSearchLanguage;
}

export interface AddressSearchResult {
  id: string;
  display: {
    ko: string | null;
    en: string | null;
  };
  search: {
    ko: string | null;
    en: string | null;
  };
  payload: Record<string, unknown>;
}
