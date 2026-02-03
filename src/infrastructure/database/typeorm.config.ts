import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { DataSource, type DataSourceOptions } from 'typeorm';

import type { AppConfig } from '@/config/configuration';
import { configuration } from '@/config/configuration';
import { AddressEntity } from '@/modules/addresses/entities/address.entity';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { AuthIdentityEntity } from '@/modules/auth/entities/auth-identity.entity';
import { AuthOtpEntity } from '@/modules/auth/entities/auth-otp.entity';
import { AuthSessionEntity } from '@/modules/auth/entities/auth-session.entity';

type BuildOptionsParams = {
  includeMigrations?: boolean;
};

/**
 * Строит параметры подключения TypeORM на основе конфигурации приложения.
 */
const buildOptions = (
  dbConfig: AppConfig['database'],
  params: BuildOptionsParams = {},
): DataSourceOptions => {
  const includeMigrations = params.includeMigrations ?? true;
  const baseOptions = {
    entities: [
      AddressEntity,
      UserEntity,
      AuthIdentityEntity,
      AuthOtpEntity,
      AuthSessionEntity,
    ],
    migrations: includeMigrations
      ? [
          'dist/infrastructure/database/migrations/*.{js,ts}',
          'src/infrastructure/database/migrations/*.{js,ts}',
        ]
      : [],
    migrationsTableName: 'migrations',
  };

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

  return buildOptions(raw as AppConfig['database'], { includeMigrations: false });
};

/**
 * Создаёт DataSource для CLI операций с миграциями.
 */
export const createDataSource = (): DataSource => {
  const dbConfig = configuration().database;
  return new DataSource(buildOptions(dbConfig, { includeMigrations: true }));
};

const AppDataSource = createDataSource();

export default AppDataSource;
