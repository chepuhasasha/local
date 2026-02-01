import { randomUUID } from 'node:crypto';

import {
  Injectable,
  NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';

import { REQUEST_ID_HEADER } from '@/common/constants/headers';
import { requestContext } from '@/common/utils/request-context';

/**
 * Добавляет request-id в контекст запроса и заголовки ответа.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  /**
   * Оборачивает выполнение запроса в контекст с request-id.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    if (!request || !response) {
      return next.handle();
    }

    const headerValue = request.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof headerValue === 'string' && headerValue.trim().length > 0
        ? headerValue
        : randomUUID();

    response.setHeader(REQUEST_ID_HEADER, requestId);

    return requestContext.run(requestId, () => next.handle());
  }
}
