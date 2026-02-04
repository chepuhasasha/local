import { AuthIdentitiesRepository } from '@/modules/auth/repositories/auth-identities.repository';
import { AuthOtpsRepository } from '@/modules/auth/repositories/auth-otps.repository';
import { AuthSessionsRepository } from '@/modules/auth/repositories/auth-sessions.repository';

const createQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue({ id: 1 }),
  getCount: jest.fn().mockResolvedValue(3),
});

describe('Auth repositories', () => {
  it('AuthIdentitiesRepository delegates to TypeORM repository', async () => {
    const repo = {
      create: jest.fn((data) => ({ id: 1, ...data })),
      save: jest.fn(async (entity) => ({ ...entity, saved: true })),
      findOne: jest.fn(async () => ({ id: 2 })),
    };

    const service = new AuthIdentitiesRepository(repo as any);

    expect(service.create({ provider: 'email' } as any)).toMatchObject({
      id: 1,
      provider: 'email',
    });

    await expect(service.save({ id: 10 } as any)).resolves.toMatchObject({
      id: 10,
      saved: true,
    });

    await expect(service.findById(5)).resolves.toMatchObject({ id: 2 });

    await service.findActiveByProvider('email' as any, 'user-1');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: {
        provider: 'email',
        provider_user_id: 'user-1',
        archived_at: expect.any(Object),
      },
    });
  });

  it('AuthOtpsRepository builds queries', async () => {
    const qb = createQueryBuilder();
    const repo = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn(async () => ({ id: 1 })),
      createQueryBuilder: jest.fn(() => qb),
    };

    const service = new AuthOtpsRepository(repo as any);

    expect(service.create({ code_hash: 'hash' } as any)).toMatchObject({
      code_hash: 'hash',
    });

    await expect(service.save({ id: 2 } as any)).resolves.toMatchObject({
      id: 2,
    });

    await expect(service.findById(2)).resolves.toMatchObject({ id: 1 });

    const now = new Date('2026-02-04T00:00:00Z');
    await service.findActiveByIdentityAndHash(11, 'hash', now);

    expect(qb.where).toHaveBeenCalledWith('otp.identity_id = :identityId', {
      identityId: 11,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('otp.code_hash = :codeHash', {
      codeHash: 'hash',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('otp.consumed_at IS NULL');
    expect(qb.andWhere).toHaveBeenCalledWith('otp.expires_at > :now', { now });
    expect(qb.orderBy).toHaveBeenCalledWith('otp.id', 'DESC');
    expect(qb.getOne).toHaveBeenCalled();

    await service.findLatestByIdentity(11);
    expect(qb.orderBy).toHaveBeenCalledWith('otp.created_at', 'DESC');

    await service.countCreatedSince(11, now);
    expect(qb.andWhere).toHaveBeenCalledWith('otp.created_at >= :since', {
      since: now,
    });
    expect(qb.getCount).toHaveBeenCalled();
  });

  it('AuthSessionsRepository delegates to TypeORM repository', async () => {
    const repo = {
      create: jest.fn((data) => ({ id: 1, ...data })),
      save: jest.fn(async (entity) => ({ ...entity, saved: true })),
      findOne: jest.fn(async () => ({ id: 3 })),
    };

    const service = new AuthSessionsRepository(repo as any);

    expect(service.create({ user_id: 1 } as any)).toMatchObject({
      id: 1,
      user_id: 1,
    });

    await expect(service.save({ id: 4 } as any)).resolves.toMatchObject({
      id: 4,
      saved: true,
    });

    await expect(service.findById(9)).resolves.toMatchObject({ id: 3 });
  });
});
