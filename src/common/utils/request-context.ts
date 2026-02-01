import { AsyncLocalStorage } from 'node:async_hooks';

type RequestContextStore = {
  requestId: string;
};

const storage = new AsyncLocalStorage<RequestContextStore>();

/**
 * Управляет контекстом запроса с использованием AsyncLocalStorage.
 */
export const requestContext = {
  /**
   * Запускает выполнение функции в контексте указанного requestId.
   */
  run<T>(requestId: string, callback: () => T): T {
    return storage.run({ requestId }, callback);
  },

  /**
   * Возвращает текущий requestId из контекста.
   */
  getRequestId(): string | null {
    return storage.getStore()?.requestId ?? null;
  },
};
