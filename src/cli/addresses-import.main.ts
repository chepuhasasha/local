import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AddressesImportModule } from './addresses-import.module';
import { AddressesImportService } from './addresses-import.service';
import { AppLoggerService } from '@/infrastructure/observability/logger.service';

const logger = new Logger('AddressesImportCli');

/**
 * Запускает импорт адресов в изолированном Nest-контексте без HTTP-сервера.
 */
async function runImport(): Promise<void> {
  const app = await NestFactory.createApplicationContext(
    AddressesImportModule,
    {
      bufferLogs: true,
    },
  );
  app.useLogger(app.get(AppLoggerService));

  try {
    const loader = app.get(AddressesImportService);
    await loader.runImport();
  } finally {
    await app.close();
  }
}

/**
 * Обрабатывает запуск CLI импорта и ошибки выполнения.
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
