import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ description: 'Идентификатор пользователя.', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Отображаемое имя пользователя.',
    nullable: true,
    example: 'Sergey',
  })
  display_name: string | null;

  @ApiProperty({
    description: 'Время принятия условий.',
    nullable: true,
    example: '2026-01-29T10:16:00.000Z',
  })
  terms_accepted_at: string | null;

  @ApiProperty({
    description: 'Время принятия политики приватности.',
    nullable: true,
    example: '2026-01-29T10:16:00.000Z',
  })
  privacy_accepted_at: string | null;

  @ApiProperty({
    description: 'Согласие на маркетинговые рассылки.',
    example: false,
  })
  marketing_opt_in: boolean;

  @ApiProperty({
    description: 'Дата создания пользователя.',
    example: '2026-01-29T10:15:30.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Дата обновления пользователя.',
    example: '2026-01-29T10:20:00.000Z',
  })
  updated_at: string;

  @ApiProperty({
    description: 'Дата архивации пользователя.',
    nullable: true,
    example: '2026-02-01T00:00:00.000Z',
  })
  archived_at: string | null;
}
