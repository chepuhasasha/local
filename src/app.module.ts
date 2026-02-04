import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { configuration, validateEnv } from '@/config';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { LoggerModule } from '@/infrastructure/observability/logger.module';
import { AddressesModule } from '@/modules/addresses/addresses.module';
import { HealthModule } from '@/modules/health/health.module';
import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import type { AppConfig } from '@/config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
      load: [configuration],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => {
        const raw: unknown = configService.get('rateLimit', { infer: true });
        if (!raw || typeof raw !== 'object') {
          throw new Error('Rate limit configuration is missing.');
        }
        const rateLimit = raw as AppConfig['rateLimit'];
        return {
          throttlers: [
            {
              ttl: rateLimit.defaultTtlSeconds * 1000,
              limit: rateLimit.defaultLimit,
            },
          ],
        };
      },
    }),
    LoggerModule,
    DatabaseModule,
    AddressesModule,
    UsersModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    HttpExceptionFilter,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
