import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

const readEnvValue = (name: string): string | undefined => process.env[name];
const readRequiredEnv = (name: string): string => {
  const value = readEnvValue(name);
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} is missing`);
  }
  return value;
};

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
        const host = readRequiredEnv('POSTGRES_HOST');
        const portRaw = readEnvValue('POSTGRES_PORT');
        const username = readRequiredEnv('POSTGRES_USER');
        const password = readRequiredEnv('POSTGRES_PASSWORD');
        const database = readRequiredEnv('POSTGRES_DB');

        const port = portRaw ? Number(portRaw) : 5432;
        if (!Number.isFinite(port)) {
          throw new Error('POSTGRES_PORT is not a number');
        }

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
