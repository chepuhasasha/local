import type { INestApplication } from '@nestjs/common';
import { setupHttp } from '@/http.setup';

const buildApp = (config: Record<string, unknown> | null) => {
  const app = {
    get: jest.fn().mockReturnValue({
      get: jest.fn(() => config),
    }),
    use: jest.fn(),
    enableCors: jest.fn(),
  };

  return app as unknown as INestApplication & {
    get: jest.Mock;
    use: jest.Mock;
    enableCors: jest.Mock;
  };
};

describe('setupHttp', () => {
  it('configures security headers and CORS', () => {
    const config = {
      cors: {
        allowedOrigins: ['http://allowed.local'],
        allowedMethods: ['GET', 'POST'],
        allowCredentials: false,
      },
      bodyParser: {
        jsonLimitBytes: 1024,
        urlencodedLimitBytes: 2048,
      },
      securityHeaders: {
        contentSecurityPolicy: "default-src 'none'",
      },
    };

    const app = buildApp(config);

    setupHttp(app);

    expect(app.use).toHaveBeenCalledTimes(3);
    const securityMiddleware = app.use.mock.calls[0][0] as (
      req: unknown,
      res: { setHeader: jest.Mock },
      next: jest.Mock,
    ) => void;

    const res = { setHeader: jest.fn() };
    const next = jest.fn();
    securityMiddleware({}, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      "default-src 'none'",
    );
    expect(next).toHaveBeenCalled();

    const corsOptions = app.enableCors.mock.calls[0][0];
    const allow = jest.fn();
    const deny = jest.fn();

    corsOptions.origin('http://allowed.local', allow);
    corsOptions.origin('http://blocked.local', deny);
    corsOptions.origin(undefined, allow);

    expect(allow).toHaveBeenCalledWith(null, true);
    expect(deny).toHaveBeenCalledWith(null, false);
    expect(corsOptions.methods).toBe('GET,POST');
    expect(corsOptions.credentials).toBe(false);
  });

  it('throws when http config is missing', () => {
    const app = buildApp(null as unknown as Record<string, unknown>);
    expect(() => setupHttp(app)).toThrow('HTTP configuration is missing.');
  });
});
