import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

type CheckStatus = 'ok' | 'fail' | 'skip';

type Check = {
  name: string;
  status: CheckStatus;
  details?: Record<string, unknown>;
};

export type LivenessResponse = {
  status: 'ok';
  timestamp: string;
};

export type InfoResponse = {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
  node: {
    version: string;
    pid: number;
    platform: string;
    arch: string;
  };
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  // Eсли HEALTH_VERBOSE=true
  env?: string;
  version?: string;
  commitSha?: string;
};

export type ReadinessResponse = {
  status: 'ok' | 'degraded' | 'fail';
  timestamp: string;
  checks: Check[];
};

@Injectable()
export class HealthService {
  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  getLiveness(): LivenessResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  getInfo(): InfoResponse {
    const mem = process.memoryUsage();
    const verbose = this.isVerbose();

    const base: InfoResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      node: {
        version: process.version,
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers,
      },
    };

    if (!verbose) return base;

    return {
      ...base,
      env: this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV,
      version:
        this.config.get<string>('APP_VERSION') ?? process.env.APP_VERSION,
      commitSha:
        this.config.get<string>('APP_COMMIT_SHA') ?? process.env.APP_COMMIT_SHA,
    };
  }

  async getReadiness(): Promise<ReadinessResponse> {
    const checks: Check[] = [];

    // DB check (TypeORM). Если DataSource не подключён — не падаем, но помечаем как skip.
    if (!this.dataSource) {
      checks.push({
        name: 'db',
        status: 'skip',
        details: { reason: 'DataSource not injected' },
      });
    } else {
      try {
        // Быстрый “ping”
        await this.dataSource.query('SELECT 1');
        checks.push({ name: 'db', status: 'ok' });
      } catch (err) {
        checks.push({
          name: 'db',
          status: 'fail',
          details: { error: err instanceof Error ? err.message : String(err) },
        });
      }
    }

    const status = this.aggregateStatus(checks);

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private aggregateStatus(checks: Check[]): ReadinessResponse['status'] {
    if (checks.some((c) => c.status === 'fail')) return 'fail';
    if (checks.some((c) => c.status === 'skip')) return 'degraded';
    return 'ok';
  }

  private isVerbose(): boolean {
    const raw =
      this.config.get<string>('HEALTH_VERBOSE') ?? process.env.HEALTH_VERBOSE;
    return raw === 'true' || raw === '1';
  }
}
