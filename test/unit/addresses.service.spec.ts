import { BadRequestException } from '@nestjs/common';

import { AddressesService } from '@/modules/addresses/addresses.service';

const makeService = () => {
  const addressesRepository = {
    search: jest.fn(),
  };

  const service = new AddressesService(addressesRepository as any);
  return { service, addressesRepository };
};

describe('AddressesService', () => {
  it('rejects empty query', async () => {
    const { service } = makeService();

    await expect(
      service.search({ query: '   ' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('normalizes search params and maps results', async () => {
    const { service, addressesRepository } = makeService();

    addressesRepository.search.mockResolvedValue([
      {
        id: 'A1',
        x: 1,
        y: 2,
        displayKo: 'Seoul',
        displayEn: 'Seoul',
        roadKoRegion1: 'R1',
        roadKoRegion2: 'R2',
        roadKoRegion3: 'R3',
        roadKoRoadName: 'Road',
        roadKoBuildingNo: '10',
        roadKoIsUnderground: false,
        roadKoFull: 'R1 R2 Road 10',
        roadEnRegion1: 'ER1',
        roadEnRegion2: 'ER2',
        roadEnRegion3: 'ER3',
        roadEnRoadName: 'ERoad',
        roadEnBuildingNo: '10',
        roadEnIsUnderground: false,
        roadEnFull: 'ER1 ER2 ERoad 10',
        roadCode: 'RC',
        roadLocalAreaSerial: '01',
        roadPostalCode: '12345',
        roadBuildingNameKo: 'Building',
        parcelKoRegion1: 'P1',
        parcelKoRegion2: 'P2',
        parcelKoRegion3: 'P3',
        parcelKoRegion4: 'P4',
        parcelKoIsMountainLot: false,
        parcelKoMainNo: '12',
        parcelKoSubNo: '0',
        parcelKoParcelNo: '12',
        parcelKoFull: 'P1 P2 12',
        parcelEnRegion1: 'PE1',
        parcelEnRegion2: 'PE2',
        parcelEnRegion3: 'PE3',
        parcelEnRegion4: null,
        parcelEnIsMountainLot: false,
        parcelEnMainNo: '12',
        parcelEnSubNo: '0',
        parcelEnParcelNo: '12',
        parcelEnFull: 'PE1 PE2 12',
        parcelLegalAreaCode: 'L1',
        searchKo: 'seoul',
        searchEn: 'seoul',
      },
    ]);

    const result = await service.search({
      query: ' Seoul ',
      limit: 100,
      offset: -10,
      lang: 'ko',
    } as any);

    expect(addressesRepository.search).toHaveBeenCalledWith({
      lang: 'ko',
      searchValue: '%seoul%',
      limit: 50,
      offset: 0,
    });

    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'A1',
        display: { ko: 'Seoul', en: 'Seoul' },
        road: expect.objectContaining({
          codes: { roadCode: 'RC', localAreaSerial: '01', postalCode: '12345' },
          building: { nameKo: 'Building' },
        }),
        parcel: expect.objectContaining({
          codes: { legalAreaCode: 'L1' },
        }),
      }),
    );
  });
});
