import { UsersRepository } from '@/modules/users/repositories/users.repository';

describe('UsersRepository', () => {
  it('delegates to TypeORM repository', async () => {
    const repo = {
      create: jest.fn((data) => ({ id: 1, ...data })),
      save: jest.fn(async (entity) => ({ ...entity, saved: true })),
      findOne: jest.fn(async () => ({ id: 7 })),
    };

    const service = new UsersRepository(repo as any);

    expect(service.create({ email: 'a@b.c' } as any)).toMatchObject({
      id: 1,
      email: 'a@b.c',
    });

    await expect(service.save({ id: 2 } as any)).resolves.toMatchObject({
      id: 2,
      saved: true,
    });

    await expect(service.findById(5)).resolves.toMatchObject({ id: 7 });
  });
});
