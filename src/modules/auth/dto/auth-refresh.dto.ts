import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class AuthRefreshRequest {
  @ApiProperty({ description: 'ID сессии.', example: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  session_id: number;

  @ApiProperty({
    description: 'Refresh-токен, выданный при логине/обновлении.',
    example: 'c0a4d7b8f2a4...',
  })
  @IsString()
  refresh_token: string;
}

export class AuthRefreshResponse {
  @ApiProperty({ description: 'ID сессии.', example: 500 })
  session_id: number;

  @ApiProperty({
    description: 'Новый access-токен.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Новый refresh-токен.',
    example: 'b7c1a9d3e2f4...',
  })
  refresh_token: string;
}
