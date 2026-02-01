import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  HealthService,
  InfoResponse,
  LivenessResponse,
  ReadinessResponse,
} from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * Liveness: процесс жив.
   * Должен быть максимально лёгким и всегда 200.
   */
  @Get()
  @ApiOperation({ summary: 'Liveness check (always 200 if process is up)' })
  @ApiOkResponse({
    schema: {
      example: { status: 'ok', timestamp: '2026-02-01T00:00:00.000Z' },
    },
  })
  getHealth(): LivenessResponse {
    return this.health.getLiveness();
  }

  /**
   * Info: полезная диагностика (uptime/memory/node).
   * Часть полей включается только при HEALTH_VERBOSE=true.
   */
  @Get('info')
  @ApiOperation({ summary: 'Runtime info (uptime, memory, node)' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-02-01T00:00:00.000Z',
        uptimeSeconds: 1234,
        node: {
          version: 'v20.11.0',
          pid: 12345,
          platform: 'linux',
          arch: 'x64',
        },
        memory: {
          rss: 123,
          heapUsed: 45,
          heapTotal: 67,
          external: 1,
          arrayBuffers: 1,
        },
      },
    },
  })
  getInfo(): InfoResponse {
    return this.health.getInfo();
  }

  /**
   * Readiness: готов ли сервис принимать трафик (например, БД доступна).
   * Если не готов — 503.
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (503 if not ready)' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-02-01T00:00:00.000Z',
        checks: [{ name: 'db', status: 'ok' }],
      },
    },
  })
  async getReady(): Promise<ReadinessResponse> {
    const res = await this.health.getReadiness();

    if (res.status !== 'ok') {
      // Важно: для k8s/балансера readiness обычно должен отдавать 503 при fail/degraded
      throw new ServiceUnavailableException(res);
    }

    return res;
  }
}
