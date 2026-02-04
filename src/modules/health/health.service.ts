import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import type {
  HealthCheckDto,
  InfoResponseDto,
  LivenessResponseDto,
  ReadinessResponseDto,
} from './dto/health.dto';

@Injectable()
export class HealthService {
  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Возвращает ответ для liveness-проверки.
   */
  getLiveness(): LivenessResponseDto {
    return {
      status: 'ok',
      timestamp: this.getTimestamp(),
    };
  }

  /**
   * Возвращает диагностическую информацию о рантайме.
   */
  getInfo(): InfoResponseDto {
    const verbose = this.isVerbose();

    const base: InfoResponseDto = {
      status: 'ok',
      timestamp: this.getTimestamp(),
      uptimeSeconds: Math.floor(process.uptime()),
      node: this.getNodeInfo(),
      memory: this.getMemoryInfo(),
    };

    if (!verbose) return base;

    return {
      ...base,
      env: this.getEnvValue('NODE_ENV'),
      version: this.getEnvValue('APP_VERSION'),
      commitSha: this.getEnvValue('APP_COMMIT_SHA'),
    };
  }

  /**
   * Возвращает готовность сервиса с деталями проверок.
   */
  async getReadiness(): Promise<ReadinessResponseDto> {
    const checks = [await this.checkDatabase()];
    return this.buildReadiness(checks);
  }

  /**
   * Агрегирует итоговый статус на основе результатов проверок.
   */
  private aggregateStatus(
    checks: HealthCheckDto[],
  ): ReadinessResponseDto['status'] {
    if (checks.some((c) => c.status === 'fail')) return 'fail';
    if (checks.some((c) => c.status === 'skip')) return 'degraded';
    return 'ok';
  }

  /**
   * Проверяет, включён ли расширенный вывод для info.
   */
  private isVerbose(): boolean {
    const raw =
      this.config.get<string>('HEALTH_VERBOSE') ?? process.env.HEALTH_VERBOSE;
    return raw === 'true' || raw === '1';
  }

  /**
   * Возвращает ISO-таймстамп текущего времени.
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Формирует информацию о рантайме Node.js.
   */
  private getNodeInfo(): InfoResponseDto['node'] {
    return {
      version: process.version,
      pid: process.pid,
      platform: process.platform,
      arch: process.arch,
    };
  }

  /**
   * Формирует статистику использования памяти процесса.
   */
  private getMemoryInfo(): InfoResponseDto['memory'] {
    const mem = process.memoryUsage();
    return {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
    };
  }

  /**
   * Возвращает значение переменной окружения из ConfigService или process.env.
   */
  private getEnvValue(key: string): string | undefined {
    return this.config.get<string>(key) ?? process.env[key];
  }

  /**
   * Выполняет проверку доступности базы данных.
   */
  private async checkDatabase(): Promise<HealthCheckDto> {
    if (!this.dataSource) {
      return {
        name: 'db',
        status: 'skip',
        details: { reason: 'DataSource not injected' },
      };
    }

    try {
      const timeoutMs = this.getDbTimeoutMs();
      await this.withTimeout(this.dataSource.query('SELECT 1'), timeoutMs);
      return { name: 'db', status: 'ok' };
    } catch (err) {
      return {
        name: 'db',
        status: 'fail',
        details: { error: err instanceof Error ? err.message : String(err) },
      };
    }
  }

  /**
   * Формирует итоговый ответ readiness.
   */
  private buildReadiness(checks: HealthCheckDto[]): ReadinessResponseDto {
    return {
      status: this.aggregateStatus(checks),
      timestamp: this.getTimestamp(),
      checks,
    };
  }

  /**
   * Возвращает таймаут проверки базы данных в миллисекундах.
   */
  private getDbTimeoutMs(): number {
    const raw =
      this.config.get<string>('HEALTH_DB_TIMEOUT_MS') ??
      process.env.HEALTH_DB_TIMEOUT_MS;
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.trunc(parsed);
    }
    return 2000;
  }

  /**
   * Оборачивает обещание таймаутом.
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`DB check timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
