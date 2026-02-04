import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class AuthRegisterRequest {
  @ApiProperty({
    description: 'Email пользователя.',
    example: 'sergey@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Отображаемое имя пользователя.',
    required: false,
    nullable: true,
    example: 'Sergey',
  })
  @IsOptional()
  @IsString()
  display_name?: string | null;

  @ApiProperty({
    description: 'Согласие на маркетинговые рассылки.',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  marketing_opt_in?: boolean;
}
