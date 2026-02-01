import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

/**
 * Модуль healthcheck эндпоинтов.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
