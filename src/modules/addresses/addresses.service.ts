import { BadRequestException, Injectable } from '@nestjs/common';

import { AddressesRepository } from '@/modules/addresses/repositories/addresses.repository';
import type {
  AddressSearchLanguage,
  AddressSearchResult,
} from '@/modules/addresses/types/addresses.types';
import { SearchAddressesRequest } from '@/modules/addresses/dto/search-addresses.dto';

/**
 * Сервис бизнес-логики поиска адресов.
 */
@Injectable()
export class AddressesService {
  constructor(private readonly addressesRepository: AddressesRepository) {}

  /**
   * Ищет адреса по строке пользователя и возвращает список совпадений.
   */
  async search(
    request: SearchAddressesRequest,
  ): Promise<AddressSearchResult[]> {
    const queryText = request.query?.trim();
    if (!queryText) {
      throw new BadRequestException('Параметр query обязателен.');
    }

    const limit = this.normalizeLimit(request.limit);
    const offset = this.normalizeOffset(request.offset);
    const lang = this.normalizeLanguage(request.lang);
    const searchValue = `%${queryText.toLowerCase()}%`;

    const addresses = await this.addressesRepository.search({
      lang,
      searchValue,
      limit,
      offset,
    });

    return addresses.map((address) => ({
      id: address.id,
      x: address.x,
      y: address.y,
      display: { ko: address.displayKo, en: address.displayEn },
      road: {
        ko: {
          region1: address.roadKoRegion1,
          region2: address.roadKoRegion2,
          region3: address.roadKoRegion3,
          roadName: address.roadKoRoadName,
          buildingNo: address.roadKoBuildingNo,
          isUnderground: address.roadKoIsUnderground,
          full: address.roadKoFull,
        },
        en: {
          region1: address.roadEnRegion1,
          region2: address.roadEnRegion2,
          region3: address.roadEnRegion3,
          roadName: address.roadEnRoadName,
          buildingNo: address.roadEnBuildingNo,
          isUnderground: address.roadEnIsUnderground,
          full: address.roadEnFull,
        },
        codes: {
          roadCode: address.roadCode,
          localAreaSerial: address.roadLocalAreaSerial,
          postalCode: address.roadPostalCode,
        },
        building: {
          nameKo: address.roadBuildingNameKo,
        },
      },
      parcel: {
        ko: {
          region1: address.parcelKoRegion1,
          region2: address.parcelKoRegion2,
          region3: address.parcelKoRegion3,
          region4: address.parcelKoRegion4,
          isMountainLot: address.parcelKoIsMountainLot,
          mainNo: address.parcelKoMainNo,
          subNo: address.parcelKoSubNo,
          parcelNo: address.parcelKoParcelNo,
          full: address.parcelKoFull,
        },
        en: {
          region1: address.parcelEnRegion1,
          region2: address.parcelEnRegion2,
          region3: address.parcelEnRegion3,
          region4: address.parcelEnRegion4,
          isMountainLot: address.parcelEnIsMountainLot,
          mainNo: address.parcelEnMainNo,
          subNo: address.parcelEnSubNo,
          parcelNo: address.parcelEnParcelNo,
          full: address.parcelEnFull,
        },
        codes: {
          legalAreaCode: address.parcelLegalAreaCode,
        },
      },
      search: { ko: address.searchKo, en: address.searchEn },
    }));
  }

  /**
   * Нормализует лимит выдачи, чтобы не перегружать базу.
   */
  private normalizeLimit(limit?: number): number {
    if (!Number.isFinite(limit)) {
      return 20;
    }
    return Math.min(Math.max(Math.trunc(limit ?? 20), 1), 50);
  }

  /**
   * Нормализует смещение выдачи.
   */
  private normalizeOffset(offset?: number): number {
    if (!Number.isFinite(offset)) {
      return 0;
    }
    return Math.max(Math.trunc(offset ?? 0), 0);
  }

  /**
   * Нормализует выбор языка для поиска.
   */
  private normalizeLanguage(
    lang?: AddressSearchLanguage,
  ): AddressSearchLanguage {
    if (lang === 'ko' || lang === 'en') {
      return lang;
    }
    return 'any';
  }
}
