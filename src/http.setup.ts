import type { INestApplication, INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import express, { type RequestHandler } from 'express';
import type {
  CorsOptions,
  CustomOrigin,
} from '@nestjs/common/interfaces/external/cors-options.interface';

import type { AppConfig } from '@/config/configuration';

const getHttpConfig = (app: INestApplicationContext): AppConfig['http'] => {
  const configService = app.get(ConfigService);
  const raw: unknown = configService.get('http', { infer: true });
  if (!raw || typeof raw !== 'object') {
    throw new Error('HTTP configuration is missing.');
  }
  return raw as AppConfig['http'];
};

const createSecurityHeadersMiddleware = (
  config: AppConfig['http']['securityHeaders'],
): RequestHandler => {
  return (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', config.contentSecurityPolicy);
    next();
  };
};

const buildCorsOptions = (cors: AppConfig['http']['cors']): CorsOptions => {
  const allowedOrigins = cors.allowedOrigins;
  const allowAnyOrigin = allowedOrigins.includes('*');
  const allowedMethods =
    cors.allowedMethods.length > 0 ? cors.allowedMethods.join(',') : undefined;

  const originHandler: CustomOrigin = (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowAnyOrigin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  };

  return {
    origin: originHandler,
    methods: allowedMethods,
    credentials: cors.allowCredentials,
    optionsSuccessStatus: 204,
  };
};

export const setupHttp = (app: INestApplication): void => {
  const httpConfig = getHttpConfig(app);

  app.use(createSecurityHeadersMiddleware(httpConfig.securityHeaders));
  app.use(
    express.json({
      limit: httpConfig.bodyParser.jsonLimitBytes,
    }),
  );
  app.use(
    express.urlencoded({
      limit: httpConfig.bodyParser.urlencodedLimitBytes,
      extended: true,
    }),
  );
  app.enableCors(buildCorsOptions(httpConfig.cors));
};
