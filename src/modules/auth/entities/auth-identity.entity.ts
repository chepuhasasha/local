import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AuthProvider } from '@/modules/auth/types/auth.types';

@Entity({ name: 'auth_identity' })
export class AuthIdentityEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'user_id' })
  user_id: number;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    enumName: 'auth_provider',
  })
  provider: AuthProvider;

  @Column({ type: 'text', name: 'provider_user_id' })
  provider_user_id: string;

  @Column({ type: 'boolean', name: 'is_verified', default: false })
  is_verified: boolean;

  @Column({ type: 'timestamptz', name: 'verified_at', nullable: true })
  verified_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;

  @Column({ type: 'timestamptz', name: 'archived_at', nullable: true })
  archived_at: Date | null;
}
