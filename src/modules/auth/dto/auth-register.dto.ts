import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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

  @ApiProperty({
    description: 'Пароль пользователя.',
    required: false,
    minLength: 8,
    maxLength: 128,
    example: 'S3cretPass!',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}
