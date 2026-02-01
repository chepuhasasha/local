import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AddressesLoaderService } from './addresses/addresses.loader.service';
import { AppModule } from './app.module';

const logger = new Logger('AddressesImportCli');

async function runImport(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const loader = app.get(AddressesLoaderService);
    await loader.runImport();
  } finally {
    await app.close();
  }
}

async function bootstrap(): Promise<void> {
  try {
    await runImport();
  } catch (error) {
    logger.error('Import failed', error instanceof Error ? error.stack : '');
    process.exitCode = 1;
  }
}

void bootstrap();
