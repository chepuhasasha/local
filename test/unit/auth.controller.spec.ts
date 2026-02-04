import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { AuthController } from '@/modules/auth/auth.controller';

const makeController = () => {
  const authService = {
    registerUser: jest.fn(),
    startEmailAuth: jest.fn(),
    verifyEmailOtp: jest.fn(),
    refreshSession: jest.fn(),
    logoutSession: jest.fn(),
  };
  const usersService = {
    getById: jest.fn(),
  };

  const controller = new AuthController(
    authService as any,
    usersService as any,
  );
  return { controller, authService, usersService };
};

describe('AuthController', () => {
  it('registers user', async () => {
    const { controller, authService } = makeController();
    authService.registerUser.mockResolvedValue({ id: 1 });

    const result = await controller.register({
      email: 'user@example.com',
      display_name: 'Neo',
      marketing_opt_in: true,
    } as any);

    expect(result).toEqual({ id: 1 });
    expect(authService.registerUser).toHaveBeenCalledWith({
      email: 'user@example.com',
      displayName: 'Neo',
      marketingOptIn: true,
    });
  });

  it('starts email auth', async () => {
    const { controller, authService } = makeController();
    authService.startEmailAuth.mockResolvedValue({
      identity: { id: 2 },
      otp: { id: 3, expires_at: new Date('2024-01-01T00:00:00Z') },
      code: '123456',
    });

    const result = await controller.startEmail({
      email: 'user@example.com',
    } as any);

    expect(result).toEqual({
      identity_id: 2,
      otp_id: 3,
      expires_at: '2024-01-01T00:00:00.000Z',
      code: '123456',
    });
  });

  it('verifies email otp', async () => {
    const { controller, authService } = makeController();
    authService.verifyEmailOtp.mockResolvedValue({
      userId: 10,
      sessionId: 20,
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const result = await controller.verifyEmail({
      email: 'user@example.com',
      code: '123456',
    } as any);

    expect(result).toEqual({
      user_id: 10,
      session_id: 20,
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('refreshes session', async () => {
    const { controller, authService } = makeController();
    authService.refreshSession.mockResolvedValue({
      sessionId: 20,
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const result = await controller.refresh({
      session_id: 20,
      refresh_token: 'refresh',
    } as any);

    expect(result).toEqual({
      session_id: 20,
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('rejects logout without user', async () => {
    const { controller } = makeController();

    await expect(
      controller.logout(null, { session_id: 1 } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects logout with mismatched session', async () => {
    const { controller } = makeController();

    await expect(
      controller.logout({ userId: 1, sessionId: 2 }, { session_id: 1 } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('logs out matching session', async () => {
    const { controller, authService } = makeController();
    authService.logoutSession.mockResolvedValue({
      id: 2,
      revoked_at: new Date('2024-01-01T00:00:00Z'),
    });

    const result = await controller.logout({ userId: 1, sessionId: 2 }, {
      session_id: 2,
    } as any);

    expect(result).toEqual({
      session_id: 2,
      revoked_at: '2024-01-01T00:00:00.000Z',
    });
  });

  it('returns current user profile', async () => {
    const { controller, usersService } = makeController();
    usersService.getById.mockResolvedValue({ id: 9 });

    const result = await controller.me({ userId: 9, sessionId: 1 });

    expect(result).toEqual({ id: 9 });
  });

  it('rejects me without user', async () => {
    const { controller } = makeController();

    await expect(controller.me(null)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
