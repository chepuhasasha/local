import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const host = cfg.get<string>('POSTGRES_HOST');
        const portRaw = cfg.get<string>('POSTGRES_PORT');
        const username = cfg.get<string>('POSTGRES_USER');
        const password = cfg.get<string>('POSTGRES_PASSWORD');
        const database = cfg.get<string>('POSTGRES_DB');

        if (!host) throw new Error('POSTGRES_HOST is missing');
        if (!username) throw new Error('POSTGRES_USER is missing');
        if (typeof password !== 'string' || password.length === 0) {
          throw new Error('POSTGRES_PASSWORD is missing or not a string');
        }
        if (!database) throw new Error('POSTGRES_DB is missing');

        const port = portRaw ? Number(portRaw) : 5432;
        if (!Number.isFinite(port))
          throw new Error('POSTGRES_PORT is not a number');

        return {
          type: 'postgres' as const,
          host,
          port,
          username,
          password,
          database,
          synchronize: false,
          autoLoadEntities: true,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
