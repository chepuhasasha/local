import { ConsoleLogger } from '@nestjs/common';

import { AppLoggerService } from '@/infrastructure/observability/logger.service';
import { requestContext } from '@/common/utils/request-context';

describe('AppLoggerService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets log levels based on config', () => {
    const configService = { get: jest.fn(() => ({ level: 'debug' })) };
    const setSpy = jest.spyOn(
      AppLoggerService.prototype as any,
      'setLogLevels',
    );

    new AppLoggerService(configService as any);

    expect(setSpy).toHaveBeenCalledWith(['error', 'warn', 'log', 'debug']);
  });

  it('formats messages with request id', () => {
    const configService = { get: jest.fn(() => ({ level: 'log' })) };
    const logSpy = jest
      .spyOn(ConsoleLogger.prototype, 'log')
      .mockImplementation(() => undefined);

    const logger = new AppLoggerService(configService as any);

    requestContext.run('req-1', () => {
      logger.log({ hello: 'world' });
    });

    expect(logSpy).toHaveBeenCalled();
    const message = logSpy.mock.calls[0][0] as string;
    expect(message).toContain('[request_id=req-1]');
  });

  it('normalizes error messages', () => {
    const configService = { get: jest.fn(() => ({ level: 'log' })) };
    const errorSpy = jest
      .spyOn(ConsoleLogger.prototype, 'error')
      .mockImplementation(() => undefined);

    const logger = new AppLoggerService(configService as any);
    logger.error(new Error('boom'));

    expect(errorSpy).toHaveBeenCalled();
    const message = errorSpy.mock.calls[0][0] as string;
    expect(message).toBe('boom');
  });
});
