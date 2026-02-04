import { DbCleanService } from '@/cli/db-clean.service';

describe('DbCleanService', () => {
  it('truncates domain tables inside transaction', async () => {
    const query = jest.fn();
    const manager = { query };
    const dataSource = {
      transaction: jest.fn(async (handler: (mgr: any) => Promise<void>) =>
        handler(manager),
      ),
    };

    const service = new DbCleanService(dataSource as any);
    await service.cleanDomainTables();

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('TRUNCATE TABLE'),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('auth_identity'),
    );
    expect(query).toHaveBeenCalledWith(expect.stringContaining('users'));
  });
});
