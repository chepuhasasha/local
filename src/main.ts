import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AddressesModule } from './addresses/addresses.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    AddressesModule,
  ],
})
class AppModule {}

function getPortFromEnv(): number {
  const raw = process.env.PORT;
  if (!raw) return 3000;

  const port = Number(raw);
  if (!Number.isFinite(port)) {
    throw new Error('PORT is not a number');
  }
  return port;
}

function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Address API')
    .setDescription('API для поиска адресов')
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {});

  app.enableShutdownHooks();
  setupSwagger(app);

  const port = getPortFromEnv();

  await app.listen(port);
}

void bootstrap();
