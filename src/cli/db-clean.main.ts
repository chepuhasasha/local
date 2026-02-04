import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { DbCleanModule } from './db-clean.module';
import { DbCleanService } from './db-clean.service';
import { AppLoggerService } from '@/infrastructure/observability/logger.service';

const logger = new Logger('DbCleanCli');

/**
 * Запускает очистку доменных таблиц в изолированном Nest-контексте.
 */
async function runCleanup(): Promise<void> {
  const app = await NestFactory.createApplicationContext(DbCleanModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(AppLoggerService));

  try {
    const cleaner = app.get(DbCleanService);
    await cleaner.cleanDomainTables();
  } finally {
    await app.close();
  }
}

/**
 * Обрабатывает запуск CLI очистки и ошибки выполнения.
 */
async function bootstrap(): Promise<void> {
  try {
    await runCleanup();
  } catch (error) {
    logger.error('Database cleanup failed', error instanceof Error ? error.stack : '');
    process.exitCode = 1;
  }
}

void bootstrap();
