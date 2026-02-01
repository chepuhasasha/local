import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

function getPortFromEnv(): number {
  const raw = process.env.PORT;
  if (!raw) return 3000;

  const port = Number(raw);
  if (!Number.isFinite(port)) throw new Error('PORT is not a number');
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
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  setupSwagger(app);

  await app.listen(getPortFromEnv());
}

void bootstrap();
