import { BadRequestException } from '@nestjs/common';

import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { requestContext } from '@/common/utils/request-context';

const makeHost = (request: any, response: any) => ({
  switchToHttp: () => ({
    getRequest: () => request,
    getResponse: () => response,
  }),
});

describe('HttpExceptionFilter', () => {
  it('formats HttpException responses and logs warning', () => {
    const logger = { warn: jest.fn(), error: jest.fn() };
    const filter = new HttpExceptionFilter(logger as any);

    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = { url: '/test' };

    requestContext.run('req-1', () => {
      filter.catch(
        new BadRequestException('bad'),
        makeHost(request, response) as any,
      );
    });

    expect(logger.warn).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'bad',
        path: '/test',
        requestId: 'req-1',
      }),
    );
  });

  it('handles non-HttpException errors as 500', () => {
    const logger = { warn: jest.fn(), error: jest.fn() };
    const filter = new HttpExceptionFilter(logger as any);

    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = { url: '/test' };

    requestContext.run('req-2', () => {
      filter.catch(new Error('boom'), makeHost(request, response) as any);
    });

    expect(logger.error).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
        requestId: 'req-2',
      }),
    );
  });

  it('preserves status code from non-HttpException errors', () => {
    const logger = { warn: jest.fn(), error: jest.fn() };
    const filter = new HttpExceptionFilter(logger as any);

    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = { url: '/test' };
    const error = Object.assign(new Error('too large'), { status: 413 });

    requestContext.run('req-3', () => {
      filter.catch(error, makeHost(request, response) as any);
    });

    expect(logger.warn).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(413);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 413,
        message: 'too large',
        error: 'Error',
        requestId: 'req-3',
      }),
    );
  });
});
