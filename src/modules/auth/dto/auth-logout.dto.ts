import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AuthLogoutRequest {
  @ApiProperty({ description: 'ID сессии.', example: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  session_id: number;
}

export class AuthLogoutResponse {
  @ApiProperty({ description: 'ID сессии.', example: 500 })
  session_id: number;

  @ApiProperty({
    description: 'Время отзыва сессии.',
    example: '2026-02-01T00:00:00.000Z',
  })
  revoked_at: string;
}
