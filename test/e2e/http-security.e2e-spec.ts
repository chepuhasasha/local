import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { setupHttp } from '@/http.setup';

const allowedOrigin = 'http://allowed.local';
const blockedOrigin = 'http://blocked.local';

const setupEnv = () => {
  process.env.NODE_ENV = 'test';
  process.env.POSTGRES_HOST = 'localhost';
  process.env.POSTGRES_PORT = '5432';
  process.env.POSTGRES_USER = 'postgres';
  process.env.POSTGRES_PASSWORD = 'postgres';
  process.env.POSTGRES_DB = 'addresses';
  process.env.LOG_LEVEL = 'error';
  process.env.PORT = '3001';
  process.env.CORS_ALLOWED_ORIGINS = allowedOrigin;
  process.env.CORS_ALLOWED_METHODS = 'GET,POST,OPTIONS';
  process.env.CORS_ALLOW_CREDENTIALS = 'false';
  process.env.HTTP_JSON_BODY_LIMIT_BYTES = '1024';
  process.env.HTTP_URLENCODED_BODY_LIMIT_BYTES = '1024';
};

const buildLargePayload = (size: number) => ({
  data: 'a'.repeat(size),
});

describe('HTTP security e2e', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];

  beforeAll(async () => {
    setupEnv();
    const { AppModule } = await import('@/app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    setupHttp(app);
    await app.init();

    server = app.getHttpServer() as unknown as Parameters<typeof request>[0];
  });

  afterAll(async () => {
    await app.close();
  });

  it('разрешает CORS для известного origin', async () => {
    const response = await request(server)
      .options('/health')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-methods']).toContain('GET');
    expect(response.headers['access-control-allow-methods']).toContain('POST');
  });

  it('не возвращает CORS заголовки для неизвестного origin', async () => {
    const response = await request(server)
      .get('/health')
      .set('Origin', blockedOrigin)
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('возвращает 413 при слишком большом JSON body', async () => {
    await request(server)
      .post('/auth/email/start')
      .send(buildLargePayload(2048))
      .expect(413);
  });

  it('возвращает 413 при слишком большом urlencoded body', async () => {
    await request(server)
      .post('/auth/email/start')
      .type('form')
      .send(`data=${'a'.repeat(2048)}`)
      .expect(413);
  });
});
