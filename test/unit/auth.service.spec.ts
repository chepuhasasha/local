import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';

import { AuthService } from '@/modules/auth/auth.service';
import { AuthProvider } from '@/modules/auth/types/auth.types';

const baseAuthConfig = {
  jwtSecret: 'test-secret-123456',
  accessTtlSeconds: 600,
  refreshTtlSeconds: 3600,
  otpTtlSeconds: 300,
  otpLength: 6,
  otpCooldownSeconds: 60,
  otpWindowSeconds: 3600,
  otpMaxPerWindow: 5,
};

const makeService = () => {
  const identitiesRepository = {
    findActiveByProvider: jest.fn(),
    create: jest.fn((data) => ({ id: 1, ...data })),
    save: jest.fn(async (data) => data),
    findById: jest.fn(),
  };
  const otpsRepository = {
    findActiveByIdentityAndHash: jest.fn(),
    findLatestByIdentity: jest.fn(),
    countCreatedSince: jest.fn(),
    create: jest.fn((data) => ({ id: 11, ...data })),
    save: jest.fn(async (data) => data),
    findById: jest.fn(),
  };
  const sessionsRepository = {
    findById: jest.fn(),
    create: jest.fn((data) => ({ id: 21, ...data })),
    save: jest.fn(async (data) => data),
  };
  const usersService = {
    createWithConsents: jest.fn(),
    getById: jest.fn(),
  };
  const configService = {
    get: jest.fn(() => baseAuthConfig),
  };
  const mailerService = {
    sendOtpEmail: jest.fn(),
  };

  const service = new AuthService(
    identitiesRepository as any,
    otpsRepository as any,
    sessionsRepository as any,
    usersService as any,
    configService as any,
    mailerService as any,
  );

  return {
    service,
    identitiesRepository,
    otpsRepository,
    sessionsRepository,
    usersService,
    configService,
    mailerService,
  };
};

const buildUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 10,
  display_name: 'Neo',
  terms_accepted_at: new Date('2024-01-01T00:00:00Z'),
  privacy_accepted_at: new Date('2024-01-01T00:00:00Z'),
  marketing_opt_in: false,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
  archived_at: null,
  ...overrides,
});

const buildIdentity = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 3,
  user_id: 10,
  provider: AuthProvider.Email,
  provider_user_id: 'user@example.com',
  password_hash: null,
  password_updated_at: null,
  is_verified: false,
  verified_at: null,
  archived_at: null,
  ...overrides,
});

const buildOtp = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 5,
  identity_id: 3,
  code_hash: 'hash',
  expires_at: new Date(Date.now() + 1000),
  consumed_at: null,
  ...overrides,
});

const buildSession = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 7,
  user_id: 10,
  refresh_hash: 'hash',
  created_at: new Date(),
  last_seen_at: null,
  revoked_at: null,
  ...overrides,
});

