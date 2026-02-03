import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { AuthIdentityEntity } from '@/modules/auth/entities/auth-identity.entity';
import { AuthProvider } from '@/modules/auth/types/auth.types';

@Injectable()
export class AuthIdentitiesRepository {
  constructor(
    @InjectRepository(AuthIdentityEntity)
    private readonly authIdentityRepository: Repository<AuthIdentityEntity>,
  ) {}

  create(data: Partial<AuthIdentityEntity>): AuthIdentityEntity {
    return this.authIdentityRepository.create(data);
  }

  async save(identity: AuthIdentityEntity): Promise<AuthIdentityEntity> {
    return this.authIdentityRepository.save(identity);
  }

  async findById(id: number): Promise<AuthIdentityEntity | null> {
    return this.authIdentityRepository.findOne({ where: { id } });
  }

  async findActiveByProvider(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<AuthIdentityEntity | null> {
    return this.authIdentityRepository.findOne({
      where: {
        provider,
        provider_user_id: providerUserId,
        archived_at: IsNull(),
      },
    });
  }
}
