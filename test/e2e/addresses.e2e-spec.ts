import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, type Repository } from 'typeorm';

import { AddressEntity } from '@/modules/addresses/entities/address.entity';

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

type AddressSearchItem = {
  id: string;
  display: {
    ko: string | null;
    en: string | null;
  };
};

const getBody = <T>(response: { body: unknown }): T => response.body as T;

describe('Addresses e2e', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let dataSource: DataSource;
  let repository: Repository<AddressEntity>;
  let addressId: string;
  let searchToken: string;

  beforeAll(async () => {
    setupEnv();
    const { AppModule } = await import('@/app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    server = app.getHttpServer() as unknown as Parameters<typeof request>[0];
    dataSource = app.get(DataSource);
    repository = dataSource.getRepository(AddressEntity);

    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    addressId = `e2e-address-${unique}`;
    searchToken = `e2e-search-${unique}`;

    await repository.save(
      repository.create({
        id: addressId,
        x: 127.0,
        y: 37.0,
        displayKo: 'Test Address KO',
        displayEn: 'Test Address EN',
        searchKo: `ko ${searchToken}`,
        searchEn: `en ${searchToken}`,
        roadKoRegion1: 'Seoul',
        roadEnRegion1: 'Seoul',
        roadKoFull: 'Seoul Test-ro 1',
        roadEnFull: 'Seoul Test-ro 1',
        parcelKoFull: 'Seoul Test-dong 1-1',
        parcelEnFull: 'Seoul Test-dong 1-1',
      }),
    );
  });

  afterAll(async () => {
    if (repository && addressId) {
      await repository.delete({ id: addressId });
    }
    await app.close();
  });

  it('POST /addresses/search возвращает результаты', async () => {
    const response = await request(server)
      .post('/addresses/search')
      .send({
        query: searchToken,
        limit: 10,
        offset: 0,
        lang: 'any',
      })
      .expect(201);

    const body = getBody<AddressSearchItem[]>(response);

    expect(Array.isArray(body)).toBe(true);
    const ids = body.map((item) => item.id);
    expect(ids).toContain(addressId);

    const match = body.find((item) => item.id === addressId);
    expect(match).toBeDefined();
    if (!match) {
      throw new Error('Test address not found in response.');
    }

    expect(match).toEqual(
      expect.objectContaining({
        id: addressId,
        display: {
          ko: 'Test Address KO',
          en: 'Test Address EN',
        },
      }),
    );
  });
});