describe('AuthService', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  it('throws when auth config missing', () => {
    const configService = { get: jest.fn(() => null) };
    expect(
      () =>
        new AuthService(
          {} as any,
          {} as any,
          {} as any,
          {} as any,
          configService as any,
          {} as any,
        ),
    ).toThrow('Auth configuration is missing.');
  });

  it('registers user when identity is new', async () => {
    const { service, identitiesRepository, usersService } = makeService();
    identitiesRepository.findActiveByProvider.mockResolvedValue(null);
    const user = buildUser();
    usersService.createWithConsents.mockResolvedValue(user);

    const result = await service.registerUser({
      email: 'User@Example.com',
      displayName: 'Neo',
    });

    expect(result).toEqual(user);
    expect(identitiesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: user.id,
        provider: AuthProvider.Email,
        provider_user_id: 'user@example.com',
        is_verified: false,
      }),
    );
  });

  it('stores password hash when registering with password', async () => {
    const { service, identitiesRepository, usersService } = makeService();
    identitiesRepository.findActiveByProvider.mockResolvedValue(null);
    usersService.createWithConsents.mockResolvedValue(buildUser());

    await service.registerUser({
      email: 'user@example.com',
      password: 'Secret123!',
    });

    const saveCalls = identitiesRepository.save.mock.calls;
    const lastSaved = saveCalls[saveCalls.length - 1]?.[0];

    expect(lastSaved.password_hash).toEqual(expect.any(String));
    expect(lastSaved.password_hash).toContain('scrypt$');
    expect(lastSaved.password_updated_at).toEqual(expect.any(Date));
  });

  it('rejects register when identity already exists', async () => {
    const { service, identitiesRepository } = makeService();
    identitiesRepository.findActiveByProvider.mockResolvedValue(
      buildIdentity(),
    );

    await expect(
      service.registerUser({ email: 'user@example.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('starts email auth and returns otp in non-production', async () => {
    const {
      service,
      identitiesRepository,
      usersService,
      otpsRepository,
      mailerService,
    } = makeService();
    process.env.NODE_ENV = 'test';

    const identity = buildIdentity();
    identitiesRepository.findActiveByProvider.mockResolvedValue(identity);
    usersService.getById.mockResolvedValue(buildUser());
    otpsRepository.findLatestByIdentity.mockResolvedValue(null);
    otpsRepository.countCreatedSince.mockResolvedValue(0);
    otpsRepository.save.mockImplementation(async (data) => ({
      ...data,
      id: 9,
      expires_at: new Date('2024-01-01T00:10:00Z'),
    }));

    const result = await service.startEmailAuth('USER@EXAMPLE.COM');

    expect(result.identity).toEqual(identity);
    expect(result.otp.id).toBe(9);
    expect(result.code).toHaveLength(baseAuthConfig.otpLength);
    expect(mailerService.sendOtpEmail).toHaveBeenCalled();
  });

  it('does not expose otp in production', async () => {
    const { service, identitiesRepository, usersService, otpsRepository } =
      makeService();
    process.env.NODE_ENV = 'production';

    identitiesRepository.findActiveByProvider.mockResolvedValue(
      buildIdentity(),
    );
    usersService.getById.mockResolvedValue(buildUser());
    otpsRepository.findLatestByIdentity.mockResolvedValue(null);
    otpsRepository.countCreatedSince.mockResolvedValue(0);
    otpsRepository.save.mockImplementation(async (data) => ({
      ...data,
      id: 9,
      expires_at: new Date('2024-01-01T00:10:00Z'),
    }));

    const result = await service.startEmailAuth('user@example.com');
    expect(result.code).toBeNull();
  });

  it('rejects email auth when identity missing', async () => {
    const { service, identitiesRepository } = makeService();
    identitiesRepository.findActiveByProvider.mockResolvedValue(null);

    await expect(
      service.startEmailAuth('user@example.com'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects email auth when user archived', async () => {
    const { service, identitiesRepository, usersService } = makeService();
    identitiesRepository.findActiveByProvider.mockResolvedValue(
      buildIdentity(),
    );
    usersService.getById.mockResolvedValue(
      buildUser({ archived_at: new Date() }),
    );

    await expect(
      service.startEmailAuth('user@example.com'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects email auth when otp cooldown not elapsed', async () => {
    const { service, identitiesRepository, usersService, otpsRepository } =
      makeService();
    identitiesRepository.findActiveByProvider.mockResolvedValue(
      buildIdentity(),
    );
    usersService.getById.mockResolvedValue(buildUser());
    otpsRepository.findLatestByIdentity.mockResolvedValue({
      created_at: new Date(Date.now() - 10 * 1000),
    });

    await expect(
      service.startEmailAuth('user@example.com'),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('rejects email auth when otp window limit exceeded', async () => {
    const { service, identitiesRepository, usersService, otpsRepository } =
      makeService();
    identitiesRepository.findActiveByProvider.mockResolvedValue(
      buildIdentity(),
    );
    usersService.getById.mockResolvedValue(buildUser());
    otpsRepository.findLatestByIdentity.mockResolvedValue(null);
    otpsRepository.countCreatedSince.mockResolvedValue(
      baseAuthConfig.otpMaxPerWindow,
    );

    await expect(
      service.startEmailAuth('user@example.com'),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('rejects otp verification with wrong length', async () => {
    const { service } = makeService();

    await expect(
      service.verifyEmailOtp({ email: 'user@example.com', code: '123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects otp verification when identity missing', async () => {
    const { service, identitiesRepository } = makeService();
    identitiesRepository.findActiveByProvider.mockResolvedValue(null);

    await expect(
      service.verifyEmailOtp({ email: 'user@example.com', code: '123456' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects otp verification when user missing', async () => {
    const { service, identitiesRepository, usersService } = makeService();
    identitiesRepository.findActiveByProvider.mockResolvedValue(
      buildIdentity(),
    );
    usersService.getById.mockRejectedValue(new Error('no user'));

    await expect(
      service.verifyEmailOtp({ email: 'user@example.com', code: '123456' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects otp verification when otp not found', async () => {
    const { service, identitiesRepository, usersService, otpsRepository } =
      makeService();
    identitiesRepository.findActiveByProvider.mockResolvedValue(
      buildIdentity(),
    );
    usersService.getById.mockResolvedValue(buildUser());
    otpsRepository.findActiveByIdentityAndHash.mockResolvedValue(null);

    await expect(
      service.verifyEmailOtp({ email: 'user@example.com', code: '123456' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('verifies otp and returns session tokens', async () => {
    const {
      service,
      identitiesRepository,
      usersService,
      otpsRepository,
      sessionsRepository,
    } = makeService();

    const identity = buildIdentity();
    identitiesRepository.findActiveByProvider.mockResolvedValue(identity);
    identitiesRepository.findById.mockResolvedValue(identity);
    usersService.getById.mockResolvedValue(buildUser());

    const otp = buildOtp({ id: 55 });
    otpsRepository.findActiveByIdentityAndHash.mockResolvedValue(otp);
    otpsRepository.findById.mockResolvedValue(otp);
    otpsRepository.save.mockImplementation(async (data) => data);

    const session = buildSession({ id: 77 });
    sessionsRepository.save.mockResolvedValue(session);

    const result = await service.verifyEmailOtp({
      email: 'user@example.com',
      code: '123456',
    });

    expect(result.sessionId).toBe(77);
    expect(result.refreshToken).toHaveLength(64);

    const payload = jwt.verify(
      result.accessToken,
      baseAuthConfig.jwtSecret,
    ) as any;
    expect(payload.sub).toBe(identity.user_id);
    expect(payload.sid).toBe(session.id);
  });

  it('logs in with password and returns session tokens', async () => {
    const { service, identitiesRepository, usersService, sessionsRepository } =
      makeService();
    const passwordHash = await (service as any).hashPassword('Secret123!');

    const identity = buildIdentity({
      user_id: 42,
      password_hash: passwordHash,
    });
    identitiesRepository.findActiveByProvider.mockResolvedValue(identity);
    usersService.getById.mockResolvedValue(buildUser({ id: 42 }));

    const session = buildSession({ id: 88, user_id: 42 });
    sessionsRepository.save.mockResolvedValue(session);

    const result = await service.loginWithPassword({
      email: 'user@example.com',
      password: 'Secret123!',
    });

    expect(result.sessionId).toBe(88);
    expect(result.refreshToken).toHaveLength(64);

    const payload = jwt.verify(
      result.accessToken,
      baseAuthConfig.jwtSecret,
    ) as any;
    expect(payload.sub).toBe(42);
    expect(payload.sid).toBe(88);
  });

  it('rejects password login when password is invalid', async () => {
    const { service, identitiesRepository, usersService } = makeService();
    const passwordHash = await (service as any).hashPassword('Secret123!');

    identitiesRepository.findActiveByProvider.mockResolvedValue(
      buildIdentity({ password_hash: passwordHash }),
    );
    usersService.getById.mockResolvedValue(buildUser());

    await expect(
      service.loginWithPassword({
        email: 'user@example.com',
        password: 'WrongPass!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects password login when password is missing', async () => {
    const { service, identitiesRepository } = makeService();
    identitiesRepository.findActiveByProvider.mockResolvedValue(
      buildIdentity({ password_hash: null }),
    );

    await expect(
      service.loginWithPassword({
        email: 'user@example.com',
        password: 'Secret123!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes session with valid token', async () => {
    const { service, sessionsRepository } = makeService();
    const refreshToken = 'refresh-token';

    const hash = (service as any).hashSecret(refreshToken);
    const session = buildSession({ refresh_hash: hash, id: 31 });
    sessionsRepository.findById.mockResolvedValue(session);

    const result = await service.refreshSession({
      sessionId: 31,
      refreshToken,
    });

    expect(result.sessionId).toBe(31);
    expect(result.refreshToken).toHaveLength(64);
    expect(sessionsRepository.save).toHaveBeenCalled();
  });

  it('rejects refresh when token mismatch', async () => {
    const { service, sessionsRepository } = makeService();
    const session = buildSession({ refresh_hash: 'abc' });
    sessionsRepository.findById.mockResolvedValue(session);

    await expect(
      service.refreshSession({ sessionId: 1, refreshToken: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects refresh when session expired', async () => {
    const { service, sessionsRepository } = makeService();
    const expired = new Date(
      Date.now() - baseAuthConfig.refreshTtlSeconds * 1000 - 10,
    );
    const session = buildSession({ created_at: expired, id: 5 });
    sessionsRepository.findById.mockResolvedValue(session);

    await expect(
      service.refreshSession({ sessionId: 5, refreshToken: 'token' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('authenticates access token and returns payload', async () => {
    const { service, sessionsRepository, usersService } = makeService();

    const session = buildSession({ id: 99, user_id: 42 });
    sessionsRepository.findById.mockResolvedValue(session);
    usersService.getById.mockResolvedValue(buildUser({ id: 42 }));

    const accessToken = jwt.sign(
      { sub: 42, sid: 99 },
      baseAuthConfig.jwtSecret,
      { algorithm: 'HS256', expiresIn: 300 },
    );

    const result = await service.authenticateAccessToken(accessToken);

    expect(result).toEqual({ userId: 42, sessionId: 99 });
    expect(sessionsRepository.save).toHaveBeenCalled();
  });

  it('rejects access token when session revoked', async () => {
    const { service, sessionsRepository, usersService } = makeService();

    const session = buildSession({ revoked_at: new Date(), id: 1, user_id: 1 });
    sessionsRepository.findById.mockResolvedValue(session);
    usersService.getById.mockResolvedValue(buildUser({ id: 1 }));

    const accessToken = jwt.sign({ sub: 1, sid: 1 }, baseAuthConfig.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: 300,
    });

    await expect(
      service.authenticateAccessToken(accessToken),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalid access token format', () => {
    const { service } = makeService();
    expect(() => service.verifyAccessToken('bad-token')).toThrow(
      UnauthorizedException,
    );
  });
});
