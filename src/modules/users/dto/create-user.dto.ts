import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateUserRequest {
  @ApiProperty({
    description: 'Отображаемое имя пользователя.',
    required: false,
    nullable: true,
    default: 'Sergey',
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
