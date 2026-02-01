import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  /**
   * Возвращает статус доступности сервиса.
   */
  @Get()
  @ApiOkResponse({
    schema: {
      example: { status: 'ok' },
    },
  })
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
