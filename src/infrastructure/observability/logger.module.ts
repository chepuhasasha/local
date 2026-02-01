import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppLoggerService } from './logger.service';

/**
 * Глобальный модуль логирования.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class LoggerModule {}
