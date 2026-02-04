import {
  INestApplication,
  ValidationPipe,
  type INestApplicationContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@/app.module';
import type { AppConfig } from '@/config/configuration';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { RequestIdInterceptor } from '@/common/interceptors/request-id.interceptor';
import { AppLoggerService } from '@/infrastructure/observability/logger.service';

/**
 * Настраивает Swagger UI.
 */
function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Address API')
    .setDescription('API для поиска адресов')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}

/**
 * Подключает глобальные пайпы, фильтры и интерсепторы приложения.
 */
function setupApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(app.get(HttpExceptionFilter));
  app.useGlobalInterceptors(new RequestIdInterceptor());
}

/**
 * Возвращает порт из конфигурации приложения.
 */
function getAppConfig(app: INestApplicationContext): AppConfig['app'] {
  const configService = app.get(ConfigService);
  const raw: unknown = configService.get('app', { infer: true });
  if (!raw || typeof raw !== 'object') {
    throw new Error('App configuration is missing.');
  }
  return raw as AppConfig['app'];
}

/**
 * Возвращает конфигурацию rate limiting.
 */
function getRateLimitConfig(
  app: INestApplicationContext,
): AppConfig['rateLimit'] {
  const configService = app.get(ConfigService);
  const raw: unknown = configService.get('rateLimit', { infer: true });
  if (!raw || typeof raw !== 'object') {
    throw new Error('Rate limit configuration is missing.');
  }
  return raw as AppConfig['rateLimit'];
}

/**
 * Возвращает порт из конфигурации приложения.
 */
function getPort(app: INestApplicationContext): number {
  return getAppConfig(app).port;
}

/**
 * Проверяет, включён ли Swagger UI.
 */
function isSwaggerEnabled(app: INestApplicationContext): boolean {
  return getAppConfig(app).swaggerEnabled ?? false;
}

/**
 * Запускает HTTP-сервер приложения.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const rateLimitConfig = getRateLimitConfig(app);
  if (rateLimitConfig.trustProxy) {
    const adapter = app.getHttpAdapter().getInstance();
    if (adapter?.set) {
      adapter.set('trust proxy', 1);
    }
  }

  app.useLogger(app.get(AppLoggerService));
  app.enableShutdownHooks();

  setupApp(app);
  if (isSwaggerEnabled(app)) {
    setupSwagger(app);
  }

  await app.listen(getPort(app));
}

void bootstrap();
