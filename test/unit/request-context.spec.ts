import { requestContext } from '@/common/utils/request-context';

describe('requestContext', () => {
  it('должен возвращать request-id внутри контекста', () => {
    const result = requestContext.run('req-123', () => {
      return requestContext.getRequestId();
    });

    expect(result).toBe('req-123');
  });

  it('должен возвращать null вне контекста', () => {
    expect(requestContext.getRequestId()).toBeNull();
  });
});
