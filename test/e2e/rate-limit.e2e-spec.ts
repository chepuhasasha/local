import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

const setupEnv = () => {
  process.env.NODE_ENV = 'test';
  process.env.POSTGRES_HOST = 'localhost';
  process.env.POSTGRES_PORT = '5432';
  process.env.POSTGRES_USER = 'postgres';
  process.env.POSTGRES_PASSWORD = 'postgres';
  process.env.POSTGRES_DB = 'addresses';
  process.env.LOG_LEVEL = 'error';
  process.env.PORT = '3001';
  process.env.AUTH_OTP_COOLDOWN_SECONDS = '0';
  process.env.AUTH_OTP_WINDOW_SECONDS = '0';
  process.env.AUTH_OTP_MAX_PER_WINDOW = '0';
  process.env.THROTTLE_DEFAULT_TTL_SECONDS = '60';
  process.env.THROTTLE_DEFAULT_LIMIT = '100';
  process.env.THROTTLE_AUTH_EMAIL_START_TTL_SECONDS = '1';
  process.env.THROTTLE_AUTH_EMAIL_START_LIMIT = '2';
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Rate limit e2e', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let email: string;

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
    email = `rate-limit-${unique}@example.com`;

    await request(server)
      .post('/auth/register')
      .send({
        email,
        display_name: 'Rate Limit Tester',
        marketing_opt_in: false,
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('limits /auth/email/start and снимает блокировку после окна', async () => {
    await request(server).post('/auth/email/start').send({ email }).expect(201);

    await request(server).post('/auth/email/start').send({ email }).expect(201);

    await request(server).post('/auth/email/start').send({ email }).expect(429);

    await sleep(1100);

    await request(server).post('/auth/email/start').send({ email }).expect(201);
  });
});
