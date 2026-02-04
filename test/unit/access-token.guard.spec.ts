import { UnauthorizedException } from '@nestjs/common';

import { AccessTokenGuard } from '@/modules/auth/guards/access-token.guard';

const makeContext = (request: any) => ({
  switchToHttp: () => ({
    getRequest: () => request,
  }),
});

describe('AccessTokenGuard', () => {
  it('rejects when no authorization header', async () => {
    const authService = { authenticateAccessToken: jest.fn() };
    const guard = new AccessTokenGuard(authService as any);
    const request = { headers: {} };

    await expect(guard.canActivate(makeContext(request) as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when scheme is invalid', async () => {
    const authService = { authenticateAccessToken: jest.fn() };
    const guard = new AccessTokenGuard(authService as any);
    const request = { headers: { authorization: 'Token abc' } };

    await expect(guard.canActivate(makeContext(request) as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('accepts valid bearer token', async () => {
    const authService = {
      authenticateAccessToken: jest
        .fn()
        .mockResolvedValue({ userId: 1, sessionId: 2 }),
    };
    const guard = new AccessTokenGuard(authService as any);
    const request: any = { headers: { authorization: 'Bearer abc' } };

    const result = await guard.canActivate(makeContext(request) as any);

    expect(result).toBe(true);
    expect(request.auth).toEqual({ userId: 1, sessionId: 2 });
  });
});
