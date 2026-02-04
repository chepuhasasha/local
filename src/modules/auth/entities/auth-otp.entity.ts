import { Column, CreateDateColumn, Entity } from 'typeorm';

import { bigintTransformer } from '@/infrastructure/database/transformers/bigint.transformer';

@Entity({ name: 'auth_otp' })
export class AuthOtpEntity {
  @Column({
    type: 'bigint',
    primary: true,
    generated: 'increment',
    transformer: bigintTransformer,
  })
  id: number;

  @Column({
    type: 'bigint',
    name: 'identity_id',
    transformer: bigintTransformer,
  })
  identity_id: number;

  @Column({ type: 'text', name: 'code_hash' })
  code_hash: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expires_at: Date;

  @Column({ type: 'timestamptz', name: 'consumed_at', nullable: true })
  consumed_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;
}
