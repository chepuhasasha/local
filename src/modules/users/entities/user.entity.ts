import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class UserEntity {
  /**
   * Уникальный идентификатор пользователя.
   */
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  /**
   * Отображаемое имя пользователя.
   */
  @Column({ type: 'text', name: 'display_name', nullable: true })
  display_name: string | null;

  /**
   * Момент принятия условий.
   */
  @Column({ type: 'timestamptz', name: 'terms_accepted_at', nullable: true })
  terms_accepted_at: Date | null;

  /**
   * Момент принятия политики приватности.
   */
  @Column({
    type: 'timestamptz',
    name: 'privacy_accepted_at',
    nullable: true,
  })
  privacy_accepted_at: Date | null;

  /**
   * Маркетинговые согласия.
   */
  @Column({ type: 'boolean', name: 'marketing_opt_in', default: false })
  marketing_opt_in: boolean;

  /**
   * Дата создания пользователя.
   */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  /**
   * Дата последнего обновления пользователя.
   */
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;

  /**
   * Дата архивации пользователя.
   */
  @Column({ type: 'timestamptz', name: 'archived_at', nullable: true })
  archived_at: Date | null;
}
