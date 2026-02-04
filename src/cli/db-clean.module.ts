import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { configuration, validateEnv } from '@/config';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { LoggerModule } from '@/infrastructure/observability/logger.module';
import { DbCleanService } from './db-clean.service';

/**
 * Модуль CLI для очистки доменных таблиц без HTTP-инстанса.
 */
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
  ],
  providers: [DbCleanService],
})
export class DbCleanModule {}
