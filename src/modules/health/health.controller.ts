import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { HealthService } from './health.service';
import {
  InfoResponseDto,
  LivenessResponseDto,
  ReadinessResponseDto,
} from './dto/health.dto';

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
  @ApiOkResponse({ type: LivenessResponseDto })
  getHealth(): LivenessResponseDto {
    return this.health.getLiveness();
  }

  /**
   * Info: полезная диагностика (uptime/memory/node).
   * Часть полей включается только при HEALTH_VERBOSE=true.
   */
  @Get('info')
  @ApiOperation({ summary: 'Runtime info (uptime, memory, node)' })
  @ApiOkResponse({ type: InfoResponseDto })
  getInfo(): InfoResponseDto {
    return this.health.getInfo();
  }

  /**
   * Readiness: готов ли сервис принимать трафик (например, БД доступна).
   * Если не готов — 503.
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (503 if not ready)' })
  @ApiOkResponse({ type: ReadinessResponseDto })
  async getReady(): Promise<ReadinessResponseDto> {
    const res = await this.health.getReadiness();

    if (res.status !== 'ok') {
      // Важно: для k8s/балансера readiness обычно должен отдавать 503 при fail/degraded
      throw new ServiceUnavailableException(res);
    }

    return res;
  }
}
