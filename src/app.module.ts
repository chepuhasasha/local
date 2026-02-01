import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { configuration, validateEnv } from '@/config';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { LoggerModule } from '@/infrastructure/observability/logger.module';
import { AddressesModule } from '@/modules/addresses/addresses.module';
import { HealthModule } from '@/modules/health/health.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
      load: [configuration],
    }),
    LoggerModule,
    DatabaseModule,
    AddressesModule,
    HealthModule,
  ],
  providers: [HttpExceptionFilter],
})
export class AppModule {}
