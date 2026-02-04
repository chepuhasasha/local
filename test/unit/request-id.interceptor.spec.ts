import { lastValueFrom, of } from 'rxjs';

import { RequestIdInterceptor } from '@/common/interceptors/request-id.interceptor';
import { REQUEST_ID_HEADER } from '@/common/constants/headers';
import { requestContext } from '@/common/utils/request-context';

const makeContext = (request: any, response: any) => ({
  switchToHttp: () => ({
    getRequest: () => request,
    getResponse: () => response,
  }),
});

describe('RequestIdInterceptor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses existing request id header', async () => {
    const interceptor = new RequestIdInterceptor();
    const request = { headers: { [REQUEST_ID_HEADER]: 'req-1' } };
    const response = { setHeader: jest.fn() };

    const result$ = interceptor.intercept(
      makeContext(request, response) as any,
      {
        handle: () => of(requestContext.getRequestId()),
      } as any,
    );

    const value = await lastValueFrom(result$);

    expect(value).toBe('req-1');
    expect(response.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'req-1');
  });

  it('generates request id when missing', async () => {
    const interceptor = new RequestIdInterceptor();
    const request = { headers: {} };
    const response = { setHeader: jest.fn() };

    const result$ = interceptor.intercept(
      makeContext(request, response) as any,
      {
        handle: () => of(requestContext.getRequestId()),
      } as any,
    );

    const value = await lastValueFrom(result$);

    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
    expect(response.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, value);
  });
});
