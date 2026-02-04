import { Column, CreateDateColumn, Entity } from 'typeorm';

import { bigintTransformer } from '@/infrastructure/database/transformers/bigint.transformer';

@Entity({ name: 'auth_session' })
export class AuthSessionEntity {
  @Column({
    type: 'bigint',
    primary: true,
    generated: 'increment',
    transformer: bigintTransformer,
  })
  id: number;

  @Column({ type: 'bigint', name: 'user_id', transformer: bigintTransformer })
  user_id: number;

  @Column({ type: 'text', name: 'refresh_hash' })
  refresh_hash: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @Column({ type: 'timestamptz', name: 'last_seen_at', nullable: true })
  last_seen_at: Date | null;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revoked_at: Date | null;
}
