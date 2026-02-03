import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthSessionEntity } from '@/modules/auth/entities/auth-session.entity';

@Injectable()
export class AuthSessionsRepository {
  constructor(
    @InjectRepository(AuthSessionEntity)
    private readonly authSessionRepository: Repository<AuthSessionEntity>,
  ) {}

  create(data: Partial<AuthSessionEntity>): AuthSessionEntity {
    return this.authSessionRepository.create(data);
  }

  async save(session: AuthSessionEntity): Promise<AuthSessionEntity> {
    return this.authSessionRepository.save(session);
  }

  async findById(id: number): Promise<AuthSessionEntity | null> {
    return this.authSessionRepository.findOne({ where: { id } });
  }
}
