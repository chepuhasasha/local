import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import type { AuthEmailStartResponse } from '@/modules/auth/dto/auth-email-start.dto';
import type { AuthEmailVerifyResponse } from '@/modules/auth/dto/auth-email-verify.dto';
import type { AuthPasswordLoginResponse } from '@/modules/auth/dto/auth-password-login.dto';
import type { AuthRefreshResponse } from '@/modules/auth/dto/auth-refresh.dto';
import type { AuthLogoutResponse } from '@/modules/auth/dto/auth-logout.dto';
import type { UserDto } from '@/modules/users/dto/user.dto';

const setupEnv = () => {
  process.env.NODE_ENV = 'test';
  process.env.POSTGRES_HOST = 'localhost';
  process.env.POSTGRES_PORT = '5432';
  process.env.POSTGRES_USER = 'postgres';
  process.env.POSTGRES_PASSWORD = 'postgres';
  process.env.POSTGRES_DB = 'addresses';
  process.env.LOG_LEVEL = 'error';
  process.env.PORT = '3001';
};

const getBody = <T>(response: { body: unknown }): T => response.body as T;

describe('Auth e2e', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let email: string;
  let otpCode: string;
  let accessToken: string;
  let refreshToken: string;
  let sessionId: number;
  let userId: number;
  let password: string;
  let passwordAccessToken: string;

  beforeAll(async () => {
    setupEnv();
    const { AppModule } = await import('@/app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    server = app.getHttpServer() as unknown as Parameters<typeof request>[0];
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    email = `e2e-${unique}@example.com`;
    password = `S3cretPass-${unique}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register регистрирует пользователя', async () => {
    const response = await request(server)
      .post('/auth/register')
      .send({
        email,
        display_name: 'E2E Tester',
        marketing_opt_in: true,
        password,
      })
      .expect(201);

    const body = getBody<UserDto>(response);

    expect(body).toMatchObject({
      display_name: 'E2E Tester',
      marketing_opt_in: true,
      archived_at: null,
    });
    expect(body.id).toEqual(expect.any(Number));
    expect(body.terms_accepted_at).toEqual(expect.any(String));
    expect(body.privacy_accepted_at).toEqual(expect.any(String));
    expect(body.created_at).toEqual(expect.any(String));
    expect(body.updated_at).toEqual(expect.any(String));

    userId = body.id;
  });

  it('POST /auth/password/login авторизует по паролю', async () => {
    const response = await request(server)
      .post('/auth/password/login')
      .send({ email, password })
      .expect(201);

    const body = getBody<AuthPasswordLoginResponse>(response);

    expect(body.user_id).toEqual(expect.any(Number));
    expect(body.session_id).toEqual(expect.any(Number));
    expect(body.access_token).toEqual(expect.any(String));
    expect(body.refresh_token).toEqual(expect.any(String));

    passwordAccessToken = body.access_token;
  });

  it('GET /auth/me принимает токен от логина по паролю', async () => {
    const response = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${passwordAccessToken}`)
      .expect(200);

    const body = getBody<UserDto>(response);

    expect(body.id).toBe(userId);
  });

  it('POST /auth/email/start выдаёт OTP', async () => {
    const response = await request(server)
      .post('/auth/email/start')
      .send({ email })
      .expect(201);

    const body = getBody<AuthEmailStartResponse>(response);

    expect(body.identity_id).toEqual(expect.any(Number));
    expect(body.otp_id).toEqual(expect.any(Number));
    expect(body.expires_at).toEqual(expect.any(String));
    expect(body.code).toEqual(expect.any(String));

    if (!body.code) {
      throw new Error('OTP code was not returned.');
    }
    otpCode = body.code;
  });

  it('POST /auth/email/verify создаёт сессию', async () => {
    const response = await request(server)
      .post('/auth/email/verify')
      .send({
        email,
        code: otpCode,
      })
      .expect(201);

    const body = getBody<AuthEmailVerifyResponse>(response);

    expect(body.user_id).toEqual(expect.any(Number));
    expect(body.session_id).toEqual(expect.any(Number));
    expect(body.access_token).toEqual(expect.any(String));
    expect(body.refresh_token).toEqual(expect.any(String));

    userId = body.user_id;
    sessionId = body.session_id;
    accessToken = body.access_token;
    refreshToken = body.refresh_token;
  });

  it('GET /auth/me возвращает профиль пользователя', async () => {
    const response = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = getBody<UserDto>(response);

    expect(body).toMatchObject({
      id: userId,
      display_name: 'E2E Tester',
      marketing_opt_in: true,
      archived_at: null,
    });
    expect(body.created_at).toEqual(expect.any(String));
    expect(body.updated_at).toEqual(expect.any(String));
  });

  it('POST /auth/refresh обновляет сессию', async () => {
    const response = await request(server)
      .post('/auth/refresh')
      .send({
        session_id: sessionId,
        refresh_token: refreshToken,
      })
      .expect(201);

    const body = getBody<AuthRefreshResponse>(response);

    expect(body.session_id).toBe(sessionId);
    expect(body.access_token).toEqual(expect.any(String));
    expect(body.refresh_token).toEqual(expect.any(String));

    accessToken = body.access_token;
    refreshToken = body.refresh_token;
  });

  it('POST /auth/logout отзывает сессию', async () => {
    const response = await request(server)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        session_id: sessionId,
      })
      .expect(201);

    const body = getBody<AuthLogoutResponse>(response);

    expect(body.session_id).toBe(sessionId);
    expect(body.revoked_at).toEqual(expect.any(String));
  });
});
