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
};

type LivenessResponse = {
  status: 'ok';
  timestamp: string;
};

type InfoResponse = {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
  node: {
    version: string;
    pid: number;
    platform: string;
    arch: string;
  };
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
};

type ReadinessResponse = {
  status: 'ok' | 'degraded' | 'fail';
  timestamp: string;
  checks: Array<{
    name: string;
    status: string;
    details?: Record<string, unknown>;
  }>;
};

const getBody = <T>(response: { body: unknown }): T => response.body as T;

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
    const response = await request(server).get('/health').expect(200);
    const body = getBody<LivenessResponse>(response);

    expect(body.status).toBe('ok');
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it('GET /health/info возвращает диагностическую информацию', async () => {
    const server = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];
    const response = await request(server).get('/health/info').expect(200);

    const body = getBody<InfoResponse>(response);

    expect(body.status).toBe('ok');
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.uptimeSeconds).toEqual(expect.any(Number));
    expect(body.node.version).toEqual(expect.any(String));
    expect(body.node.pid).toEqual(expect.any(Number));
    expect(body.node.platform).toEqual(expect.any(String));
    expect(body.node.arch).toEqual(expect.any(String));
    expect(body.memory.rss).toEqual(expect.any(Number));
    expect(body.memory.heapUsed).toEqual(expect.any(Number));
    expect(body.memory.heapTotal).toEqual(expect.any(Number));
    expect(body.memory.external).toEqual(expect.any(Number));
    expect(body.memory.arrayBuffers).toEqual(expect.any(Number));
  });

  it('GET /health/ready возвращает ok при доступной БД', async () => {
    const server = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];
    const response = await request(server).get('/health/ready').expect(200);

    const body = getBody<ReadinessResponse>(response);

    expect(body.status).toBe('ok');
    expect(body.timestamp).toEqual(expect.any(String));
    expect(Array.isArray(body.checks)).toBe(true);
  });
});
