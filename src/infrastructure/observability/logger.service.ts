import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '@/config/configuration';
import { requestContext } from '@/common/utils/request-context';

/**
 * Стандартизированный логгер приложения.
 */
@Injectable()
export class AppLoggerService extends ConsoleLogger {
  constructor(private readonly configService: ConfigService) {
    super();
    this.setLogLevels(this.resolveLogLevels());
  }

  /**
   * Логирует информационное сообщение.
   */
  override log(message: unknown, context?: string): void {
    super.log(this.formatLogMessage(message), context);
  }

  /**
   * Логирует предупреждение.
   */
  override warn(message: unknown, context?: string): void {
    super.warn(this.formatLogMessage(message), context);
  }

  /**
   * Логирует ошибку.
   */
  override error(message: unknown, trace?: string, context?: string): void {
    super.error(this.formatLogMessage(message), trace, context);
  }

  /**
   * Логирует отладочное сообщение.
   */
  override debug(message: unknown, context?: string): void {
    super.debug(this.formatLogMessage(message), context);
  }

  /**
   * Логирует verbose сообщение.
   */
  override verbose(message: unknown, context?: string): void {
    super.verbose(this.formatLogMessage(message), context);
  }

  /**
   * Приводит сообщение к строке и добавляет request-id, если он есть.
   */
  private formatLogMessage(message: unknown): string {
    const requestId = requestContext.getRequestId();
    const normalized = this.normalizeMessage(message);

    if (requestId) {
      return `[request_id=${requestId}] ${normalized}`;
    }

    return normalized;
  }

  /**
   * Преобразует любое значение в строку для логирования.
   */
  private normalizeMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    if (message instanceof Error) {
      return message.message;
    }

    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  /**
   * Возвращает набор уровней логирования в зависимости от конфигурации.
   */
  private resolveLogLevels(): LogLevel[] {
    const raw: unknown = this.configService.get('logger', { infer: true });
    const config =
      raw && typeof raw === 'object' ? (raw as AppConfig['logger']) : null;
    const level = config?.level ?? 'log';

    switch (level) {
      case 'error':
        return ['error'];
      case 'warn':
        return ['error', 'warn'];
      case 'debug':
        return ['error', 'warn', 'log', 'debug'];
      case 'verbose':
        return ['error', 'warn', 'log', 'debug', 'verbose'];
      case 'log':
      default:
        return ['error', 'warn', 'log'];
    }
  }
}
