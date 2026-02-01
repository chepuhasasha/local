import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

const setupEnv = () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_TYPE = 'sqlite';
  process.env.SQLITE_DB = ':memory:';
  process.env.LOG_LEVEL = 'error';
  process.env.PORT = '3001';
};

describe('Health e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    setupEnv();
    const { AppModule } = await import('@/app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health возвращает ok', async () => {
    const server = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];
    await request(server).get('/health').expect(200).expect({ status: 'ok' });
  });
});
