import { ApiProperty } from '@nestjs/swagger';

export type HealthCheckStatus = 'ok' | 'fail' | 'skip';

export class HealthCheckDto {
  @ApiProperty({
    description: 'Название проверки.',
    example: 'db',
  })
  name: string;

  @ApiProperty({
    description: 'Статус проверки.',
    enum: ['ok', 'fail', 'skip'],
    example: 'ok',
  })
  status: HealthCheckStatus;

  @ApiProperty({
    description: 'Дополнительные сведения о проверке.',
    required: false,
    example: { reason: 'DataSource not injected' },
  })
  details?: Record<string, unknown>;
}

export class LivenessResponseDto {
  @ApiProperty({
    description: 'Статус процесса.',
    example: 'ok',
  })
  status: 'ok';

  @ApiProperty({
    description: 'ISO-таймстамп ответа.',
    example: '2026-02-01T00:00:00.000Z',
  })
  timestamp: string;
}

export class NodeInfoDto {
  @ApiProperty({
    description: 'Версия Node.js.',
    example: 'v20.11.0',
  })
  version: string;

  @ApiProperty({
    description: 'PID процесса.',
    example: 12345,
  })
  pid: number;

  @ApiProperty({
    description: 'Платформа.',
    example: 'linux',
  })
  platform: string;

  @ApiProperty({
    description: 'Архитектура.',
    example: 'x64',
  })
  arch: string;
}

export class MemoryInfoDto {
  @ApiProperty({
    description: 'RSS процесса (в байтах).',
    example: 123,
  })
  rss: number;

  @ApiProperty({
    description: 'Использование heap (в байтах).',
    example: 45,
  })
  heapUsed: number;

  @ApiProperty({
    description: 'Общий heap (в байтах).',
    example: 67,
  })
  heapTotal: number;

  @ApiProperty({
    description: 'External memory (в байтах).',
    example: 1,
  })
  external: number;

  @ApiProperty({
    description: 'ArrayBuffers (в байтах).',
    example: 1,
  })
  arrayBuffers: number;
}

export class InfoResponseDto {
  @ApiProperty({
    description: 'Статус процесса.',
    example: 'ok',
  })
  status: 'ok';

  @ApiProperty({
    description: 'ISO-таймстамп ответа.',
    example: '2026-02-01T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Время работы процесса в секундах.',
    example: 1234,
  })
  uptimeSeconds: number;

  @ApiProperty({
    description: 'Информация о рантайме Node.js.',
    type: NodeInfoDto,
  })
  node: NodeInfoDto;

  @ApiProperty({
    description: 'Информация о памяти процесса.',
    type: MemoryInfoDto,
  })
  memory: MemoryInfoDto;

  @ApiProperty({
    description: 'Окружение приложения (только при HEALTH_VERBOSE=true).',
    required: false,
    example: 'production',
  })
  env?: string;

  @ApiProperty({
    description: 'Версия приложения (только при HEALTH_VERBOSE=true).',
    required: false,
    example: '1.2.3',
  })
  version?: string;

  @ApiProperty({
    description: 'SHA коммита (только при HEALTH_VERBOSE=true).',
    required: false,
    example: 'abcdef1234567890',
  })
  commitSha?: string;
}

export class ReadinessResponseDto {
  @ApiProperty({
    description: 'Итоговый статус readiness.',
    enum: ['ok', 'degraded', 'fail'],
    example: 'ok',
  })
  status: 'ok' | 'degraded' | 'fail';

  @ApiProperty({
    description: 'ISO-таймстамп ответа.',
    example: '2026-02-01T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Список выполненных проверок.',
    type: HealthCheckDto,
    isArray: true,
  })
  checks: HealthCheckDto[];
}
