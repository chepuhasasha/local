import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AddressesLoaderService } from '@/modules/addresses/addresses.loader.service';
import { AppModule } from '@/app.module';
import { AppLoggerService } from '@/infrastructure/observability/logger.service';

const logger = new Logger('AddressesImportCli');

/**
 * Запускает импорт адресов в изолированном контексте приложения.
 */
async function runImport(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(AppLoggerService));

  try {
    const loader = app.get(AddressesLoaderService);
    await loader.runImport();
  } finally {
    await app.close();
  }
}

/**
 * Обрабатывает запуск CLI импорта и ошибочные сценарии.
 */
async function bootstrap(): Promise<void> {
  try {
    await runImport();
  } catch (error) {
    logger.error('Import failed', error instanceof Error ? error.stack : '');
    process.exitCode = 1;
  }
}

void bootstrap();
