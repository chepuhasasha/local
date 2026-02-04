import { NotFoundException } from '@nestjs/common';

import { UsersService } from '@/modules/users/users.service';

const buildUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  display_name: 'Neo',
  terms_accepted_at: new Date('2024-01-01T00:00:00Z'),
  privacy_accepted_at: new Date('2024-01-02T00:00:00Z'),
  marketing_opt_in: false,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
  archived_at: null,
  ...overrides,
});

const makeService = () => {
  const usersRepository = {
    create: jest.fn((data) => ({ id: 1, ...data })),
    save: jest.fn(async (data) => data),
    findById: jest.fn(),
  };

  const service = new UsersService(usersRepository as any);
  return { service, usersRepository };
};

describe('UsersService', () => {
  it('creates user with consents', async () => {
    const { service, usersRepository } = makeService();
    const created = buildUser({ marketing_opt_in: true });
    usersRepository.save.mockResolvedValue(created);

    const result = await service.createWithConsents({
      display_name: 'Neo',
      marketing_opt_in: true,
      terms_accepted_at: new Date('2024-01-01T00:00:00Z'),
      privacy_accepted_at: new Date('2024-01-01T00:00:00Z'),
    });

    expect(result.display_name).toBe('Neo');
    expect(result.marketing_opt_in).toBe(true);
  });

  it('creates user without consents', async () => {
    const { service, usersRepository } = makeService();
    const created = buildUser({
      terms_accepted_at: null,
      privacy_accepted_at: null,
      marketing_opt_in: false,
    });
    usersRepository.save.mockResolvedValue(created);

    const result = await service.create({ display_name: null } as any);

    expect(result.terms_accepted_at).toBeNull();
    expect(result.privacy_accepted_at).toBeNull();
  });

  it('returns user by id', async () => {
    const { service, usersRepository } = makeService();
    usersRepository.findById.mockResolvedValue(buildUser());

    const result = await service.getById(1);

    expect(result.id).toBe(1);
    expect(result.created_at).toBe('2024-01-01T00:00:00.000Z');
  });

  it('updates user fields when provided', async () => {
    const { service, usersRepository } = makeService();
    const user = buildUser({ marketing_opt_in: false });
    usersRepository.findById.mockResolvedValue(user);
    usersRepository.save.mockResolvedValue({
      ...user,
      display_name: null,
      marketing_opt_in: true,
    });

    const result = await service.update(1, {
      display_name: null,
      marketing_opt_in: true,
    } as any);

    expect(result.display_name).toBeNull();
    expect(result.marketing_opt_in).toBe(true);
  });

  it('accepts terms once', async () => {
    const { service, usersRepository } = makeService();
    const user = buildUser({ terms_accepted_at: null });
    usersRepository.findById.mockResolvedValue(user);
    usersRepository.save.mockResolvedValue({
      ...user,
      terms_accepted_at: new Date('2024-01-03T00:00:00Z'),
    });

    const result = await service.acceptTerms(1);

    expect(result.terms_accepted_at).toBe('2024-01-03T00:00:00.000Z');
  });

  it('does not re-save terms when already accepted', async () => {
    const { service, usersRepository } = makeService();
    usersRepository.findById.mockResolvedValue(buildUser());

    const result = await service.acceptTerms(1);

    expect(result.terms_accepted_at).toBe('2024-01-01T00:00:00.000Z');
    expect(usersRepository.save).not.toHaveBeenCalled();
  });

  it('archives user', async () => {
    const { service, usersRepository } = makeService();
    const user = buildUser({ archived_at: null });
    usersRepository.findById.mockResolvedValue(user);
    usersRepository.save.mockResolvedValue({
      ...user,
      archived_at: new Date('2024-01-05T00:00:00Z'),
    });

    const result = await service.archive(1);

    expect(result.archived_at).toBe('2024-01-05T00:00:00.000Z');
  });

  it('throws when user missing', async () => {
    const { service, usersRepository } = makeService();
    usersRepository.findById.mockResolvedValue(null);

    await expect(service.getById(1)).rejects.toBeInstanceOf(NotFoundException);
  });
});
