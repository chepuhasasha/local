import {
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
  type ArgumentsHost,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { requestContext } from '@/common/utils/request-context';
import { AppLoggerService } from '@/infrastructure/observability/logger.service';

/**
 * Приводит ошибки к единому формату ответа и логирует их.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  /**
   * Обрабатывает исключения и формирует единый JSON-ответ.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (!response || !request) {
      return;
    }

    const requestId = requestContext.getRequestId();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : this.extractStatusCode(exception) ?? HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = isHttpException ? exception.getResponse() : null;
    const isServerError = status >= 500;
    const errorMessage = isServerError
      ? 'Internal server error'
      : this.extractMessage(responseBody, exception);
    const errorName = isServerError
      ? 'InternalServerError'
      : this.extractErrorName(responseBody, exception);

    const payload = {
      statusCode: status,
      error: errorName,
      message: errorMessage,
      path: request.url,
      requestId,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      this.logger.error(
        payload,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(payload);
    }

    response.status(status).json(payload);
  }

  /**
   * Извлекает сообщение об ошибке из ответа HttpException.
   */
  private extractMessage(
    responseBody: unknown,
    exception: unknown,
  ): string | string[] {
    if (typeof responseBody === 'string') {
      return responseBody;
    }

    if (responseBody && typeof responseBody === 'object') {
      const record = responseBody as Record<string, unknown>;
      const message = record.message;
      if (typeof message === 'string' || Array.isArray(message)) {
        return message;
      }
    }

    if (exception instanceof Error) {
      return exception.message || 'Internal server error';
    }

    return 'Internal server error';
  }

  /**
   * Извлекает статусный код из нестандартных ошибок (например, body-parser).
   */
  private extractStatusCode(exception: unknown): number | null {
    if (!exception || typeof exception !== 'object') {
      return null;
    }

    const record = exception as Record<string, unknown>;
    const status = record.status ?? record.statusCode;
    if (typeof status === 'number' && Number.isFinite(status)) {
      return status;
    }

    return null;
  }

  /**
   * Извлекает имя ошибки из ответа HttpException.
   */
  private extractErrorName(responseBody: unknown, exception: unknown): string {
    if (responseBody && typeof responseBody === 'object') {
      const record = responseBody as Record<string, unknown>;
      if (typeof record.error === 'string') {
        return record.error;
      }
    }

    if (exception instanceof Error) {
      return exception.name;
    }

    return 'Error';
  }
}
