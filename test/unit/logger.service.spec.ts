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

  it('passes context to warn/debug/verbose', () => {
    const configService = { get: jest.fn(() => ({ level: 'verbose' })) };
    const warnSpy = jest
      .spyOn(ConsoleLogger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const debugSpy = jest
      .spyOn(ConsoleLogger.prototype, 'debug')
      .mockImplementation(() => undefined);
    const verboseSpy = jest
      .spyOn(ConsoleLogger.prototype, 'verbose')
      .mockImplementation(() => undefined);

    const logger = new AppLoggerService(configService as any);

    logger.warn('warn-msg', 'WarnCtx');
    logger.debug('debug-msg', 'DebugCtx');
    logger.verbose('verbose-msg', 'VerboseCtx');

    expect(warnSpy).toHaveBeenCalledWith('warn-msg', 'WarnCtx');
    expect(debugSpy).toHaveBeenCalledWith('debug-msg', 'DebugCtx');
    expect(verboseSpy).toHaveBeenCalledWith('verbose-msg', 'VerboseCtx');
  });

  it('handles trace/context variants for error', () => {
    const configService = { get: jest.fn(() => ({ level: 'warn' })) };
    const errorSpy = jest
      .spyOn(ConsoleLogger.prototype, 'error')
      .mockImplementation(() => undefined);

    const logger = new AppLoggerService(configService as any);
    logger.error('boom', 'trace', 'Ctx');
    logger.error('boom', 'trace');
    logger.error('boom');

    expect(errorSpy).toHaveBeenCalledWith('boom', 'trace', 'Ctx');
    expect(errorSpy).toHaveBeenCalledWith('boom', 'trace');
    expect(errorSpy).toHaveBeenCalledWith('boom');
  });

  it('falls back when JSON serialization fails', () => {
    const configService = { get: jest.fn(() => ({ level: 'log' })) };
    const logSpy = jest
      .spyOn(ConsoleLogger.prototype, 'log')
      .mockImplementation(() => undefined);

    const logger = new AppLoggerService(configService as any);
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    logger.log(circular);

    const message = logSpy.mock.calls[0][0] as string;
    expect(message).toBe('[object Object]');
  });
});
