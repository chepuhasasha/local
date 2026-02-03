import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class AuthEmailStartRequest {
  @ApiProperty({
    description: 'Email для входа.',
    example: 'sergey@example.com',
  })
  @IsEmail()
  email: string;
}

export class AuthEmailStartResponse {
  @ApiProperty({ description: 'Идентификатор identity.', example: 10 })
  identity_id: number;

  @ApiProperty({ description: 'Идентификатор OTP.', example: 100 })
  otp_id: number;

  @ApiProperty({
    description: 'Время истечения OTP.',
    example: '2026-01-29T10:20:30.000Z',
  })
  expires_at: string;

  @ApiProperty({
    description: 'Код OTP (возвращается только в non-production окружениях).',
    nullable: true,
    example: '123456',
  })
  code: string | null;
}
