import { AddressesController } from '@/modules/addresses/addresses.controller';

const makeController = () => {
  const addressesService = {
    search: jest.fn(),
  };
  const controller = new AddressesController(addressesService as any);
  return { controller, addressesService };
};

describe('AddressesController', () => {
  it('delegates search to service', async () => {
    const { controller, addressesService } = makeController();
    addressesService.search.mockResolvedValue([{ id: '1' }]);

    const result = await controller.search({ query: 'Seoul' } as any);

    expect(result).toEqual([{ id: '1' }]);
    expect(addressesService.search).toHaveBeenCalledWith({ query: 'Seoul' });
  });
});
