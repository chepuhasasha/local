import { AddressesRepository } from '@/modules/addresses/repositories/addresses.repository';

const makeQueryBuilder = () => {
  const qb = {
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  return qb;
};

describe('AddressesRepository', () => {
  it('builds query for ko language', async () => {
    const qb = makeQueryBuilder();
    const repo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const addressesRepo = new AddressesRepository(repo as any);

    await addressesRepo.search({
      lang: 'ko',
      searchValue: '%seoul%',
      limit: 10,
      offset: 0,
    });

    expect(qb.where).toHaveBeenCalledWith('address.searchKo ILIKE :search', {
      search: '%seoul%',
    });
  });

  it('builds query for en language', async () => {
    const qb = makeQueryBuilder();
    const repo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const addressesRepo = new AddressesRepository(repo as any);

    await addressesRepo.search({
      lang: 'en',
      searchValue: '%seoul%',
      limit: 10,
      offset: 0,
    });

    expect(qb.where).toHaveBeenCalledWith('address.searchEn ILIKE :search', {
      search: '%seoul%',
    });
  });

  it('builds query for any language', async () => {
    const qb = makeQueryBuilder();
    const repo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const addressesRepo = new AddressesRepository(repo as any);

    await addressesRepo.search({
      lang: 'any',
      searchValue: '%seoul%',
      limit: 10,
      offset: 0,
    });

    expect(qb.where).toHaveBeenCalledWith(
      '(address.searchKo ILIKE :search OR address.searchEn ILIKE :search)',
      { search: '%seoul%' },
    );
  });
});
