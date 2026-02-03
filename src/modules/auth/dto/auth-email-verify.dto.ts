import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class AuthEmailVerifyRequest {
  @ApiProperty({ description: 'Email пользователя.', example: 'sergey@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Одноразовый код.', example: '123456' })
  @IsString()
  @Length(4, 10)
  code: string;
}

export class AuthEmailVerifyResponse {
  @ApiProperty({ description: 'ID пользователя.', example: 1 })
  user_id: number;

  @ApiProperty({ description: 'ID сессии.', example: 500 })
  session_id: number;

  @ApiProperty({
    description: 'Access-токен для авторизации запросов.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Refresh-токен для обновления сессии.',
    example: 'c0a4d7b8f2a4...'
  })
  refresh_token: string;
}
