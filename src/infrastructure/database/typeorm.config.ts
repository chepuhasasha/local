import { ConfigService } from '@nestjs/config';
import { DataSource, type DataSourceOptions } from 'typeorm';

import type { AppConfig } from '@/config/configuration';
import { configuration } from '@/config/configuration';
import { AddressEntity } from '@/modules/addresses/entities/address.entity';

/**
 * Строит параметры подключения TypeORM на основе конфигурации приложения.
 */
const buildOptions = (dbConfig: AppConfig['database']): DataSourceOptions => {
  const baseOptions = {
    entities: [AddressEntity],
    migrations: ['dist/infrastructure/database/migrations/*.{js,ts}'],
    migrationsTableName: 'migrations',
    synchronize: dbConfig.synchronize,
  };

  if (dbConfig.type === 'sqlite') {
    return {
      type: 'sqlite',
      database: dbConfig.sqlite.database ?? ':memory:',
      ...baseOptions,
    };
  }

  return {
    type: 'postgres',
    host: dbConfig.postgres.host ?? undefined,
    port: dbConfig.postgres.port ?? undefined,
    username: dbConfig.postgres.username ?? undefined,
    password: dbConfig.postgres.password ?? undefined,
    database: dbConfig.postgres.database ?? undefined,
    ...baseOptions,
  };
};

/**
 * Формирует параметры TypeORM для NestJS модуля.
 */
export const buildTypeOrmOptions = (
  configService: ConfigService,
): DataSourceOptions => {
  const raw: unknown = configService.get('database', { infer: true });
  if (!raw || typeof raw !== 'object') {
    throw new Error('Database configuration is missing.');
  }

  return buildOptions(raw as AppConfig['database']);
};

/**
 * Создаёт DataSource для CLI операций с миграциями.
 */
export const createDataSource = (): DataSource => {
  const dbConfig = configuration().database;
  return new DataSource(buildOptions(dbConfig));
};
